import { clamp, fetchJson, notFound, pick, randomInt } from '../lib/http';
import type { Image, Orientation, Params, Provider } from './types';

const API = 'https://pixabay.com/api/';

type PixabayHit = {
	id: number;
	pageURL: string;
	tags: string;
	previewURL: string;
	webformatURL: string;
	largeImageURL: string;
	fullHDURL?: string;
	imageURL?: string;
	imageWidth: number;
	imageHeight: number;
	user: string;
	user_id: number;
};

type PixabayPage = { total: number; totalHits: number; hits: PixabayHit[] };

// Pixabay has no square filter, so `squarish` is ignored.
const ORIENTATIONS: Partial<Record<Orientation, string>> = { landscape: 'horizontal', portrait: 'vertical' };

export const toImage = (hit: PixabayHit): Image => ({
	id: String(hit.id),
	provider: 'pixabay',
	width: hit.imageWidth,
	height: hit.imageHeight,
	description: hit.tags || null,
	page: hit.pageURL,
	urls: {
		raw: hit.imageURL ?? hit.largeImageURL,
		full: hit.fullHDURL ?? hit.largeImageURL,
		regular: hit.largeImageURL,
		small: hit.webformatURL,
		thumb: hit.previewURL,
	},
	author: { name: hit.user, url: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` },
});

const request = (query: Record<string, string | undefined>, env: Env) => {
	const search = new URLSearchParams({ key: env.PIXABAY_API_KEY, image_type: 'photo', safesearch: 'true' });
	for (const [key, value] of Object.entries(query)) {
		if (value) search.set(key, value);
	}
	return fetchJson<PixabayPage>('Pixabay', `${API}?${search}`);
};

const listPage = (params: Params, page: number, perPage: number, env: Env) =>
	request(
		{
			q: params.query,
			orientation: params.orientation && ORIENTATIONS[params.orientation],
			category: params.raw.get('category') ?? undefined,
			colors: params.raw.get('colors') ?? undefined,
			page: String(page),
			per_page: String(perPage),
		},
		env,
	);

export const pixabay: Provider = {
	id: 'pixabay',
	name: 'Pixabay',
	access: 'api',
	envKey: 'PIXABAY_API_KEY',
	homepage: 'https://pixabay.com/api/docs/',
	description: 'Royalty-free photos from Pixabay.',
	params: [
		{
			name: 'category',
			description: 'Pixabay category, e.g. <code>nature</code>, <code>animals</code>, <code>travel</code>.',
		},
		{ name: 'colors', description: 'Comma-separated colour filter, e.g. <code>blue,grayscale</code>.' },
	],

	async random(params, env) {
		// Pixabay has no random endpoint and caps results at 500, so pick from one of the first pages.
		const result = await listPage(params, randomInt(1, 5), 50, env);
		const hits = result.hits.length ? result.hits : (await listPage(params, 1, 50, env)).hits;
		return toImage(pick(hits) ?? notFound('Pixabay'));
	},

	async search(params, env) {
		const perPage = clamp(params.perPage, 3, 200);
		const result = await listPage(params, params.page, perPage, env);
		return {
			provider: 'pixabay',
			page: params.page,
			per_page: perPage,
			total: result.totalHits,
			results: result.hits.map(toImage),
		};
	},

	async photo(id, _params, env) {
		const result = await request({ id }, env);
		return toImage(result.hits[0] ?? notFound('Pixabay'));
	},
};
