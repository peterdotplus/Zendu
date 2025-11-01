import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthedRequest } from "../middleware/auth";

const prisma = new PrismaClient();
export const boardsRouter = Router();

// Create board (private or team)
const createBoardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string().optional(),
});

boardsRouter.post("/", async (req: AuthedRequest, res) => {
  const parse = createBoardSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const { title, description, teamId } = parse.data;
  const creatorId = req.user!.id;
  try {
    const board = await prisma.board.create({
      data: { title, description, teamId: teamId ?? null, creatorId },
    });
    return res.status(201).json({ board });
  } catch (e) {
    return res.status(400).json({ error: "Could not create board" });
  }
});

// List boards current user has access to (created by user or by teams user is in)
boardsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const teamMemberships = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = teamMemberships.map((m) => m.teamId);
  const boards = await prisma.board.findMany({
    where: { OR: [{ creatorId: userId }, { teamId: { in: teamIds } }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      teamId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ boards });
});

// Get single board with lists, cards, and categories
boardsRouter.get("/:boardId", async (req: AuthedRequest, res) => {
  const { boardId } = req.params;
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: "asc" },
        include: { cards: { orderBy: { position: "asc" } } },
      },
      categories: true,
    },
  });
  if (!board) return res.status(404).json({ error: "Board not found" });
  res.json({ board });
});

// Update board
const updateBoardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  teamId: z.string().nullable().optional(),
});

boardsRouter.patch("/:boardId", async (req: AuthedRequest, res) => {
  const { boardId } = req.params;
  const parse = updateBoardSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const { title, description, teamId } = parse.data;
  try {
    const board = await prisma.board.update({
      where: { id: boardId },
      data: {
        title,
        description,
        teamId: typeof teamId === "undefined" ? undefined : teamId,
      },
    });
    res.json({ board });
  } catch (_e) {
    res.status(404).json({ error: "Board not found" });
  }
});

// Delete board (cascades via foreign keys assumed)
boardsRouter.delete("/:boardId", async (req: AuthedRequest, res) => {
  const { boardId } = req.params;
  try {
    await prisma.board.delete({ where: { id: boardId } });
    res.json({ ok: true });
  } catch (_e) {
    res.status(404).json({ error: "Board not found" });
  }
});

// Create list in board
const createListSchema = z.object({ title: z.string().min(1) });

boardsRouter.post("/:boardId/lists", async (req: AuthedRequest, res) => {
  const { boardId } = req.params;
  const parse = createListSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const { title } = parse.data;

  // Compute next position
  const max = await prisma.list.aggregate({
    _max: { position: true },
    where: { boardId },
  });
  const nextPos = (max._max.position ?? 0) + 1;

  try {
    const list = await prisma.list.create({
      data: { boardId, title, position: nextPos },
    });
    return res.status(201).json({ list });
  } catch (e) {
    return res.status(400).json({ error: "Could not create list" });
  }
});

// Reorder lists within a board
const reorderListSchema = z.object({
  listId: z.string(),
  toPosition: z.number().int().min(1),
});

boardsRouter.patch(
  "/:boardId/lists/reorder",
  async (req: AuthedRequest, res) => {
    try {
      const { boardId } = req.params;
      const parse = reorderListSchema.safeParse(req.body);
      if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
      const { listId, toPosition } = parse.data;

      const list = await prisma.list.findUnique({ where: { id: listId } });
      if (!list || list.boardId !== boardId)
        return res.status(404).json({ error: "List not found" });
      const current = list.position;
      if (toPosition === current) return res.json({ list });

      await prisma.$transaction(async (tx) => {
        if (toPosition < current) {
          await tx.list.updateMany({
            where: { boardId, position: { gte: toPosition, lt: current } },
            data: { position: { increment: 1 } },
          });
        } else {
          await tx.list.updateMany({
            where: { boardId, position: { gt: current, lte: toPosition } },
            data: { position: { decrement: 1 } },
          });
        }
        await tx.list.update({
          where: { id: listId },
          data: { position: toPosition },
        });
      });

      const updated = await prisma.list.findUnique({ where: { id: listId } });
      res.json({ list: updated });
    } catch (error) {
      console.error("Error reordering list:", error);
      res.status(500).json({ error: "Failed to reorder list" });
    }
  },
);

// Update list
const updateListSchema = z.object({
  title: z.string().min(1).optional(),
  position: z.number().int().min(1).optional(),
});

