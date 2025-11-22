import request from "supertest";
import { app } from "../src/server";

async function registerLogin() {
  const email = `u+${Date.now()}@example.com`;
  const password = "Password123!";
  const reg = await request(app)
    .post("/auth/register")
    .send({ email, password, displayName: "User" });
  const code = reg.body.verificationCode;
  await request(app).post("/auth/verify").send({ email, code });
  const login = await request(app)
    .post("/auth/login")
    .send({ email, password });
  return { token: login.body.token };
}

describe("Boards, Lists, Cards", () => {
  it("creates board, list, and card", async () => {
    const { token } = await registerLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const b = await request(app)
      .post("/boards")
      .set(auth)
      .send({ title: "B1" })
      .expect(201);
    const boardId = b.body.board.id as string;

    const l = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "L1" })
      .expect(201);
    const listId = l.body.list.id as string;

    const c = await request(app)
      .post(`/boards/lists/${listId}/cards`)
      .set(auth)
      .send({ title: "C1", description: "d" })
      .expect(201);
    expect(c.body.card.title).toBe("C1");
  });

  it("moves card between lists with specific position", async () => {
    const { token } = await registerLogin();
    const auth = { Authorization: `Bearer ${token}` };

    // Create board with two lists
    const b = await request(app)
      .post("/boards")
      .set(auth)
      .send({ title: "Test Board" })
      .expect(201);
    const boardId = b.body.board.id as string;

    const l1 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 1" })
      .expect(201);
    const list1Id = l1.body.list.id as string;

    const l2 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 2" })
      .expect(201);
    const list2Id = l2.body.list.id as string;

    // Create cards in first list
    const c1 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 1" })
      .expect(201);
    const card1Id = c1.body.card.id as string;

    const c2 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 2" })
      .expect(201);
    const card2Id = c2.body.card.id as string;

    const c3 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 3" })
      .expect(201);
    const card3Id = c3.body.card.id as string;

    // Create cards in second list
    const c4 = await request(app)
      .post(`/boards/lists/${list2Id}/cards`)
      .set(auth)
      .send({ title: "Card 4" })
      .expect(201);
    const card4Id = c4.body.card.id as string;

    const c5 = await request(app)
      .post(`/boards/lists/${list2Id}/cards`)
      .set(auth)
      .send({ title: "Card 5" })
      .expect(201);
    const card5Id = c5.body.card.id as string;

    // Move card from list1 to position 2 in list2
    const moveResponse = await request(app)
      .post(`/boards/${boardId}/cards/${card2Id}/move-and-reorder`)
      .set(auth)
      .send({ toListId: list2Id, toPosition: 2 })
      .expect(200);

    expect(moveResponse.body.card.listId).toBe(list2Id);
    expect(moveResponse.body.card.position).toBe(2);

    // Verify positions in both lists
    const boardAfterMove = await request(app)
      .get(`/boards/${boardId}`)
      .set(auth)
      .expect(200);
    const list1 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list1Id,
    );
    const list2 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list2Id,
    );

    // List1 should have cards 1 and 3 in positions 1 and 2
    expect(list1.cards).toHaveLength(2);
    expect(list1.cards[0].id).toBe(card1Id);
    expect(list1.cards[0].position).toBe(1);
    expect(list1.cards[1].id).toBe(card3Id);
    expect(list1.cards[1].position).toBe(2);

    // List2 should have cards 4, moved card 2, and 5 in positions 1, 2, 3
    expect(list2.cards).toHaveLength(3);
    expect(list2.cards[0].id).toBe(card4Id);
    expect(list2.cards[0].position).toBe(1);
    expect(list2.cards[1].id).toBe(card2Id);
    expect(list2.cards[1].position).toBe(2);
    expect(list2.cards[2].id).toBe(card5Id);
    expect(list2.cards[2].position).toBe(3);
  });

  it("moves card to empty list", async () => {
    const { token } = await registerLogin();
    const auth = { Authorization: `Bearer ${token}` };

    // Create board with two lists
    const b = await request(app)
      .post("/boards")
      .set(auth)
      .send({ title: "Test Board" })
      .expect(201);
    const boardId = b.body.board.id as string;

    const l1 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 1" })
      .expect(201);
    const list1Id = l1.body.list.id as string;

    const l2 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 2" })
      .expect(201);
    const list2Id = l2.body.list.id as string;

    // Create card in first list
    const c1 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 1" })
      .expect(201);
    const card1Id = c1.body.card.id as string;

    // Move card to empty list (list2)
    const moveResponse = await request(app)
      .post(`/boards/${boardId}/cards/${card1Id}/move-and-reorder`)
      .set(auth)
      .send({ toListId: list2Id, toPosition: 1 })
      .expect(200);

    expect(moveResponse.body.card.listId).toBe(list2Id);
    expect(moveResponse.body.card.position).toBe(1);

    // Verify both lists
    const boardAfterMove = await request(app)
      .get(`/boards/${boardId}`)
      .set(auth)
      .expect(200);
    const list1 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list1Id,
    );
    const list2 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list2Id,
    );

    expect(list1.cards).toHaveLength(0);
    expect(list2.cards).toHaveLength(1);
    expect(list2.cards[0].id).toBe(card1Id);
    expect(list2.cards[0].position).toBe(1);
  });

  it("reorders card within same list", async () => {
    const { token } = await registerLogin();
    const auth = { Authorization: `Bearer ${token}` };

    // Create board with list
    const b = await request(app)
      .post("/boards")
      .set(auth)
      .send({ title: "Test Board" })
      .expect(201);
    const boardId = b.body.board.id as string;

    const l1 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 1" })
      .expect(201);
    const list1Id = l1.body.list.id as string;

    // Create cards
    const c1 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 1" })
      .expect(201);
    const card1Id = c1.body.card.id as string;

    const c2 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 2" })
      .expect(201);
    const card2Id = c2.body.card.id as string;

    const c3 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 3" })
      .expect(201);
    const card3Id = c3.body.card.id as string;

    // Move card from position 2 to position 1
    const moveResponse = await request(app)
      .post(`/boards/${boardId}/cards/${card2Id}/move-and-reorder`)
      .set(auth)
      .send({ toListId: list1Id, toPosition: 1 })
      .expect(200);

    expect(moveResponse.body.card.listId).toBe(list1Id);
    expect(moveResponse.body.card.position).toBe(1);

    // Verify positions
    const boardAfterMove = await request(app)
      .get(`/boards/${boardId}`)
      .set(auth)
      .expect(200);
    const list1 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list1Id,
    );

    expect(list1.cards).toHaveLength(3);
    expect(list1.cards[0].id).toBe(card2Id);
    expect(list1.cards[0].position).toBe(1);
    expect(list1.cards[1].id).toBe(card1Id);
    expect(list1.cards[1].position).toBe(2);
    expect(list1.cards[2].id).toBe(card3Id);
    expect(list1.cards[2].position).toBe(3);
  });

  it("moves card from list 3 to list 2 with constraint validation", async () => {
    const { token } = await registerLogin();
    const auth = { Authorization: `Bearer ${token}` };

    // Create board with three lists
    const b = await request(app)
      .post("/boards")
      .set(auth)
      .send({ title: "Test Board" })
      .expect(201);
    const boardId = b.body.board.id as string;

    const l1 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 1" })
      .expect(201);
    const list1Id = l1.body.list.id as string;

    const l2 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 2" })
      .expect(201);
    const list2Id = l2.body.list.id as string;

    const l3 = await request(app)
      .post(`/boards/${boardId}/lists`)
      .set(auth)
      .send({ title: "List 3" })
      .expect(201);
    const list3Id = l3.body.list.id as string;

    // Create multiple cards in each list to create potential constraint conflicts
    // List 1: Cards 1, 2, 3
    const c1 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 1-1" })
      .expect(201);
    const card1Id = c1.body.card.id as string;

    const c2 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 1-2" })
      .expect(201);
    const card2Id = c2.body.card.id as string;

    const c3 = await request(app)
      .post(`/boards/lists/${list1Id}/cards`)
      .set(auth)
      .send({ title: "Card 1-3" })
      .expect(201);
    const card3Id = c3.body.card.id as string;

    // List 2: Cards 4, 5, 6
    const c4 = await request(app)
      .post(`/boards/lists/${list2Id}/cards`)
      .set(auth)
      .send({ title: "Card 2-1" })
      .expect(201);
    const card4Id = c4.body.card.id as string;

    const c5 = await request(app)
      .post(`/boards/lists/${list2Id}/cards`)
      .set(auth)
      .send({ title: "Card 2-2" })
      .expect(201);
    const card5Id = c5.body.card.id as string;

    const c6 = await request(app)
      .post(`/boards/lists/${list2Id}/cards`)
      .set(auth)
      .send({ title: "Card 2-3" })
      .expect(201);
    const card6Id = c6.body.card.id as string;

    // List 3: Cards 7, 8, 9
    const c7 = await request(app)
      .post(`/boards/lists/${list3Id}/cards`)
      .set(auth)
      .send({ title: "Card 3-1" })
      .expect(201);
    const card7Id = c7.body.card.id as string;

    const c8 = await request(app)
      .post(`/boards/lists/${list3Id}/cards`)
      .set(auth)
      .send({ title: "Card 3-2" })
      .expect(201);
    const card8Id = c8.body.card.id as string;

    const c9 = await request(app)
      .post(`/boards/lists/${list3Id}/cards`)
      .set(auth)
      .send({ title: "Card 3-3" })
      .expect(201);
    const card9Id = c9.body.card.id as string;

    // Move card from list 3 (position 2) to list 2 (position 2)
    // This should trigger the constraint violation we're seeing
    const moveResponse = await request(app)
      .post(`/boards/${boardId}/cards/${card8Id}/move-and-reorder`)
      .set(auth)
      .send({ toListId: list2Id, toPosition: 2 });

    expect(moveResponse.status).toBe(200);

    expect(moveResponse.body.card.listId).toBe(list2Id);
    expect(moveResponse.body.card.position).toBe(2);

    // Verify all positions are correct and no constraints are violated
    const boardAfterMove = await request(app)
      .get(`/boards/${boardId}`)
      .set(auth)
      .expect(200);

    const list1 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list1Id,
    );
    const list2 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list2Id,
    );
    const list3 = boardAfterMove.body.board.lists.find(
      (l: any) => l.id === list3Id,
    );

    // List 1 should be unchanged
    expect(list1.cards).toHaveLength(3);
    expect(list1.cards[0].id).toBe(card1Id);
    expect(list1.cards[0].position).toBe(1);
    expect(list1.cards[1].id).toBe(card2Id);
    expect(list1.cards[1].position).toBe(2);
    expect(list1.cards[2].id).toBe(card3Id);
    expect(list1.cards[2].position).toBe(3);

    // List 2 should have the moved card at position 2
    expect(list2.cards).toHaveLength(4);
    expect(list2.cards[0].id).toBe(card4Id);
    expect(list2.cards[0].position).toBe(1);
    expect(list2.cards[1].id).toBe(card8Id); // Moved card
    expect(list2.cards[1].position).toBe(2);
    expect(list2.cards[2].id).toBe(card5Id);
    expect(list2.cards[2].position).toBe(3);
    expect(list2.cards[3].id).toBe(card6Id);
    expect(list2.cards[3].position).toBe(4);

    // List 3 should have gap closed
    expect(list3.cards).toHaveLength(2);
    expect(list3.cards[0].id).toBe(card7Id);
    expect(list3.cards[0].position).toBe(1);
    expect(list3.cards[1].id).toBe(card9Id);
    expect(list3.cards[1].position).toBe(2);
  });
});

