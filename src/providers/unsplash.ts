import { HTTPException } from 'hono/http-exception';
import { fetchJson } from '../lib/http';
import { getResponseType, proxyImage } from '../lib/respond';
import type { Image, Params, Provider } from './types';

const API = 'https://api.unsplash.com';

/** Unsplash API endpoints that can be called directly through /unsplash/<endpoint>. */
const PASSTHROUGH_ENDPOINTS = ['photos', 'collections', 'users', 'search'];

const toImage = (photo: UnsplashImage): Image => ({
	id: photo.id,
	provider: 'unsplash',
	width: photo.width,
	height: photo.height,
	description: photo.description ?? photo.alt_description,
	page: photo.links.html,
	urls: {
		raw: photo.urls.raw,
		full: photo.urls.full,
		regular: photo.urls.regular,
		small: photo.urls.small,
		thumb: photo.urls.thumb,
	},
	author: { name: photo.user.name, url: photo.user.links.html },
});

const request = <T>(path: string, query: Record<string, string | undefined>, env: Env) => {
	const search = new URLSearchParams({ client_id: env.UNSPLASH_ACCESS_KEY });
	for (const [key, value] of Object.entries(query)) {
		if (value) search.set(key, value);
	}
	return fetchJson<T>('Unsplash', `${API}/${path}?${search}`);
};

const filters = (params: Params) => ({ query: params.query, orientation: params.orientation });

export const unsplash: Provider = {
	id: 'unsplash',
	name: 'Unsplash',
	access: 'api',
	envKey: 'UNSPLASH_ACCESS_KEY',
	homepage: 'https://unsplash.com/developers',
	description: 'High-quality, freely usable photos from the Unsplash community.',
	params: [
		{
			name: 'Unsplash endpoints',
			description:
				'Any Unsplash API endpoint under <code>/unsplash/photos</code>, <code>/unsplash/collections</code>, <code>/unsplash/users</code> or <code>/unsplash/search</code> is passed straight through, with the original query parameters.',
		},
	],

	async random(params, env) {
		return toImage(await request<UnsplashImage>('photos/random', filters(params), env));
	},

	async search(params, env) {
		if (!params.query) {
			throw new HTTPException(400, { message: 'Unsplash search needs a query parameter' });
		}
		const result = await request<UnsplashImages>(
			'search/photos',
			{ ...filters(params), page: String(params.page), per_page: String(params.perPage) },
			env,
		);
		return {
			provider: 'unsplash',
			page: params.page,
			per_page: params.perPage,
			total: result.total,
			results: result.results.map(toImage),
		};
	},

	async photo(id, _params, env) {
		return toImage(await request<UnsplashImage>(`photos/${encodeURIComponent(id)}`, {}, env));
	},

	routes(app) {
		// Raw Unsplash API passthrough, e.g. /unsplash/photos/random?query=nature
		for (const endpoint of PASSTHROUGH_ENDPOINTS) {
			// `/x/*` also matches bare `/x`; for search that must fall through to the shared /search route.
			app.get(endpoint === 'search' ? '/search/:path{.+}' : `/${endpoint}/*`, async (c) => {
				const url = new URL(c.req.url);
				const type = getResponseType(url.searchParams.get('type') ?? undefined);
				url.searchParams.delete('type');
				url.searchParams.set('client_id', c.env.UNSPLASH_ACCESS_KEY);

				const path = url.pathname.replace(/^\/unsplash\//, '');
				const result = await fetchJson<UnsplashResponse>('Unsplash', `${API}/${path}?${url.searchParams}`);

				// Lists and search results only make sense as JSON.
				if (Array.isArray(result) || Array.isArray((result as UnsplashImages).results)) {
					return c.json(result);
				}

				const photo = result as UnsplashImage;
				let size = (url.searchParams.get('size') || 'full') as UrlType;
				if (photo.urls?.[size] === undefined) size = 'regular';

				switch (type) {
					case 'view':
						return c.redirect(photo.links.html, 302);
					case 'redirect':
						return c.redirect(photo.urls[size], 302);
					case 'image':
						return proxyImage(photo.urls[size]);
					default:
						return c.json(photo);
				}
			});
		}
	},
};
