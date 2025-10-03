import request from 'supertest';
import { app } from '../src/server';

async function registerLogin() {
	const email = `u+${Date.now()}@example.com`;
	const password = 'Password123!';
	const reg = await request(app).post('/auth/register').send({ email, password, displayName: 'User' });
	const code = reg.body.verificationCode;
	await request(app).post('/auth/verify').send({ email, code });
	const login = await request(app).post('/auth/login').send({ email, password });
	return { token: login.body.token };
}

describe('Boards, Lists, Cards', () => {
	it('creates board, list, and card', async () => {
		const { token } = await registerLogin();
		const auth = { Authorization: `Bearer ${token}` };

		const b = await request(app).post('/boards').set(auth).send({ title: 'B1' }).expect(201);
		const boardId = b.body.board.id as string;

		const l = await request(app).post(`/boards/${boardId}/lists`).set(auth).send({ title: 'L1' }).expect(201);
		const listId = l.body.list.id as string;

		const c = await request(app)
			.post(`/boards/lists/${listId}/cards`)
			.set(auth)
			.send({ title: 'C1', description: 'd' })
			.expect(201);
		expect(c.body.card.title).toBe('C1');
	});
});

