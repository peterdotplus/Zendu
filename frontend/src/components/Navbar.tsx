"use client";
import Link from 'next/link';
import dynamic from 'next/dynamic';

const UserMenu = dynamic(() => import('./UserMenu').then(mod => ({ default: mod.UserMenu })), {
	ssr: false,
	loading: () => <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
});

export function Navbar() {
	return (
		<header className="w-full border-b bg-white sticky top-0 z-40">
			<div className="max-w-[92rem] mx-auto px-4 h-14 flex items-center justify-between">
				<Link href="/" className="font-semibold text-lg">Zendu</Link>
				<div className="flex items-center gap-4">
					<Link href="/boards" className="text-gray-700 hover:text-gray-900 font-medium">Boards</Link>
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
