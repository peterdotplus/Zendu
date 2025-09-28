import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		res.json({ ok: true });
	} catch (_err) {
		res.status(500).json({ ok: false, error: 'DB not reachable' });
	}
});

app.use('/auth', authRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
	console.log(`API listening on http://localhost:${PORT}`);
});
