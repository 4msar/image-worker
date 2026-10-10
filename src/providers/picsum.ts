import { clamp, fetchJson, notFound, pick, randomInt } from '../lib/http';
import type { Image, Params, Provider, Size } from './types';

const API = 'https://picsum.photos';

type PicsumPhoto = { id: string; author: string; width: number; height: number; url: string; download_url: string };

const WIDTHS: Record<Exclude<Size, 'raw'>, number> = { full: 1920, regular: 1080, small: 400, thumb: 200 };

/** Picsum renders any size on demand and supports `grayscale` and `blur` (1-10) filters. */
export const toImage = (photo: PicsumPhoto, raw: URLSearchParams): Image => {
	const blur = Number(raw.get('blur'));
	const filters = [raw.has('grayscale') && 'grayscale', blur && `blur=${clamp(blur, 1, 10)}`].filter(Boolean);
	const suffix = filters.length ? `?${filters.join('&')}` : '';

	const sized = (width: number) => {
		const w = Math.min(width, photo.width);
		const h = Math.round((w * photo.height) / photo.width);
		return `${API}/id/${photo.id}/${w}/${h}.jpg${suffix}`;
	};

	return {
		id: photo.id,
		provider: 'picsum',
		width: photo.width,
		height: photo.height,
		description: null,
		page: photo.url,
		urls: {
			raw: sized(photo.width),
			full: sized(WIDTHS.full),
			regular: sized(WIDTHS.regular),
			small: sized(WIDTHS.small),
			thumb: sized(WIDTHS.thumb),
		},
		author: { name: photo.author, url: null },
	};
};

const list = (page: number, limit: number) =>
	fetchJson<PicsumPhoto[]>('Picsum', `${API}/v2/list?page=${page}&limit=${limit}`);

export const picsum: Provider = {
	id: 'picsum',
	name: 'Lorem Picsum',
	access: 'open',
	homepage: 'https://picsum.photos',
	description:
		'Placeholder photos, no API key needed. Picsum has no search, so <code>query</code> and <code>orientation</code> are ignored.',
	params: [
		{ name: 'grayscale', description: 'Return the image in grayscale, e.g. <code>?grayscale</code>.' },
		{ name: 'blur', description: 'Blur the image, from <code>1</code> to <code>10</code>.' },
	],

	async random(params: Params) {
		// The catalogue holds roughly 1,000 photos: pick one from a random page of 100.
		const photos = await list(randomInt(1, 10), 100);
		return toImage(pick(photos) ?? notFound('Picsum'), params.raw);
	},

	async search(params: Params) {
		const perPage = clamp(params.perPage, 1, 100);
		const photos = await list(params.page, perPage);
		return {
			provider: 'picsum',
			page: params.page,
			per_page: perPage,
			total: null,
			results: photos.map((photo) => toImage(photo, params.raw)),
		};
	},

	async photo(id, params) {
		return toImage(await fetchJson<PicsumPhoto>('Picsum', `${API}/id/${encodeURIComponent(id)}/info`), params.raw);
	},
};