it("reorders card within same list using /reorder endpoint", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Create multiple cards
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  const c2 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 2" })
    .expect(201);
  const card2Id = c2.body.card.id as string;

  const c3 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 3" })
    .expect(201);
  const card3Id = c3.body.card.id as string;

  // Reorder card from position 2 to position 1 using /reorder endpoint
  const reorderResponse = await request(app)
    .patch(`/boards/lists/${list1Id}/cards/reorder`)
    .set(auth)
    .send({ cardId: card2Id, toPosition: 1 })
    .expect(200);

  expect(reorderResponse.body.card.position).toBe(1);

  // Verify positions
  const boardAfterReorder = await request(app)
    .get(`/boards/${boardId}`)
    .set(auth)
    .expect(200);
  const list1 = boardAfterReorder.body.board.lists.find(
    (l: any) => l.id === list1Id,
  );

  expect(list1.cards).toHaveLength(3);
  expect(list1.cards[0].id).toBe(card2Id);
  expect(list1.cards[0].position).toBe(1);
  expect(list1.cards[1].id).toBe(card1Id);
  expect(list1.cards[1].position).toBe(2);
  expect(list1.cards[2].id).toBe(card3Id);
  expect(list1.cards[2].position).toBe(3);
});

it("reorders card to last position using /reorder endpoint", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Create multiple cards
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  const c2 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 2" })
    .expect(201);
  const card2Id = c2.body.card.id as string;

  const c3 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 3" })
    .expect(201);
  const card3Id = c3.body.card.id as string;

  // Reorder card from position 1 to position 3 using /reorder endpoint
  const reorderResponse = await request(app)
    .patch(`/boards/lists/${list1Id}/cards/reorder`)
    .set(auth)
    .send({ cardId: card1Id, toPosition: 3 })
    .expect(200);

  expect(reorderResponse.body.card.position).toBe(3);

  // Verify positions
  const boardAfterReorder = await request(app)
    .get(`/boards/${boardId}`)
    .set(auth)
    .expect(200);
  const list1 = boardAfterReorder.body.board.lists.find(
    (l: any) => l.id === list1Id,
  );

  expect(list1.cards).toHaveLength(3);
  expect(list1.cards[0].id).toBe(card2Id);
  expect(list1.cards[0].position).toBe(1);
  expect(list1.cards[1].id).toBe(card3Id);
  expect(list1.cards[1].position).toBe(2);
  expect(list1.cards[2].id).toBe(card1Id);
  expect(list1.cards[2].position).toBe(3);
});

