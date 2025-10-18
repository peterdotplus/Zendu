"use client";
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useParams } from 'next/navigation';

import AlertBar from '@/components/AlertBar';


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
	const [activeListForm, setActiveListForm] = useState<boolean>(false);
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
			setActiveListForm(false);
			await loadBoard();
		} catch (e: any) {
			setError(e?.body?.error?.fieldErrors?.title || 'Failed to create list');
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
			setError(e?.body?.error?.fieldErrors?.title || 'Failed to create card');
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

			{/* Error AlertBar */}
			{error && <AlertBar 
				message={error} 
				type="error"
				showIcon={false}
				onClose={() => setError(null)}
			/>}

			{/* Create List Form */}
			{activeListForm ? (
				<form onSubmit={createList} className="space-y-2">
					<input 
						ref={(input) => input && input.focus()}
						className="bg-white w-3xs rounded px-3 py-2 text-sm border-[3px] border-black shadow-[3px_3px_0_black]" 
						placeholder="List title" 
						value={newListTitle} 
						onChange={e => setNewListTitle(e.target.value)} 
					/>
					<div className="flex gap-1">
						<button type="submit" className="bg-blue-500 text-white rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer">Add</button>
						<button 
							type="button" 
							onClick={() => setActiveListForm(false)} 
							className="bg-gray-300 text-gray-700 rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer"
						>
							Cancel
						</button>
					</div>
				</form>
			) : (
				<button 
					onClick={() => setActiveListForm(true)} 
					className="text-left text-gray-500 hover:text-gray-900 text-sm cursor-pointer"
				>
					+ Add a list
				</button>
			)}

			{/* Lists and Cards */}
			<div className="flex gap-4 overflow-x-auto">
				{board.lists.map(list => (
					<div key={list.id} className="flex-shrink-0 w-80 border-[3px] border-black rounded p-4 space-y-3">
						<h2 className={`font-medium truncate w-full ${(list.title.length <= 14) ? "text-4xl" : "text-xl"}`} title={list.title}>{list.title}</h2>
						
						{/* Create Card Form */}
						{activeListId === list.id ? (
							<form onSubmit={(e) => createCard(list.id, e)} className="space-y-2">
								<input 
									ref={(input) => input && input.focus()}
									className="bg-white w-full rounded px-3 py-2 text-sm border-[3px] border-black shadow-[3px_3px_0_black]" 
									placeholder="Card title" 
									value={newCardTitle} 
									onChange={e => setNewCardTitle(e.target.value)} 
								/>
								<div className="flex gap-1">
									<button type="submit" className="bg-blue-500 text-white rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer">Add</button>
									<button 
										type="button" 
										onClick={() => setActiveListId(null)} 
										className="bg-gray-300 text-gray-700 rounded px-2 py-1 text-sm border-[3px] border-black shadow-[3px_3px_0_black] cursor-pointer"
									>
										Cancel
									</button>
								</div>
							</form>
						) : (
							<button 
								onClick={() => setActiveListId(list.id)} 
								className="text-left text-gray-500 hover:text-gray-900 text-sm cursor-pointer"
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
