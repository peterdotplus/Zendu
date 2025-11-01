"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

import AlertBar from "@/components/AlertBar";

interface Board {
  id: string;
  title: string;
  description?: string | null;
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState("");
  const [activeBoardForm, setActiveBoardForm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<{ boards: Board[] }>(`/boards`);
      setBoards(data.boards);
    } catch (e: unknown) {
      const error = e as { body?: { error?: string } };
      setError(error?.body?.error || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch<{ board: Board }>(`/boards`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setTitle("");
      setActiveBoardForm(false);
      await load();
    } catch (e: unknown) {
      const error = e as {
        body?: { error?: { fieldErrors?: { title?: string[] } } };
      };
      setError(
        error?.body?.error?.fieldErrors?.title?.[0] || "Failed to create",
      );
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Boards</h1>

      {/* Create Board Form */}
      {activeBoardForm ? (
        <form onSubmit={createBoard} className="space-y-2">
          <input
            ref={(input) => {
              if (input) input.focus();
            }}
            className="bg-white w-full rounded px-3 py-2 text-sm border-[3px] border-black shadow-[3px_3px_0_black]"
            placeholder="Board title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex gap-1">
            <button
              type="submit"
              className="bg-blue-500 text-white rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setActiveBoardForm(false)}
              className="bg-gray-300 text-gray-700 rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setActiveBoardForm(true)}
          className="text-left text-gray-500 hover:text-gray-900 text-sm cursor-pointer"
        >
          + Add a board
        </button>
      )}

      {/* Error AlertBar */}
      {error && (
        <AlertBar
          message={error}
          type="error"
          showIcon={false}
          onClose={() => setError(null)}
        />
      )}

      {/* Board selector */}
      {boards.length > 0 && (
        <ul className="divide-y">
          {boards.map((b) => (
            <div
              key={b.id}
              className="bg-white text-sm rounded border-black border-[3px] shadow-[3px_3px_0_black] mb-[12px]"
            >
              <Link
                href={`/boards/${b.id}`}
                className="block p-3 hover:bg-gray-200 cursor-pointer"
              >
                <div className="font-medium">{b.title}</div>
                {b.description && (
                  <div className="text-sm text-gray-600">{b.description}</div>
                )}
              </Link>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
