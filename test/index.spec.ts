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
		expect(await response.text()).toBe('User-agent: *\nAllow: /$\nDisallow: /\n');
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
