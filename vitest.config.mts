import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			// Pexels and Pixabay are left unconfigured to check they stay hidden.
			miniflare: { bindings: { UNSPLASH_ACCESS_KEY: 'test-key', PEXELS_API_KEY: '', PIXABAY_API_KEY: '' } },
		}),
	],
});
