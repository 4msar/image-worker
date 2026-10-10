import { clamp, fetchJson, notFound, pick, randomInt } from '../lib/http';
import type { Image, Orientation, Params, Provider } from './types';

const API = 'https://api.openverse.org/v1/images';

type OpenverseImage = {
	id: string;
	title: string | null;
	foreign_landing_url: string;
	url: string;
	thumbnail: string;
	creator: string | null;
	creator_url: string | null;
	license: string;
	license_version: string | null;
	license_url: string | null;
	width: number | null;
	height: number | null;
};

type OpenversePage = { result_count: number; page: number; page_size: number; results: OpenverseImage[] };

const ASPECT_RATIOS: Record<Orientation, string> = { landscape: 'wide', portrait: 'tall', squarish: 'square' };

export const toImage = (image: OpenverseImage): Image => ({
	id: image.id,
	provider: 'openverse',
	width: image.width,
	height: image.height,
	description: image.title,
	page: image.foreign_landing_url,
	urls: {
		raw: image.url,
		full: image.url,
		regular: image.url,
		small: image.thumbnail,
		thumb: image.thumbnail,
	},
	author: { name: image.creator, url: image.creator_url },
	license: {
		name: `${image.license.toUpperCase()} ${image.license_version ?? ''}`.trim(),
		url: image.license_url,
	},
});

const listPage = (params: Params, page: number, pageSize: number) => {
	const search = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
	if (params.query) search.set('q', params.query);
	if (params.orientation) search.set('aspect_ratio', ASPECT_RATIOS[params.orientation]);
	for (const key of ['license', 'license_type', 'source']) {
		const value = params.raw.get(key);
		if (value) search.set(key, value);
	}
	return fetchJson<OpenversePage>('Openverse', `${API}/?${search}`);
};

export const openverse: Provider = {
	id: 'openverse',
	name: 'Openverse',
	access: 'open',
	homepage: 'https://openverse.org',
	description: 'Openly licensed images from WordPress Openverse, no API key needed. Anonymous use is rate limited.',
	params: [
		{ name: 'license', description: 'Comma-separated licenses, e.g. <code>cc0,by</code>.' },
		{ name: 'license_type', description: '<code>commercial</code> and/or <code>modification</code>.' },
		{ name: 'source', description: 'Comma-separated sources, e.g. <code>flickr,wikimedia</code>.' },
	],

	async random(params) {
		// Anonymous requests can page through the first 240 results; pick from a random page of 20.
		const result = await listPage(params, randomInt(1, 10), 20);
		const images = result.results.length ? result.results : (await listPage(params, 1, 20)).results;
		return toImage(pick(images) ?? notFound('Openverse'));
	},

	async search(params) {
		const pageSize = clamp(params.perPage, 1, 20);
		const result = await listPage(params, params.page, pageSize);
		return {
			provider: 'openverse',
			page: params.page,
			per_page: pageSize,
			total: result.result_count,
			results: result.results.map(toImage),
		};
	},

	async photo(id) {
		return toImage(await fetchJson<OpenverseImage>('Openverse', `${API}/${encodeURIComponent(id)}/`));
	},
};
