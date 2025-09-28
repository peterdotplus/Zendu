import jwt, { SignOptions } from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '7d' as unknown as SignOptions['expiresIn'];

export interface JwtPayloadBase {
	userId: string;
	tokenVersion: number;
}

export function getJwtSecret(): string {
	const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
	return secret;
}

export function signJwt(payload: JwtPayloadBase, expiresIn: SignOptions['expiresIn'] = DEFAULT_EXPIRES_IN): string {
	const options: SignOptions = { expiresIn };
	return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyJwt<T extends object = JwtPayloadBase>(token: string): T {
	return jwt.verify(token, getJwtSecret()) as unknown as T;
}
