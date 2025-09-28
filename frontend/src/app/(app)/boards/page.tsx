"use client";
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Board { id: string; title: string; description?: string | null }

export default function BoardsPage() {
	const [boards, setBoards] = useState<Board[]>([]);
	const [title, setTitle] = useState('');
	const [error, setError] = useState<string | null>(null);

	async function load() {
		try {
			const data = await apiFetch<{ boards: Board[] }>(`/boards`);
			setBoards(data.boards);
		} catch (e: any) {
			setError(e?.body?.error || 'Failed to load');
		}
	}

	useEffect(() => { load(); }, []);

	async function createBoard(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await apiFetch<{ board: Board }>(`/boards`, { method: 'POST', body: JSON.stringify({ title }) });
			setTitle('');
			await load();
		} catch (e: any) {
			setError(e?.body?.error || 'Failed to create');
		}
	}

	return (
		<div className="max-w-2xl mx-auto p-6 space-y-6">
			<h1 className="text-2xl font-semibold">Boards</h1>
			<form onSubmit={createBoard} className="flex gap-2">
				<input className="flex-1 border rounded px-3 py-2" placeholder="New board title" value={title} onChange={e => setTitle(e.target.value)} />
				<button className="bg-black text-white rounded px-3 py-2">Create</button>
			</form>
			{error && <p className="text-red-600 text-sm">{error}</p>}
			{boards.length > 0 && (
				<ul className="divide-y border rounded">
					{boards.map(b => (
						<li key={b.id} className="p-3 hover:bg-gray-50 cursor-pointer">
							<Link href={`/boards/${b.id}`} className="block">
								<div className="font-medium">{b.title}</div>
								{b.description && <div className="text-sm text-gray-600">{b.description}</div>}
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
