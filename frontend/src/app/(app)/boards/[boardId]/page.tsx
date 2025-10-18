"use client";
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useParams } from 'next/navigation';

interface List {
	id: string;
	title: string;
	position: number;
	cards: Card[];
}

interface Card {
	id: string;
	title: string;
	description: string;
	position: number;
	headerColor?: string | null;
}

interface Board {
	id: string;
	title: string;
	description?: string | null;
	lists: List[];
}

export default function BoardViewPage() {
	const params = useParams();
	const boardId = params.boardId as string;
	
	const [board, setBoard] = useState<Board | null>(null);
	const [newListTitle, setNewListTitle] = useState('');
	const [newCardTitle, setNewCardTitle] = useState('');
	const [activeListId, setActiveListId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function loadBoard() {
		try {
			const data = await apiFetch<{ board: Board }>(`/boards/${boardId}`);
			setBoard(data.board);
		} catch (e: any) {
			setError(e?.body?.error || 'Failed to load board');
		}
	}

	useEffect(() => {
		loadBoard();
	}, [boardId]);

	async function createList(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await apiFetch(`/boards/${boardId}/lists`, {
				method: 'POST',
				body: JSON.stringify({ title: newListTitle })
			});
			setNewListTitle('');
			await loadBoard();
		} catch (e: any) {
			setError(e?.body?.error || 'Failed to create list');
		}
	}

	async function createCard(listId: string, e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await apiFetch(`/boards/lists/${listId}/cards`, {
				method: 'POST',
				body: JSON.stringify({ 
					title: newCardTitle
				})
			});
			setNewCardTitle('');
			setActiveListId(null);
			await loadBoard();
		} catch (e: any) {
			setError(e?.body?.error || 'Failed to create card');
		}
	}

	if (!board) {
		return <div className="p-6">Loading...</div>;
	}

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{board.title}</h1>
				{board.description && <p className="text-gray-600">{board.description}</p>}
			</div>

			{error && <p className="text-red-600 text-sm">{error}</p>}

			{/* Create List Form */}
			<form onSubmit={createList} className="flex gap-2">
				<input 
					className="flex-1 border rounded px-3 py-2" 
					placeholder="New list title" 
					value={newListTitle} 
					onChange={e => setNewListTitle(e.target.value)} 
				/>
				<button className="bg-black text-white rounded px-3 py-2">Create List</button>
			</form>

			{/* Lists and Cards */}
			<div className="flex gap-4 overflow-x-auto">
				{board.lists.map(list => (
					<div key={list.id} className="flex-shrink-0 w-80 border-[3px] border-black rounded p-4 space-y-3">
						{(list.title.length <= 14) && <h2 className="text-4xl font-medium truncate w-full" title={list.title}>{list.title}</h2>}
						{(list.title.length > 14) && <h2 className="text-xl font-medium truncate w-full" title={list.title}>{list.title}</h2>}
						
						{/* Create Card Form */}
						{activeListId === list.id ? (
							<form onSubmit={(e) => createCard(list.id, e)} className="space-y-2">
								<input 
									ref={(input) => input && input.focus()}
									className="w-full border rounded px-2 py-1 text-sm" 
									placeholder="Card title" 
									value={newCardTitle} 
									onChange={e => setNewCardTitle(e.target.value)} 
								/>
								<div className="flex gap-1">
									<button type="submit" className="bg-blue-500 text-white rounded px-2 py-1 text-sm">Add</button>
									<button 
										type="button" 
										onClick={() => setActiveListId(null)} 
										className="bg-gray-300 text-gray-700 rounded px-2 py-1 text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						) : (
							<button 
								onClick={() => setActiveListId(list.id)} 
								className="w-full text-left text-gray-600 hover:text-gray-800 text-sm"
							>
								+ Add a card
							</button>
						)}

						{/* Cards */}
						<div className="space-y-2">
							{list.cards.map(card => (
								<div key={card.id} className="bg-white border-[3px] border-black shadow-[3px_3px_0_black] rounded p-3">
									<div className="font-medium text-sm" title={card.title}>{card.title}</div>
									{card.description && <div className="text-xs text-gray-600 mt-1">{card.description}</div>}
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
