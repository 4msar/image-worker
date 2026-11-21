// test/index.spec.ts
import { env, exports } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { availableProviders } from '../src/providers';
import { toImage as picsumImage } from '../src/providers/picsum';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('image worker', () => {
	it('serves the docs page at the root (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
		expect(await response.text()).toContain('<html');
	});

	it('renders SEO tags for the request origin', async () => {
		const html = await (await exports.default.fetch('https://images.example.com/')).text();
		expect(html).toContain('<link rel="canonical" href="https://images.example.com/" />');
		expect(html).toContain('<meta property="og:url" content="https://images.example.com/" />');
		expect(html).toMatch(
			/<meta name="description" content="Free image API: fetch photos from Unsplash, Lorem Picsum and Openverse/,
		);
		const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
		expect(ld['@type']).toBe('WebAPI');
	});

	it('serves robots.txt that keeps crawlers on the docs page', async () => {
		const response = await exports.default.fetch('https://example.com/robots.txt');
		expect(await response.text()).toBe('User-agent: *\nAllow: /$\nAllow: /llms.txt\nDisallow: /\n');
	});

	it('serves llms.txt listing available providers', async () => {
		const response = await exports.default.fetch('https://images.example.com/llms.txt');
		expect(response.headers.get('content-type')).toContain('text/plain');
		const text = await response.text();
		expect(text).toMatch(/^# Image API\n/);
		expect(text).toContain('https://images.example.com/picsum/random');
		expect(text).not.toContain('(`pexels`)');
	});

	it('allows CORS from any origin', async () => {
		const response = await exports.default.fetch('https://example.com/providers', {
			headers: { origin: 'https://other.example' },
		});
		expect(response.headers.get('access-control-allow-origin')).toBe('*');
	});

	it('answers CORS preflight requests', async () => {
		const response = await exports.default.fetch('https://example.com/picsum/random', {
			method: 'OPTIONS',
			headers: { origin: 'https://other.example', 'access-control-request-method': 'GET' },
		});
		expect(response.status).toBe(204);
		expect(response.headers.get('access-control-allow-origin')).toBe('*');
	});

	it('rejects non-GET requests (integration style)', async () => {
		const response = await exports.default.fetch('https://example.com/unsplash/photos/random', { method: 'POST' });
		expect(response.status).toBe(405);
		expect(await response.text()).toBe('Method Not Allowed');
	});

	it('returns JSON 404 for unknown routes', async () => {
		const response = await exports.default.fetch('https://example.com/nope');
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Not Found' });
	});
});

describe('provider availability', () => {
	it('lists open providers and configured API providers only', async () => {
		const response = await exports.default.fetch('https://example.com/providers');
		const ids = ((await response.json()) as { id: string }[]).map((provider) => provider.id);
		expect(ids).toEqual(['unsplash', 'picsum', 'openverse']);
	});

	it('hides unconfigured providers from the docs', async () => {
		const html = await (await exports.default.fetch('https://example.com/')).text();
		expect(html).toContain('id="provider-unsplash"');
		expect(html).toContain('id="provider-picsum"');
		expect(html).not.toContain('id="provider-pexels"');
		expect(html).not.toContain('{{');
	});

	it('returns 404 for routes of unconfigured providers', async () => {
		const response = await exports.default.fetch('https://example.com/pexels/random');
		expect(response.status).toBe(404);
	});

	it('enables an API provider once its key is set', () => {
		const ids = availableProviders({ ...env, PEXELS_API_KEY: 'key' }).map((provider) => provider.id);
		expect(ids).toContain('pexels');
		expect(ids).not.toContain('pixabay');
	});
});

describe('picsum', () => {
	const photo = {
		id: '10',
		author: 'Jane',
		width: 4000,
		height: 2000,
		url: 'https://unsplash.com/x',
		download_url: '',
	};

	it('builds sized URLs that keep the aspect ratio', () => {
		const image = picsumImage(photo, new URLSearchParams());
		expect(image.urls.regular).toBe('https://picsum.photos/id/10/1080/540.jpg');
		expect(image.urls.raw).toBe('https://picsum.photos/id/10/4000/2000.jpg');
	});

	it('applies grayscale and blur filters', () => {
		const image = picsumImage(photo, new URLSearchParams('grayscale&blur=20'));
		expect(image.urls.thumb).toBe('https://picsum.photos/id/10/200/100.jpg?grayscale&blur=10');
	});
});

describe('unsplash passthrough', () => {
	it('leaves /unsplash/search to the shared search route', async () => {
		const response = await exports.default.fetch('https://example.com/unsplash/search');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Unsplash search needs a query parameter' });
	});

	it('rejects unsupported endpoints', async () => {
		expect((await exports.default.fetch('https://example.com/unsplash/me')).status).toBe(404);
		expect((await exports.default.fetch('https://example.com/photos')).status).toBe(404);
	});
});

describe('rate limiting', () => {
	const limitedEnv = (success: boolean, keys: string[] = []) => ({
		...env,
		RATE_LIMITER: {
			limit: async ({ key }: { key: string }) => {
				keys.push(key);
				return { success };
			},
		},
	});

	it('returns 429 with Retry-After once a client hits the limit', async () => {
		const request = new IncomingRequest('https://example.com/picsum/random', {
			headers: { 'cf-connecting-ip': '203.0.113.7' },
		});
		const response = await app.fetch(request, limitedEnv(false), createExecutionContext());
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('60');
		expect(await response.json()).toEqual({ error: 'Too Many Requests' });
	});

	it('keys the limit by provider and client IP', async () => {
		const keys: string[] = [];
		const request = new IncomingRequest('https://example.com/unsplash/search', {
			headers: { 'cf-connecting-ip': '203.0.113.7' },
		});
		await app.fetch(request, limitedEnv(true, keys), createExecutionContext());
		expect(keys).toEqual(['unsplash:203.0.113.7']);
	});

	it('does not limit docs or unconfigured providers', async () => {
		const keys: string[] = [];
		const limited = limitedEnv(false, keys);
		expect((await app.fetch(new IncomingRequest('https://example.com/providers'), limited)).status).toBe(200);
		expect((await app.fetch(new IncomingRequest('https://example.com/pexels/random'), limited)).status).toBe(404);
		expect(keys).toEqual([]);
	});
});
