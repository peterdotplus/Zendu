"use client";
import { useEffect, useState } from 'react';

export default function SettingsPage() {
	const [email, setEmail] = useState<string>('');
	const [displayName, setDisplayName] = useState<string>('');

	useEffect(() => {
		try {
			const raw = localStorage.getItem('user');
			if (raw) {
				const u = JSON.parse(raw);
				setEmail(u?.email || '');
				setDisplayName(u?.displayName || '');
			}
		} catch {}
	}, []);

	return (
		<div className="max-w-lg mx-auto p-6 space-y-4">
			<h1 className="text-2xl font-semibold">Settings</h1>
			<div className="space-y-1">
				<div className="text-sm text-gray-500">Email</div>
				<div className="border rounded px-3 py-2 bg-gray-50">{email || '—'}</div>
			</div>
			<div className="space-y-1">
				<div className="text-sm text-gray-500">Display name</div>
				<div className="border rounded px-3 py-2 bg-gray-50">{displayName || '—'}</div>
			</div>
		</div>
	);
}
