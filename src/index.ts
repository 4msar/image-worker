import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { renderDocs } from './docs';
import { availableProviders, providers } from './providers';
import type { AppEnv } from './providers/types';
import { providerRoutes } from './routes';

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
	if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
		return c.text('Method Not Allowed', 405);
	}
	await next();
});

app.get('/', (c) => c.html(renderDocs(availableProviders(c.env))));

app.get('/providers', (c) =>
	c.json(
		availableProviders(c.env).map(({ id, name, access, homepage, description }) => ({
			id,
			name,
			access,
			homepage,
			description,
			routes: [`/${id}/random`, `/${id}/search`, `/${id}/photos/:id`],
		})),
	),
);

for (const provider of providers) {
	app.route(`/${provider.id}`, providerRoutes(provider));
}

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.onError((error, c) => {
	if (error instanceof HTTPException) {
		return c.json({ error: error.message }, error.status);
	}
	console.error(error);
	return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
