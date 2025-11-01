"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import AlertBar from "@/components/AlertBar";

interface Card {
  id: string;
  title: string;
  description: string;
  position: number;
  headerColor?: string | null;
  categoryId?: string | null;
}

interface Category {
  id: string;
  name: string;
  colorHex: string;
}

interface List {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

interface Board {
  id: string;
  title: string;
  description?: string | null;
  lists: List[];
  categories: Category[];
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const cardId = params.cardId as string;

  const [card, setCard] = useState<Card | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCardAndBoard() {
    try {
      setIsLoading(true);
      const [cardData, boardData] = await Promise.all([
        apiFetch<{ card: Card }>(`/boards/${boardId}/cards/${cardId}`),
        apiFetch<{ board: Board }>(`/boards/${boardId}`),
      ]);

      setCard(cardData.card);
      setBoard(boardData.board);
      setTitle(cardData.card.title);
      setDescription(cardData.card.description || "");
      setSelectedCategoryId(cardData.card.categoryId || null);

      // Find which list contains this card
      const listWithCard = boardData.board.lists.find((list) =>
        list.cards?.some((card) => card.id === cardId),
      );
      setSelectedListId(listWithCard?.id || null);
    } catch (e: unknown) {
      const error = e as { body?: { error?: string } };
      setError(error?.body?.error || "Failed to load card");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCardAndBoard();
  }, [boardId, cardId]);

  async function updateCard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await apiFetch(`/boards/${boardId}/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          categoryId: selectedCategoryId,
        }),
      });

      setIsEditing(false);
      await loadCardAndBoard(); // Refresh data
    } catch (e: unknown) {
      const error = e as { body?: { error?: string } };
      setError(error?.body?.error || "Failed to update card");
    }
  }

  async function moveCardToList(listId: string) {
    setError(null);

    try {
      await apiFetch(`/boards/${boardId}/cards/${cardId}/move`, {
        method: "POST",
        body: JSON.stringify({ toListId: listId }),
      });

      setSelectedListId(listId);
      await loadCardAndBoard(); // Refresh data
    } catch (e: unknown) {
      const error = e as {
        body?: { error?: { fieldErrors?: { toListId?: string[] } } };
      };
      setError(
        (error?.body?.error?.fieldErrors?.toListId?.[0] ||
          error?.body?.error ||
          "Failed to move card") as string,
      );
    }
  }

  async function deleteCard() {
    if (!confirm("Are you sure you want to delete this card?")) return;

    setError(null);

    try {
      await apiFetch(`/boards/${boardId}/cards/${cardId}`, {
        method: "DELETE",
      });

      router.push(`/boards/${boardId}`);
    } catch (e: unknown) {
      const error = e as { body?: { error?: string } };
      setError(error?.body?.error || "Failed to delete card");
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading card...</div>;
  }

  if (!card || !board) {
    return <div className="p-6">Card not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Error AlertBar */}
      {error && (
        <AlertBar
          message={error}
          type="error"
          showIcon={false}
          onClose={() => setError(null)}
        />
      )}

      {/* Breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/boards/${boardId}`)}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          ← Back to {board.title}
        </button>
      </div>

      {/* Card Content */}
      <div className="bg-white border-[3px] border-black shadow-[3px_3px_0_black] rounded-lg p-6">
        {isEditing ? (
          <form onSubmit={updateCard} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Selection */}
            {board.categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategoryId || ""}
                  onChange={(e) =>
                    setSelectedCategoryId(e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No category</option>
                  {board.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold">{card.title}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={deleteCard}
                  className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {card.description && (
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {card.description}
                </p>
              </div>
            )}

            {/* Card Metadata */}
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Current List:</strong>{" "}
                  {selectedListId && (
                    <select
                      value={selectedListId}
                      onChange={(e) => moveCardToList(e.target.value)}
                      className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {board.lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {card.categoryId && (
                  <div>
                    <strong>Category:</strong>{" "}
                    <span className="inline-flex items-center gap-1 ml-2">
                      <div
                        className="w-3 h-3 rounded-full border border-black"
                        style={{
                          backgroundColor:
                            board.categories.find(
                              (c) => c.id === card.categoryId,
                            )?.colorHex || "#e5e7eb",
                        }}
                      ></div>
                      {
                        board.categories.find((c) => c.id === card.categoryId)
                          ?.name
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