boardsRouter.patch("/lists/:listId", async (req: AuthedRequest, res) => {
  const { listId } = req.params;
  const parse = updateListSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const { title, position } = parse.data;
  try {
    const list = await prisma.list.update({
      where: { id: listId },
      data: { title, position },
    });
    res.json({ list });
  } catch (_e) {
    res.status(404).json({ error: "List not found" });
  }
});

// Delete list
boardsRouter.delete("/lists/:listId", async (req: AuthedRequest, res) => {
  const { listId } = req.params;
  try {
    await prisma.list.delete({ where: { id: listId } });
    res.json({ ok: true });
  } catch (_e) {
    res.status(404).json({ error: "List not found" });
  }
});

// Create card in list
const createCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  headerColor: z.string().optional(),
  categoryId: z.string().optional(),
});

boardsRouter.post("/lists/:listId/cards", async (req: AuthedRequest, res) => {
  const { listId } = req.params;
  const parse = createCardSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const { title, description, headerColor, categoryId } = parse.data;

  // Compute next position
  const max = await prisma.card.aggregate({
    _max: { position: true },
    where: { listId },
  });
  const nextPos = (max._max.position ?? 0) + 1;

  try {
    const card = await prisma.card.create({
      data: {
        listId,
        title,
        description: description ?? "",
        headerColor: headerColor ?? null,
        categoryId: categoryId ?? null,
        position: nextPos,
      },
    });
    return res.status(201).json({ card });
  } catch (e) {
    return res.status(400).json({ error: "Could not create card" });
  }
});

// Reorder cards within a list
const reorderCardSchema = z.object({
  cardId: z.string(),
  toPosition: z.number().int().min(1),
});

boardsRouter.patch(
  "/lists/:listId/cards/reorder",
  async (req: AuthedRequest, res) => {
    try {
      const { listId } = req.params;
      const parse = reorderCardSchema.safeParse(req.body);
      if (!parse.success)
        return res.status(400).json({ error: parse.error.flatten() });
      const { cardId, toPosition } = parse.data;

      const card = await prisma.card.findUnique({ where: { id: cardId } });
      if (!card || card.listId !== listId)
        return res.status(404).json({ error: "Card not found" });
      const current = card.position;
      if (toPosition === current) return res.json({ card });

      await prisma.$transaction(async (tx) => {
        // First, move the card to a temporary position outside the range
        const tempPosition = -1;
        await tx.card.update({
          where: { id: cardId },
          data: { position: tempPosition },
        });

        if (toPosition < current) {
          // Moving upward: shift cards down to make space
          await tx.card.updateMany({
            where: {
              listId,
              position: {
                gte: toPosition,
                lt: current,
              },
            },
            data: { position: { increment: 1 } },
          });
        } else {
          // Moving downward: shift cards up to make space
          await tx.card.updateMany({
            where: {
              listId,
              position: {
                gt: current,
                lte: toPosition,
              },
            },
            data: { position: { decrement: 1 } },
          });
        }

        // Finally, move the card to its final position
        await tx.card.update({
          where: { id: cardId },
          data: { position: toPosition },
        });
      });

      const updated = await prisma.card.findUnique({ where: { id: cardId } });
      res.json({ card: updated });
    } catch (error) {
      console.error("Error reordering card:", error);
      res.status(500).json({ error: "Failed to reorder card" });
    }
  },
);

// Move card to another list at given position (or append if none)
const moveCardSchema = z.object({
  toListId: z.string(),
  toPosition: z.number().int().min(1).optional(),
});

boardsRouter.patch("/cards/:cardId/move", async (req: AuthedRequest, res) => {
  const { cardId } = req.params;
  const parse = moveCardSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const { toListId, toPosition } = parse.data;

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return res.status(404).json({ error: "Card not found" });
  const fromListId = card.listId;

  await prisma.$transaction(async (tx) => {
    // Close gap in source list
    await tx.card.updateMany({
      where: { listId: fromListId, position: { gt: card.position } },
      data: { position: { decrement: 1 } },
    });

    // Determine destination position
    let destPos = toPosition;
    if (!destPos) {
      const max = await tx.card.aggregate({
        _max: { position: true },
        where: { listId: toListId },
      });
      destPos = (max._max.position ?? 0) + 1;
    } else {
      await tx.card.updateMany({
        where: { listId: toListId, position: { gte: destPos } },
        data: { position: { increment: 1 } },
      });
    }

    // Move the card
    await tx.card.update({
      where: { id: cardId },
      data: { listId: toListId, position: destPos },
    });
  });

  const updated = await prisma.card.findUnique({ where: { id: cardId } });
  res.json({ card: updated });
});