it("moves card to middle of target list with move-and-reorder", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with two lists
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  const l2 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 2" })
    .expect(201);
  const list2Id = l2.body.list.id as string;

  // Create cards in first list
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  // Create multiple cards in second list
  const c2 = await request(app)
    .post(`/boards/lists/${list2Id}/cards`)
    .set(auth)
    .send({ title: "Card 2" })
    .expect(201);
  const card2Id = c2.body.card.id as string;

  const c3 = await request(app)
    .post(`/boards/lists/${list2Id}/cards`)
    .set(auth)
    .send({ title: "Card 3" })
    .expect(201);
  const card3Id = c3.body.card.id as string;

  const c4 = await request(app)
    .post(`/boards/lists/${list2Id}/cards`)
    .set(auth)
    .send({ title: "Card 4" })
    .expect(201);
  const card4Id = c4.body.card.id as string;

  // Move card from list1 to position 2 in list2 (middle position)
  const moveResponse = await request(app)
    .post(`/boards/${boardId}/cards/${card1Id}/move-and-reorder`)
    .set(auth)
    .send({ toListId: list2Id, toPosition: 2 })
    .expect(200);

  expect(moveResponse.body.card.listId).toBe(list2Id);
  expect(moveResponse.body.card.position).toBe(2);

  // Verify positions in both lists
  const boardAfterMove = await request(app)
    .get(`/boards/${boardId}`)
    .set(auth)
    .expect(200);
  const list1 = boardAfterMove.body.board.lists.find(
    (l: any) => l.id === list1Id,
  );
  const list2 = boardAfterMove.body.board.lists.find(
    (l: any) => l.id === list2Id,
  );

  // List1 should be empty
  expect(list1.cards).toHaveLength(0);

  // List2 should have cards in order: 2, moved card 1, 3, 4
  expect(list2.cards).toHaveLength(4);
  expect(list2.cards[0].id).toBe(card2Id);
  expect(list2.cards[0].position).toBe(1);
  expect(list2.cards[1].id).toBe(card1Id);
  expect(list2.cards[1].position).toBe(2);
  expect(list2.cards[2].id).toBe(card3Id);
  expect(list2.cards[2].position).toBe(3);
  expect(list2.cards[3].id).toBe(card4Id);
  expect(list2.cards[3].position).toBe(4);
});

