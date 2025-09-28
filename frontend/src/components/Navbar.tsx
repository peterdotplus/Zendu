"use client";
import Link from 'next/link';
import { UserMenu } from './UserMenu';

export function Navbar() {
	return (
		<header className="w-full border-b bg-white sticky top-0 z-40">
			<div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
				<Link href="/" className="font-semibold text-lg">Zendu</Link>
				<div className="flex items-center gap-4">
					<Link href="/boards" className="text-gray-700 hover:text-gray-900 font-medium">Boards</Link>
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