// Get single card
boardsRouter.get("/:boardId/cards/:cardId", async (req: AuthedRequest, res) => {
  const { boardId, cardId } = req.params;
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!card) return res.status(404).json({ error: "Card not found" });
    if (card.list.boardId !== boardId)
      return res.status(404).json({ error: "Card not found in this board" });

    res.json({ card });
  } catch (_e) {
    res.status(404).json({ error: "Card not found" });
  }
});

// Update card
const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  headerColor: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  position: z.number().int().min(1).optional(),
  listId: z.string().optional(), // move to another list
});

boardsRouter.patch(
  "/lists/:listId/cards/:cardId",
  async (req: AuthedRequest, res) => {
    const { listId, cardId } = req.params;
    const parse = updateCardSchema.safeParse(req.body);
    if (!parse.success)
      return res.status(400).json({ error: parse.error.flatten() });
    const data = parse.data as any;
    // Normalize optional nullables
    if (
      Object.prototype.hasOwnProperty.call(data, "headerColor") &&
      data.headerColor === ""
    )
      data.headerColor = null;
    if (
      Object.prototype.hasOwnProperty.call(data, "categoryId") &&
      data.categoryId === ""
    )
      data.categoryId = null;
    try {
      const card = await prisma.card.update({ where: { id: cardId }, data });
      res.json({ card });
    } catch (_e) {
      res.status(404).json({ error: "Card not found" });
    }
  },
);

// Update card directly (for card detail page)
boardsRouter.put("/:boardId/cards/:cardId", async (req: AuthedRequest, res) => {
  const { boardId, cardId } = req.params;
  const parse = updateCardSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data as any;

  // Normalize optional nullables
  if (
    Object.prototype.hasOwnProperty.call(data, "headerColor") &&
    data.headerColor === ""
  )
    data.headerColor = null;
  if (
    Object.prototype.hasOwnProperty.call(data, "categoryId") &&
    data.categoryId === ""
  )
    data.categoryId = null;

  try {
    // Verify card belongs to board
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: { boardId: true },
        },
      },
    });

    if (!card || card.list.boardId !== boardId) {
      return res.status(404).json({ error: "Card not found" });
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data,
    });
    res.json({ card: updatedCard });
  } catch (_e) {
    res.status(404).json({ error: "Card not found" });
  }
});

// Delete card directly (for card detail page)
boardsRouter.delete(
  "/:boardId/cards/:cardId",
  async (req: AuthedRequest, res) => {
    const { boardId, cardId } = req.params;
    try {
      // Verify card belongs to board
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          list: {
            select: { boardId: true },
          },
        },
      });

      if (!card || card.list.boardId !== boardId) {
        return res.status(404).json({ error: "Card not found" });
      }

      await prisma.card.delete({ where: { id: cardId } });
      res.json({ ok: true });
    } catch (_e) {
      res.status(404).json({ error: "Card not found" });
    }
  },
);

