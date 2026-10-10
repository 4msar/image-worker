// test/index.spec.ts
import { env, exports } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { checkCorrectUnsplashEndpoint } from '../src/utils';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('unsplash worker', () => {
	it('serves the docs page at the root (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/html');
		expect(await response.text()).toContain('<html');
	});

	it('rejects non-GET requests (integration style)', async () => {
		const response = await exports.default.fetch('https://example.com/unsplash/photos/random', { method: 'POST' });
		expect(response.status).toBe(405);
		expect(await response.text()).toBe('Method Not Allowed');
	});
});

describe('checkCorrectUnsplashEndpoint', () => {
	it('accepts supported endpoints', () => {
		expect(checkCorrectUnsplashEndpoint('/unsplash/photos/random')).toBe(true);
		expect(checkCorrectUnsplashEndpoint('/unsplash/search/photos')).toBe(true);
	});

	it('rejects unsupported endpoints', () => {
		expect(checkCorrectUnsplashEndpoint('/unsplash/me')).toBe(false);
		expect(checkCorrectUnsplashEndpoint('/photos')).toBe(false);
	});
});