it("handles same position reorder gracefully", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Create card
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  // Try to reorder to same position using /reorder endpoint
  const reorderResponse = await request(app)
    .patch(`/boards/lists/${list1Id}/cards/reorder`)
    .set(auth)
    .send({ cardId: card1Id, toPosition: 1 })
    .expect(200);

  expect(reorderResponse.body.card.position).toBe(1);

  // Verify card is still in the same position
  const boardAfterReorder = await request(app)
    .get(`/boards/${boardId}`)
    .set(auth)
    .expect(200);
  const list1 = boardAfterReorder.body.board.lists.find(
    (l: any) => l.id === list1Id,
  );

  expect(list1.cards).toHaveLength(1);
  expect(list1.cards[0].id).toBe(card1Id);
  expect(list1.cards[0].position).toBe(1);
});

it("handles same position move gracefully with move-and-reorder", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Create card
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  // Try to move to same list and same position using move-and-reorder
  const moveResponse = await request(app)
    .post(`/boards/${boardId}/cards/${card1Id}/move-and-reorder`)
    .set(auth)
    .send({ toListId: list1Id, toPosition: 1 })
    .expect(200);

  expect(moveResponse.body.card.listId).toBe(list1Id);
  expect(moveResponse.body.card.position).toBe(1);

  // Verify card is still in the same position
  const boardAfterMove = await request(app)
    .get(`/boards/${boardId}`)
    .set(auth)
    .expect(200);
  const list1 = boardAfterMove.body.board.lists.find(
    (l: any) => l.id === list1Id,
  );

  expect(list1.cards).toHaveLength(1);
  expect(list1.cards[0].id).toBe(card1Id);
  expect(list1.cards[0].position).toBe(1);
});

