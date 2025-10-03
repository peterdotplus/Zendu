import 'dotenv/config';
import { execSync } from 'node:child_process';

// Ensure test DB URL (relative to schema dir)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

// Reset and apply migrations before the test run
try {
	execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
} catch (e) {
	// Fallback: push if no migrations yet
	execSync('npx prisma db push', { stdio: 'inherit' });
}

