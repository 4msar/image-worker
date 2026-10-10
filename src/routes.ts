import { Hono, type Context } from 'hono';
import { clamp } from './lib/http';
import { getResponseType, getSize, sendImage } from './lib/respond';
import { isConfigured } from './providers';
import type { AppEnv, Orientation, Params, Provider } from './providers/types';

const ORIENTATIONS: Orientation[] = ['landscape', 'portrait', 'squarish'];

const toInt = (value: string | undefined, fallback: number) => {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

const getParams = (c: Context<AppEnv>): Params => {
	const raw = new URL(c.req.url).searchParams;
	const orientation = c.req.query('orientation') as Orientation;
	return {
		query: c.req.query('query') || c.req.query('q') || undefined,
		orientation: ORIENTATIONS.includes(orientation) ? orientation : undefined,
		page: Math.max(toInt(c.req.query('page'), 1), 1),
		perPage: clamp(toInt(c.req.query('per_page'), 10), 1, 200),
		raw,
	};
};

/** Routes shared by every provider, mounted at /<provider-id>. */
export const providerRoutes = (provider: Provider) => {
	const app = new Hono<AppEnv>();

	// Unconfigured providers behave as if they don't exist.
	app.use('*', async (c, next) => {
		if (!isConfigured(provider, c.env)) return c.notFound();
		await next();
	});

	provider.routes?.(app);

	app.get('/random', async (c) => {
		const image = await provider.random(getParams(c), c.env);
		return sendImage(c, image, getResponseType(c.req.query('type')), getSize(c.req.query('size')));
	});

	app.get('/search', async (c) => c.json(await provider.search(getParams(c), c.env)));

	app.get('/photos/:id', async (c) => {
		const image = await provider.photo(c.req.param('id'), getParams(c), c.env);
		return sendImage(c, image, getResponseType(c.req.query('type')), getSize(c.req.query('size')));
	});

	return app;
};
