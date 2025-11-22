"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";

import AlertBar from "@/components/AlertBar";

interface List {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

interface Category {
  id: string;
  name: string;
  colorHex: string;
}

interface Card {
  id: string;
  title: string;
  description: string;
  position: number;
  headerColor?: string | null;
  categoryId?: string | null;
}

interface Board {
  id: string;
  title: string;
  description?: string | null;
  lists: List[];
  categories: Category[];
}

// Inline Card component
const CardItem = ({ card, boardId }: { card: Card; boardId: string }) => (
  <div
    className="bg-white border-[3px] border-black shadow-[3px_3px_0_black] rounded p-3 cursor-pointer hover:shadow-[4px_4px_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
    onClick={() =>
      (window.location.href = `/boards/${boardId}/cards/${card.id}`)
    }
  >
    <div className="font-medium text-sm" title={card.title}>
      {card.title}
    </div>
  </div>
);

// Drop zone component
const DropZone = ({
  listId,
  position,
  isActive,
  onDragOver,
  onDrop,
  draggedCard,
  draggedCardCategoryId,
  getCategoryForListAndPosition,
  categorySection,
  isEmptyList = false,
  availableSpace = 1,
}: {
  listId: string;
  position: number;
  isActive: boolean;
  onDragOver: (e: React.DragEvent, listId: string, position: number) => void;
  onDrop: (
    e: React.DragEvent,
    listId: string,
    position: number,
    categorySection?: string,
  ) => void;
  draggedCard: Card | null;
  draggedCardCategoryId: string | null;
  getCategoryForListAndPosition: (
    listId: string,
    position: number,
    categorySection?: string,
  ) => string;
  categorySection?: string;
  isEmptyList?: boolean;
  availableSpace?: number;
}) => (
  <div
    className={`transition-all ${
      isActive
        ? availableSpace === 1
          ? "h-[70px] bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center"
          : availableSpace === 2
            ? "h-[140px] bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center"
            : availableSpace === 3
              ? "h-[210px] bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center"
              : availableSpace === 4
                ? "h-[280px] bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center"
                : "h-[350px] bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center"
        : isEmptyList
          ? "h-full min-h-[200px] bg-gray-200 opacity-0 hover:opacity-100 hover:bg-gray-400 flex items-center justify-center"
          : availableSpace === 1
            ? "h-2 bg-gray-200 opacity-0 hover:opacity-100 hover:bg-gray-400"
            : availableSpace === 2
              ? "h-[70px] bg-gray-200 opacity-0 hover:opacity-100 hover:bg-gray-400"
              : availableSpace === 3
                ? "h-[140px] bg-gray-200 opacity-0 hover:opacity-100 hover:bg-gray-400"
                : availableSpace === 4
                  ? "h-[210px] bg-gray-200 opacity-0 hover:opacity-100 hover:bg-gray-400"
                  : "h-[280px] bg-gray-200 opacity-0 hover:opacity-100 hover:bg-gray-400"
    } ${
      draggedCard &&
      getCategoryForListAndPosition(listId, position, categorySection) !==
        draggedCardCategoryId
        ? "cursor-not-allowed opacity-30"
        : ""
    }`}
    onDragOver={(e) => onDragOver(e, listId, position)}
    onDrop={(e) => onDrop(e, listId, position, categorySection)}
    onDragEnter={(e) => e.preventDefault()}
    onDragLeave={(e) => e.preventDefault()}
  >
    {isActive && (
      <div
        className={`text-sm font-medium ${
          getCategoryForListAndPosition(listId, position, categorySection) !==
          draggedCardCategoryId
            ? "text-red-600"
            : "text-blue-600"
        }`}
      >
        {getCategoryForListAndPosition(listId, position, categorySection) !==
        draggedCardCategoryId
          ? "Cannot drop in different category"
          : "Drop here to insert"}
      </div>
    )}

    {isEmptyList && !isActive && (
      <div className="text-sm text-gray-500 opacity-0 hover:opacity-100 transition-opacity">
        Drop cards here
      </div>
    )}
  </div>
);

// Category title styles
const categoryTitleClasses = "flex items-center gap-2 px-3 py-2 w-full";

// Category section wrapper styles
const categorySectionClasses = "flex flex-col gap-2 min-w-max";

// List column wrapper styles
const listColumnClasses = "flex-shrink-0 w-80 space-y-2";

// Cards row wrapper styles
const cardsRowClasses = "flex gap-4 min-w-max";

// Button base styles
const buttonBaseClasses =
  "rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer";

// Input base styles
const inputBaseClasses =
  "bg-white rounded px-3 py-2 text-sm border-[3px] border-black shadow-[3px_3px_0_black]";

// Add button styles (for buttons that open forms)
const addButtonClasses =
  "text-left text-gray-500 hover:text-gray-900 text-sm cursor-pointer";

// Category indicator styles
const categoryIndicatorClasses = "w-16 h-6 rounded-full border-2 border-black";
const categoryNameButtonClasses =
  "flex items-center gap-2 cursor-pointer sticky left-3";
const categoryNameClasses = "text-lg font-medium text-gray-700";

// Category selection label styles
const categorySelectionLabelClasses =
  "px-2 py-1 text-xs rounded border border-black flex items-center gap-1";

// Radio button indicator styles
const radioIndicatorClasses = "w-4 h-4 rounded-full border-2 border-black";

export default function BoardViewPage() {
  const params = useParams();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [newListTitle, setNewListTitle] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("none");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("");
  const [activeListForm, setActiveListForm] = useState<boolean>(false);
  const [activeCategoryForm, setActiveCategoryForm] = useState<boolean>(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Drag & drop state
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [draggedCardListId, setDraggedCardListId] = useState<string | null>(
    null,
  );
  const [draggedCardCategoryId, setDraggedCardCategoryId] = useState<
    string | null
  >(null);
  const [maxListSizePerCategory, setMaxListSizePerCategory] = useState<
    Map<string, number>
  >(new Map());
  const [activeDropZone, setActiveDropZone] = useState<{
    listId: string;
    position: number;
  } | null>(null);

  // Get card count for a category
  const getCardCount = (categoryId: string | null) => {
    if (!board) return 0;
    return board.lists.reduce((total, list) => {
      if (categoryId === null) {
        return total + list.cards.filter((card) => !card.categoryId).length;
      } else {
        return (
          total +
          list.cards.filter((card) => card.categoryId === categoryId).length
        );
      }
    }, 0);
  };

  // Format card count with proper pluralization
  const formatCardCount = (count: number) => {
    return `${count} card${count !== 1 ? "s" : ""}`;
  };

  // Toggle category collapse
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const loadBoard = useCallback(async () => {
    try {
      const data = await apiFetch<{ board: Board }>(`/boards/${boardId}`);
      setBoard(data.board);
    } catch (e: unknown) {
      const error = e as { body?: { error?: string } };
      setError(error?.body?.error || "Failed to load board");
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/boards/${boardId}/lists`, {
        method: "POST",
        body: JSON.stringify({ title: newListTitle }),
      });
      setNewListTitle("");
      setActiveListForm(false);
      await loadBoard();
    } catch (e: unknown) {
      const error = e as {
        body?: { error?: { fieldErrors?: { title?: string[] } } };
      };
      setError(
        error?.body?.error?.fieldErrors?.title?.[0] || "Failed to create list",
      );
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/boards/${boardId}/categories`, {
        method: "POST",
        body: JSON.stringify({
          name: newCategoryName,
          colorHex: newCategoryColor || "#000000",
        }),
      });
      setNewCategoryName("");
      setNewCategoryColor("");
      setActiveCategoryForm(false);
      await loadBoard();
    } catch (e: unknown) {
      const error = e as {
        body?: { error?: { fieldErrors?: { title?: string[] } } };
      };
      setError(
        error?.body?.error?.fieldErrors?.title?.[0] ||
          "Failed to create category",
      );
    }
  }

  async function createCard(listId: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const apiData: { title: string; categoryId?: string } = {
        title: newCardTitle,
      };
      if (selectedCategoryId !== "none")
        apiData.categoryId = selectedCategoryId;
      await apiFetch(`/boards/lists/${listId}/cards`, {
        method: "POST",
        body: JSON.stringify(apiData),
      });
      setNewCardTitle("");
      setActiveListId(null);
      setSelectedCategoryId("none");
      await loadBoard();
    } catch (e: unknown) {
      const error = e as {
        body?: { error?: { fieldErrors?: { title?: string[] } } };
      };
      setError(
        error?.body?.error?.fieldErrors?.title?.[0] || "Failed to create card",
      );
    }
  }

  // Card drag & drop handlers
  const handleCardDragStart = (
    e: React.DragEvent,
    card: Card,
    listId: string,
  ) => {
    setDraggedCard(card);
    setDraggedCardListId(listId);
    setDraggedCardCategoryId(card.categoryId || "uncategorized");

    // Calculate maximum list size per category for visual comparison
    if (board) {
      const categoryMaxSizes = new Map<string, number>();

      // Calculate max size for uncategorized cards
      const uncategorizedMax = Math.max(
        ...board.lists.map(
          (list) => list.cards.filter((card) => !card.categoryId).length,
        ),
      );
      if (uncategorizedMax > 0) {
        categoryMaxSizes.set("uncategorized", uncategorizedMax);
      }

      // Calculate max size for each category
      board.categories.forEach((category) => {
        const categoryMax = Math.max(
          ...board.lists.map(
            (list) =>
              list.cards.filter((card) => card.categoryId === category.id)
                .length,
          ),
        );
        if (categoryMax > 0) {
          categoryMaxSizes.set(category.id, categoryMax);
        }
      });

      setMaxListSizePerCategory(categoryMaxSizes);
    }

    e.dataTransfer.setData("text/plain", card.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropZoneDragOver = (
    e: React.DragEvent,
    listId: string,
    position: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setActiveDropZone({ listId, position });
  };

  const handleDropZoneDrop = async (
    e: React.DragEvent,
    listId: string,
    position: number,
    categorySection?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropZone(null);

    if (!draggedCard || !draggedCardListId) {
      return;
    }

    try {
      // Allow reordering within the same category, even across different lists

      // Check if we're trying to drop in a different category
      const targetCategoryId = getCategoryForListAndPosition(
        listId,
        position,
        categorySection,
      );

      // Allow dropping on empty lists regardless of category
      const list = board?.lists.find((l) => l.id === listId);
      const isListEmpty = list && list.cards.length === 0;

      if (draggedCardCategoryId !== targetCategoryId && !isListEmpty) {
        setDraggedCard(null);
        setDraggedCardListId(null);
        setDraggedCardCategoryId(null);
        return;
      }

      // Move card to target list and position
      try {
        if (draggedCardListId === listId) {
          // Reorder within the same list
          await apiFetch(`/boards/lists/${listId}/cards/reorder`, {
            method: "PATCH",
            body: JSON.stringify({
              cardId: draggedCard.id,
              toPosition: position,
            }),
          });
        } else {
          // Move to different list with specific position using new endpoint
          // For empty lists, ensure position is 1
          const finalPosition = isListEmpty ? 1 : position;

          await apiFetch(
            `/boards/${boardId}/cards/${draggedCard.id}/move-and-reorder`,
            {
              method: "POST",
              body: JSON.stringify({
                toListId: listId,
                toPosition: finalPosition,
              }),
            },
          );
        }
      } catch (error) {
        // Extract detailed error information
        const apiError = error as any;
        if (apiError?.body?.error) {
          throw new Error(`Move failed: ${apiError.body.error}`);
        } else if (apiError?.message) {
          throw new Error(`Move failed: ${apiError.message}`);
        } else {
          throw new Error("Move failed: Unknown error occurred");
        }
      }

      // Refresh the board to get updated positions
      await loadBoard();
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to reorder card");
    } finally {
      setDraggedCard(null);
      setDraggedCardListId(null);
    }
  };

  // Helper function to determine which category a drop zone belongs to
  const getCategoryForListAndPosition = useCallback(
    (listId: string, position: number, categorySection?: string): string => {
      if (!board) return "uncategorized";

      const list = board.lists.find((l) => l.id === listId);
      if (!list) return "uncategorized";

      // For empty lists, use categorySection if provided, otherwise default to uncategorized
      if (list.cards.length === 0) {
        return categorySection || "uncategorized";
      }

      // If we're in a specific category section, use that category
      if (categorySection) {
        return categorySection;
      }

      // Find the card that would be at this position
      // For position 1, it's the first card
      // For other positions, it's the card before the drop zone
      if (position === 1) {
        const firstCard = list.cards.find((card) => card.position === 1);
        return firstCard?.categoryId || "uncategorized";
      } else {
        const previousCard = list.cards.find(
          (card) => card.position === position - 1,
        );
        return previousCard?.categoryId || "uncategorized";
      }
    },
    [board],
  );

  const handleDragEnd = () => {
    setActiveDropZone(null);
    setDraggedCard(null);
    setDraggedCardListId(null);
    setDraggedCardCategoryId(null);
    setMaxListSizePerCategory(new Map());
  };

  if (!board) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div>
      {/* Error AlertBar */}
      {error && (
        <AlertBar
          message={error}
          type="error"
          showIcon={false}
          onClose={() => setError(null)}
        />
      )}

      <div className="flex justify-between items-center mb-[30px]">
        <h1 className="text-2xl font-semibold">{board.title}</h1>
        <div className="flex gap-[30px]">
          {/* Add List Button */}
          <button
            onClick={() => setActiveListForm(!activeListForm)}
            className={addButtonClasses}
          >
            + Add a list
          </button>

          {/* Add Category Button */}
          <button
            onClick={() => setActiveCategoryForm(!activeCategoryForm)}
            className={addButtonClasses}
          >
            + Add a category
          </button>
        </div>
      </div>

      {/* Create List Form */}
      {activeListForm && (
        <div className="mb-[30px] flex justify-end">
          <form onSubmit={createList} className="space-y-2">
            <input
              ref={(input) => {
                if (input) input.focus();
              }}
              className={`w-3xs ${inputBaseClasses}`}
              placeholder="List title"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
            />
            <div className="flex gap-1 justify-end">
              <button
                type="submit"
                className={`bg-blue-500 text-white ${buttonBaseClasses}`}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setActiveListForm(false)}
                className={`bg-gray-300 text-gray-700 ${buttonBaseClasses}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Category Form */}
      {activeCategoryForm && (
        <div className="mb-[30px] flex justify-end">
          <form onSubmit={createCategory} className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                ref={(input) => {
                  if (input) input.focus();
                }}
                className={`w-3xs ${inputBaseClasses}`}
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div className="relative inline-flex items-center bg-white rounded px-3 py-2 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer">
                <div
                  className="w-4 h-4 rounded border border-gray-300 mr-2"
                  style={{ backgroundColor: newCategoryColor || "#000000" }}
                />
                <input
                  type="color"
                  value={newCategoryColor || "#000000"}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            <div className="flex gap-1 justify-end">
              <button
                type="submit"
                className={`bg-blue-500 text-white ${buttonBaseClasses}`}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryForm(false)}
                className={`bg-gray-300 text-gray-700 ${buttonBaseClasses}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lists and Cards - Vertical Category Grouping */}
      <div
        className="flex flex-col gap-6 overflow-x-auto overflow-y-auto relative"
        style={{ maxHeight: "calc(100vh - 200px)" }}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* List Headers Row - Only show if there are lists */}
        {board.lists.length > 0 && (
          <div className="flex gap-4 min-w-max bg-white border-[3px] border-black shadow-[3px_3px_0_black] rounded p-3 sticky top-0 z-10">
            {board.lists.map((list) => (
              <div key={list.id} className="flex-shrink-0 w-80">
                <h2
                  className={`font-medium truncate w-full ${
                    list.title.length <= 14 ? "text-4xl" : "text-xl"
                  }`}
                  title={list.title}
                >
                  {list.title}
                </h2>

                {/* Create Card Form */}
                {activeListId === list.id ? (
                  <form
                    onSubmit={(e) => createCard(list.id, e)}
                    className="space-y-2 mt-3"
                  >
                    <input
                      ref={(input) => {
                        if (input) input.focus();
                      }}
                      className={`w-full ${inputBaseClasses}`}
                      placeholder="Card title"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                    />

                    {/* Category Selection */}
                    {board.categories.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Select Category:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {board.categories.map((category) => (
                            <label
                              key={category.id}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="category"
                                value={category.id}
                                checked={selectedCategoryId === category.id}
                                onChange={(e) =>
                                  setSelectedCategoryId(e.target.value)
                                }
                                className="hidden"
                              />
                              <div
                                className={`${radioIndicatorClasses} ${
                                  selectedCategoryId === category.id
                                    ? "bg-black"
                                    : "bg-white"
                                }`}
                              ></div>
                              <div
                                className={categorySelectionLabelClasses}
                                style={{
                                  backgroundColor:
                                    category.colorHex || "#e5e7eb",
                                }}
                              >
                                {category.name}
                              </div>
                            </label>
                          ))}
                          <label
                            key="nocat"
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="category"
                              value={"none"}
                              checked={selectedCategoryId === "none"}
                              onChange={(e) =>
                                setSelectedCategoryId(e.target.value)
                              }
                              className="hidden"
                            />
                            <div
                              className={`${radioIndicatorClasses} ${
                                selectedCategoryId === "none"
                                  ? "bg-black"
                                  : "bg-white"
                              }`}
                            ></div>
                            <div
                              className={categorySelectionLabelClasses}
                              style={{ backgroundColor: "#e5e7eb" }}
                            >
                              No category
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1 justify-end">
                      <button
                        type="submit"
                        className={`bg-blue-500 text-white ${buttonBaseClasses}`}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveListId(null)}
                        className={`bg-gray-300 text-gray-700 ${buttonBaseClasses}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setActiveListId(list.id)}
                    className={`${addButtonClasses} mt-3`}
                  >
                    + Add a card
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Uncategorized Category Section - Only show if there are uncategorized cards */}
        {(() => {
          const hasUncategorizedCards = board.lists.some((list) =>
            list.cards.some((card) => !card.categoryId),
          );

          if (!hasUncategorizedCards) return null;

          return (
            <div className={categorySectionClasses}>
              {/* Category Title Row */}
              <div className={categoryTitleClasses}>
                <button
                  onClick={() => toggleCategory("uncategorized")}
                  className={categoryNameButtonClasses}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {collapsedCategories.has("uncategorized") ? "▶" : "▼"}
                  </div>
                  <div
                    className={`${categoryIndicatorClasses} bg-gray-200`}
                  ></div>
                  <span className={categoryNameClasses}>
                    Uncategorized ({formatCardCount(getCardCount(null))})
                  </span>
                </button>
              </div>
              {/* Cards Row */}
              <div className={cardsRowClasses}>
                {board.lists.map((list) => {
                  const uncategorizedCards = list.cards.filter(
                    (card) => !card.categoryId,
                  );
                  return (
                    <div key={list.id} className={listColumnClasses}>
                      {!collapsedCategories.has("uncategorized") && (
                        <>
                          {/* Top drop zone */}
                          <DropZone
                            listId={list.id}
                            position={1}
                            isActive={
                              activeDropZone?.listId === list.id &&
                              activeDropZone?.position === 1
                            }
                            onDragOver={handleDropZoneDragOver}
                            onDrop={(e) =>
                              handleDropZoneDrop(e, list.id, 1, "uncategorized")
                            }
                            draggedCard={draggedCard}
                            draggedCardCategoryId={draggedCardCategoryId}
                            getCategoryForListAndPosition={
                              getCategoryForListAndPosition
                            }
                            categorySection="uncategorized"
                            isEmptyList={uncategorizedCards.length === 0}
                            availableSpace={
                              draggedCard &&
                              maxListSizePerCategory.has("uncategorized")
                                ? Math.max(
                                    1,
                                    uncategorizedCards.length === 0
                                      ? maxListSizePerCategory.get(
                                          "uncategorized",
                                        )!
                                      : Math.max(
                                          1,
                                          maxListSizePerCategory.get(
                                            "uncategorized",
                                          )! - uncategorizedCards.length,
                                        ),
                                  )
                                : 1
                            }
                          />
                          {uncategorizedCards.map((card, index) => (
                            <div key={card.id}>
                              <div
                                draggable
                                onDragStart={(e) =>
                                  handleCardDragStart(e, card, list.id)
                                }
                                className={
                                  draggedCard?.id === card.id
                                    ? "opacity-30"
                                    : ""
                                }
                              >
                                <CardItem card={card} boardId={boardId} />
                              </div>
                              {/* Drop zone after each card */}
                              <DropZone
                                listId={list.id}
                                position={card.position + 1}
                                isActive={
                                  activeDropZone?.listId === list.id &&
                                  activeDropZone?.position === card.position + 1
                                }
                                onDragOver={handleDropZoneDragOver}
                                onDrop={(e) =>
                                  handleDropZoneDrop(
                                    e,
                                    list.id,
                                    card.position + 1,
                                    "uncategorized",
                                  )
                                }
                                draggedCard={draggedCard}
                                draggedCardCategoryId={draggedCardCategoryId}
                                getCategoryForListAndPosition={
                                  getCategoryForListAndPosition
                                }
                                categorySection="uncategorized"
                              />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Category Sections */}
        {board.categories.map((category) => (
          <div key={category.id} className={categorySectionClasses}>
            {/* Category Title Row */}
            <div className={categoryTitleClasses}>
              <button
                onClick={() => toggleCategory(category.id)}
                className={categoryNameButtonClasses}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {collapsedCategories.has(category.id) ? "▶" : "▼"}
                </div>
                <div
                  className={categoryIndicatorClasses}
                  style={{ backgroundColor: category.colorHex }}
                ></div>
                <span className={categoryNameClasses}>
                  {category.name} ({formatCardCount(getCardCount(category.id))})
                </span>
              </button>
            </div>
            {/* Cards Row */}
            <div className={cardsRowClasses}>
              {board.lists.map((list) => {
                const categoryCards = list.cards.filter(
                  (card) => card.categoryId === category.id,
                );
                return (
                  <div key={list.id} className={listColumnClasses}>
                    {!collapsedCategories.has(category.id) && (
                      <>
                        {/* Top drop zone */}
                        <DropZone
                          listId={list.id}
                          position={1}
                          isActive={
                            activeDropZone?.listId === list.id &&
                            activeDropZone?.position === 1
                          }
                          onDragOver={handleDropZoneDragOver}
                          onDrop={(e) =>
                            handleDropZoneDrop(e, list.id, 1, category.id)
                          }
                          draggedCard={draggedCard}
                          draggedCardCategoryId={draggedCardCategoryId}
                          getCategoryForListAndPosition={
                            getCategoryForListAndPosition
                          }
                          categorySection={category.id}
                          isEmptyList={categoryCards.length === 0}
                          availableSpace={
                            draggedCard &&
                            maxListSizePerCategory.has(category.id)
                              ? Math.max(
                                  1,
                                  categoryCards.length === 0
                                    ? maxListSizePerCategory.get(category.id)!
                                    : Math.max(
                                        1,
                                        maxListSizePerCategory.get(
                                          category.id,
                                        )! - categoryCards.length,
                                      ),
                                )
                              : 1
                          }
                        />
                        {categoryCards.map((card, index) => (
                          <div key={card.id}>
                            <div
                              draggable
                              onDragStart={(e) =>
                                handleCardDragStart(e, card, list.id)
                              }
                              className={
                                draggedCard?.id === card.id ? "opacity-30" : ""
                              }
                            >
                              <CardItem card={card} boardId={boardId} />
                            </div>
                            {/* Drop zone after each card */}
                            <DropZone
                              listId={list.id}
                              position={card.position + 1}
                              isActive={
                                activeDropZone?.listId === list.id &&
                                activeDropZone?.position === card.position + 1
                              }
                              onDragOver={handleDropZoneDragOver}
                              onDrop={(e) =>
                                handleDropZoneDrop(
                                  e,
                                  list.id,
                                  card.position + 1,
                                  category.id,
                                )
                              }
                              draggedCard={draggedCard}
                              draggedCardCategoryId={draggedCardCategoryId}
                              getCategoryForListAndPosition={
                                getCategoryForListAndPosition
                              }
                              categorySection={category.id}
                              availableSpace={
                                draggedCard &&
                                maxListSizePerCategory.has(category.id)
                                  ? Math.max(
                                      1,
                                      categoryCards.length === 0
                                        ? maxListSizePerCategory.get(
                                            category.id,
                                          )!
                                        : Math.max(
                                            1,
                                            maxListSizePerCategory.get(
                                              category.id,
                                            )! - categoryCards.length,
                                          ),
                                    )
                                  : 1
                              }
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