it("rejects invalid card ID in reorder", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Try to reorder non-existent card
  await request(app)
    .patch(`/boards/lists/${list1Id}/cards/reorder`)
    .set(auth)
    .send({ cardId: "invalid-card-id", toPosition: 1 })
    .expect(404);
});

it("rejects invalid list ID in move-and-reorder", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Create card
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  // Try to move to non-existent list
  await request(app)
    .post(`/boards/${boardId}/cards/${card1Id}/move-and-reorder`)
    .set(auth)
    .send({ toListId: "invalid-list-id", toPosition: 1 })
    .expect(400);
});

it("rejects invalid position in reorder", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with list
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  // Create card
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  // Try to reorder to invalid position (0)
  await request(app)
    .patch(`/boards/lists/${list1Id}/cards/reorder`)
    .set(auth)
    .send({ cardId: card1Id, toPosition: 0 })
    .expect(400);
});

it("rejects invalid position in move-and-reorder", async () => {
  const { token } = await registerLogin();
  const auth = { Authorization: `Bearer ${token}` };

  // Create board with two lists
  const b = await request(app)
    .post("/boards")
    .set(auth)
    .send({ title: "Test Board" })
    .expect(201);
  const boardId = b.body.board.id as string;

  const l1 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 1" })
    .expect(201);
  const list1Id = l1.body.list.id as string;

  const l2 = await request(app)
    .post(`/boards/${boardId}/lists`)
    .set(auth)
    .send({ title: "List 2" })
    .expect(201);
  const list2Id = l2.body.list.id as string;

  // Create card
  const c1 = await request(app)
    .post(`/boards/lists/${list1Id}/cards`)
    .set(auth)
    .send({ title: "Card 1" })
    .expect(201);
  const card1Id = c1.body.card.id as string;

  // Try to move to invalid position (0)
  await request(app)
    .post(`/boards/${boardId}/cards/${card1Id}/move-and-reorder`)
    .set(auth)
    .send({ toListId: list2Id, toPosition: 0 })
    .expect(400);
});
