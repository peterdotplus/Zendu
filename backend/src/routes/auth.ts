import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signJwt } from '../lib/jwt';

const prisma = new PrismaClient();
export const authRouter = Router();

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	displayName: z.string().min(1)
});

authRouter.post('/register', async (req, res) => {
	const parse = registerSchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
	const { email, password, displayName } = parse.data;

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) return res.status(409).json({ error: 'Email already in use' });

	const passwordHash = await bcrypt.hash(password, 10);
	const user = await prisma.user.create({ data: { email, passwordHash, displayName } });

	// Issue a code for email verification
	const code = Math.floor(100000 + Math.random() * 900000).toString();
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
	await prisma.emailVerificationCode.create({ data: { userId: user.id, code, expiresAt } });

	// TODO: send code via email provider; for now return it in dev
	res.status(201).json({ user: { id: user.id, email: user.email, displayName: user.displayName }, verificationCode: code });
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8)
});

authRouter.post('/login', async (req, res) => {
	const parse = loginSchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
	const { email, password } = parse.data;

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) return res.status(401).json({ error: 'Invalid credentials' });

	const ok = await bcrypt.compare(password, user.passwordHash);
	if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

	if (!user.emailVerifiedAt) {
		return res.status(403).json({ error: 'Email not verified. Please verify your email before logging in.' });
	}

	const token = signJwt({ userId: user.id, tokenVersion: user.tokenVersion });
	res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, emailVerifiedAt: user.emailVerifiedAt } });
});

const requestCodeSchema = z.object({ email: z.string().email() });

authRouter.post('/request-code', async (req, res) => {
	const parse = requestCodeSchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
	const { email } = parse.data;

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) return res.status(404).json({ error: 'User not found' });

	const code = Math.floor(100000 + Math.random() * 900000).toString();
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
	await prisma.emailVerificationCode.create({ data: { userId: user.id, code, expiresAt } });

	// TODO: send code via email; return in dev
	res.json({ ok: true, verificationCode: code });
});

const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });

authRouter.post('/verify', async (req, res) => {
	const parse = verifySchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
	const { email, code } = parse.data;

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) return res.status(404).json({ error: 'User not found' });

	const record = await prisma.emailVerificationCode.findFirst({
		where: { userId: user.id, code, consumedAt: null, expiresAt: { gt: new Date() } },
		orderBy: { createdAt: 'desc' }
	});
	if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

	await prisma.$transaction([
		prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
		prisma.emailVerificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
	]);

	res.json({ ok: true });
});
