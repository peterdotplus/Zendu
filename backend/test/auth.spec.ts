import request from 'supertest';
import { app } from '../src/server';

const email = `test+${Date.now()}@example.com`;
const password = 'Password123!';

describe('Auth', () => {
	it('registers, verifies, and logs in', async () => {
		const reg = await request(app)
			.post('/auth/register')
			.send({ email, password, displayName: 'Tester' })
			.expect(201);
		expect(reg.body.user.email).toBe(email);
		const code: string = reg.body.verificationCode;

		await request(app)
			.post('/auth/verify')
			.send({ email, code })
			.expect(200);

		const login = await request(app)
			.post('/auth/login')
			.send({ email, password })
			.expect(200);
		expect(typeof login.body.token).toBe('string');
	});
});
