import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../providers/types';

/** Seconds a client should wait after hitting the limit; matches the binding's period in wrangler.jsonc. */
const RETRY_AFTER = 60;

/** Limit each client per provider, so heavy use of one provider doesn't lock them out of the others. */
export const rateLimit =
	(providerId: string): MiddlewareHandler<AppEnv> =>
	async (c, next) => {
		const limiter = c.env.RATE_LIMITER;
		if (!limiter) return next();

		const client = c.req.header('cf-connecting-ip') ?? 'anonymous';
		const { success } = await limiter.limit({ key: `${providerId}:${client}` });

		if (!success) {
			c.header('retry-after', String(RETRY_AFTER));
			return c.json({ error: 'Too Many Requests' }, 429);
		}

		await next();
	};
