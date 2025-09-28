"use client";
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			const res = await apiFetch<{ token: string }>(`/auth/login`, {
				method: 'POST',
				body: JSON.stringify({ email, password })
			});
			localStorage.setItem('token', res.token);
			window.location.href = '/boards';
		} catch (e: any) {
			setError(e?.body?.error || 'Login failed');
		}
	}

	return (
		<div className="max-w-sm mx-auto p-6">
			<h1 className="text-2xl font-semibold mb-4">Login</h1>
			<form onSubmit={onSubmit} className="space-y-3">
				<input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
				<input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
				{error && <p className="text-red-600 text-sm">{error}</p>}
				<button className="w-full bg-black text-white rounded px-3 py-2">Login</button>
			</form>
			<p className="mt-4 text-sm">No account? <Link className="underline" href="/register">Register</Link></p>
		</div>
	);
}