// Move card to another list (for card detail page)
boardsRouter.post(
  "/:boardId/cards/:cardId/move",
  async (req: AuthedRequest, res) => {
    const { boardId, cardId } = req.params;
    const parse = moveCardSchema.safeParse(req.body);
    if (!parse.success)
      return res.status(400).json({ error: parse.error.flatten() });
    const { toListId } = parse.data;

    try {
      // Verify card belongs to board
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          list: {
            select: { boardId: true },
          },
        },
      });

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      if (card.list.boardId !== boardId) {
        return res.status(404).json({ error: "Card not found in this board" });
      }

      // Verify target list belongs to board
      const targetList = await prisma.list.findUnique({
        where: { id: toListId },
        select: { boardId: true },
      });

      if (!targetList) {
        return res.status(400).json({ error: "Target list not found" });
      }

      if (targetList.boardId !== boardId) {
        return res
          .status(400)
          .json({ error: "Target list not found in this board" });
      }

      const fromListId = card.listId;

      // If moving to the same list, do nothing
      if (fromListId === toListId) {
        const updated = await prisma.card.findUnique({ where: { id: cardId } });
        return res.json({ card: updated });
      }

      try {
        await prisma.$transaction(async (tx) => {
          // First, move the card to position 0 temporarily to avoid conflicts
          await tx.card.update({
            where: { id: cardId },
            data: { listId: toListId, position: 0 },
          });

          // Close gap in source list
          await tx.card.updateMany({
            where: { listId: fromListId, position: { gt: card.position } },
            data: { position: { decrement: 1 } },
          });

          // Determine destination position (append to end)
          const max = await tx.card.aggregate({
            _max: { position: true },
            where: { listId: toListId },
          });
          const destPos = (max._max.position ?? 0) + 1;

          // Move the card to final position
          await tx.card.update({
            where: { id: cardId },
            data: { position: destPos },
          });
        });

        const updated = await prisma.card.findUnique({ where: { id: cardId } });
        res.json({ card: updated });
      } catch (transactionError) {
        if (transactionError instanceof Error) {
          res.status(400).json({
            error: `Database transaction failed: ${transactionError.message}`,
          });
        } else {
          res.status(400).json({ error: "Database transaction failed" });
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        res.status(400).json({ error: `Failed to move card: ${e.message}` });
      } else {
        res.status(400).json({ error: "Failed to move card" });
      }
    }
  },
);

// Delete card
boardsRouter.delete(
  "/lists/:listId/cards/:cardId",
  async (req: AuthedRequest, res) => {
    const { cardId } = req.params;
    try {
      await prisma.card.delete({ where: { id: cardId } });
      res.json({ ok: true });
    } catch (_e) {
      res.status(404).json({ error: "Card not found" });
    }
  },
);

// Categories
const createCategorySchema = z.object({
  name: z.string().min(1),
  colorHex: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
});

boardsRouter.get("/:boardId/categories", async (req: AuthedRequest, res) => {
  const { boardId } = req.params;
  const categories = await prisma.category.findMany({
    where: { boardId },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
});

boardsRouter.post("/:boardId/categories", async (req: AuthedRequest, res) => {
  const { boardId } = req.params;
  const parse = createCategorySchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });
  let { name, colorHex } = parse.data;
  if (!colorHex.startsWith("#")) colorHex = `#${colorHex}`;
  try {
    const category = await prisma.category.create({
      data: { boardId, name, colorHex },
    });
    res.status(201).json({ category });
  } catch (_e) {
    res
      .status(400)
      .json({ error: "Could not create category (maybe duplicate name)" });
  }
});

// Card comments
const commentSchema = z.object({ content: z.string().min(1) });

boardsRouter.get(
  "/lists/:listId/cards/:cardId/comments",
  async (req: AuthedRequest, res) => {
    const { cardId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ comments });
  },
);

boardsRouter.post(
  "/lists/:listId/cards/:cardId/comments",
  async (req: AuthedRequest, res) => {
    const { cardId } = req.params;
    const parse = commentSchema.safeParse(req.body);
    if (!parse.success)
      return res.status(400).json({ error: parse.error.flatten() });
    const { content } = parse.data;
    const authorId = req.user!.id;
    const c = await prisma.comment.create({
      data: { cardId, authorId, content },
    });
    res.status(201).json({ comment: c });
  },
);

// Card assignees
const assigneeSchema = z.object({ userId: z.string().min(1) });

boardsRouter.post(
  "/lists/:listId/cards/:cardId/assignees",
  async (req: AuthedRequest, res) => {
    const { cardId } = req.params;
    const parse = assigneeSchema.safeParse(req.body);
    if (!parse.success)
      return res.status(400).json({ error: parse.error.flatten() });
    const { userId } = parse.data;
    try {
      const assignment = await prisma.cardAssignment.create({
        data: { cardId, userId },
      });
      res.status(201).json({ assignment });
    } catch (_e) {
      res
        .status(400)
        .json({ error: "Could not assign user (maybe already assigned)" });
    }
  },
);

boardsRouter.delete(
  "/lists/:listId/cards/:cardId/assignees/:userId",
  async (req: AuthedRequest, res) => {
    const { cardId, userId } = req.params as { cardId: string; userId: string };
    const found = await prisma.cardAssignment.findFirst({
      where: { cardId, userId },
    });
    if (!found) return res.status(404).json({ error: "Assignment not found" });
    await prisma.cardAssignment.delete({ where: { id: found.id } });
    res.json({ ok: true });
  },
);
