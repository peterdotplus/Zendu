"use client";
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function RegisterPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [step, setStep] = useState<'register' | 'verify'>('register');
	const [code, setCode] = useState('');
	const [verificationCode, setVerificationCode] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function onRegister(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			const res = await apiFetch<{ verificationCode: string }>(`/auth/register`, { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
			setVerificationCode(res.verificationCode);
			setStep('verify');
		} catch (e: any) {
			setError(e?.body?.error || 'Register failed');
		}
	}

	async function onRequestCode() {
		setError(null);
		try {
			const res = await apiFetch<{ verificationCode: string }>(`/auth/request-code`, { method: 'POST', body: JSON.stringify({ email }) });
			setVerificationCode(res.verificationCode);
		} catch (e: any) {
			setError(e?.body?.error || 'Could not request code');
		}
	}

	async function onVerify(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await apiFetch(`/auth/verify`, { method: 'POST', body: JSON.stringify({ email, code }) });
			window.location.href = '/login';
		} catch (e: any) {
			setError(e?.body?.error || 'Verification failed');
		}
	}

	return (
		<div className="max-w-sm mx-auto p-6">
			<h1 className="text-2xl font-semibold mb-4">Register</h1>
			{step === 'register' ? (
				<form onSubmit={onRegister} className="space-y-3">
					<input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
					<input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
					<input className="w-full border rounded px-3 py-2" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
					{error && <p className="text-red-600 text-sm">{error}</p>}
					<button className="w-full bg-black text-white rounded px-3 py-2">Continue</button>
				</form>
			) : (
				<form onSubmit={onVerify} className="space-y-3">
					<p className="text-sm">Enter the 6-digit code sent to your email.</p>
					<input className="w-full border rounded px-3 py-2" placeholder="Verification code" value={code} onChange={e => setCode(e.target.value)} />
					{verificationCode && (
						<p className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
							TEMP: will be sent through e-mail. Verification code: <span className="font-mono font-bold">{verificationCode}</span>
						</p>
					)}
					<div className="flex gap-2">
						<button type="button" onClick={onRequestCode} className="flex-1 border rounded px-3 py-2">Resend</button>
						<button className="flex-1 bg-black text-white rounded px-3 py-2">Verify</button>
					</div>
					{error && <p className="text-red-600 text-sm">{error}</p>}
				</form>
			)}
			<p className="mt-4 text-sm">Already have an account? <Link className="underline" href="/login">Login</Link></p>
		</div>
	);
}
