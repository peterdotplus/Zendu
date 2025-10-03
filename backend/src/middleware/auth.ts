import { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../lib/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthedRequest extends Request {
	user?: { id: string };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
	const auth = req.headers.authorization || '';
	if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
	const token = auth.slice('Bearer '.length);
	try {
		const payload = verifyJwt<{ userId: string; tokenVersion: number }>(token);
		const user = await prisma.user.findUnique({ where: { id: payload.userId } });
		if (!user) return res.status(401).json({ error: 'Invalid token' });
		if (user.tokenVersion !== payload.tokenVersion) return res.status(401).json({ error: 'Token expired' });
		req.user = { id: user.id };
		return next();
	} catch (_e) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

