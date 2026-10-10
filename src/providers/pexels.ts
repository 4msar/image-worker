import { clamp, fetchJson, notFound, pick, randomInt } from '../lib/http';
import type { Image, Orientation, Params, Provider } from './types';

const API = 'https://api.pexels.com/v1';

type PexelsPhoto = {
	id: number;
	width: number;
	height: number;
	url: string;
	alt: string | null;
	photographer: string;
	photographer_url: string;
	src: Record<'original' | 'large2x' | 'large' | 'medium' | 'small' | 'tiny', string>;
};

type PexelsPage = { page: number; per_page: number; total_results: number; photos: PexelsPhoto[] };

const ORIENTATIONS: Record<Orientation, string> = { landscape: 'landscape', portrait: 'portrait', squarish: 'square' };

export const toImage = (photo: PexelsPhoto): Image => ({
	id: String(photo.id),
	provider: 'pexels',
	width: photo.width,
	height: photo.height,
	description: photo.alt || null,
	page: photo.url,
	urls: {
		raw: photo.src.original,
		full: photo.src.large2x,
		regular: photo.src.large,
		small: photo.src.medium,
		thumb: photo.src.small,
	},
	author: { name: photo.photographer, url: photo.photographer_url },
});

const request = <T>(path: string, query: Record<string, string | undefined>, env: Env) => {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value) search.set(key, value);
	}
	return fetchJson<T>('Pexels', `${API}/${path}?${search}`, { headers: { authorization: env.PEXELS_API_KEY } });
};

// Without a query Pexels has no search, so fall back to its curated feed.
const listPage = (params: Params, page: number, perPage: number, env: Env) =>
	params.query
		? request<PexelsPage>(
				'search',
				{
					query: params.query,
					orientation: params.orientation && ORIENTATIONS[params.orientation],
					page: String(page),
					per_page: String(perPage),
				},
				env,
			)
		: request<PexelsPage>('curated', { page: String(page), per_page: String(perPage) }, env);

export const pexels: Provider = {
	id: 'pexels',
	name: 'Pexels',
	access: 'api',
	envKey: 'PEXELS_API_KEY',
	homepage: 'https://www.pexels.com/api/',
	description:
		'Free stock photos shared by the Pexels community. Without a query, results come from the curated feed.',

	async random(params, env) {
		// Pexels has no random endpoint: pick from a random page, falling back to the first one.
		const result = await listPage(params, randomInt(1, 10), 30, env);
		const photos = result.photos.length ? result.photos : (await listPage(params, 1, 30, env)).photos;
		return toImage(pick(photos) ?? notFound('Pexels'));
	},

	async search(params, env) {
		const perPage = clamp(params.perPage, 1, 80);
		const result = await listPage(params, params.page, perPage, env);
		return {
			provider: 'pexels',
			page: params.page,
			per_page: perPage,
			total: result.total_results,
			results: result.photos.map(toImage),
		};
	},

	async photo(id, _params, env) {
		return toImage(await request<PexelsPhoto>(`photos/${encodeURIComponent(id)}`, {}, env));
	},
};
