"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

function getUser(): { displayName?: string; email?: string } | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem('user');
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function UserMenu() {
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [letter, setLetter] = useState<string>('U');
	const [displayName, setDisplayName] = useState<string>('User');
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMounted(true);
		const u = getUser();
		const name = (u?.displayName || 'U').toString();
		setDisplayName(u?.displayName || 'User');
		setLetter(name.trim().charAt(0).toUpperCase() || 'U');
	}, []);

	useEffect(() => {
		function onDocClick(e: MouseEvent) {
			if (!ref.current) return;
			if (!ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	}, []);

	function logout() {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		window.location.href = '/login';
	}

	if (!mounted) {
		return (
			<div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
		);
	}

	return (
		<div className="relative" ref={ref}>
			<button onClick={() => setOpen(v => !v)} className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center cursor-pointer">
				{letter}
			</button>
			{open && (
				<div className="absolute right-0 mt-2 w-48 rounded border bg-white shadow-md py-1 text-sm">
					<Link href="/settings" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-gray-50 cursor-pointer">{displayName}</Link>
					<div className="my-1 border-t" />
					<button onClick={() => { setOpen(false); logout(); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer">Logout</button>
				</div>
			)}
		</div>
	);
}
