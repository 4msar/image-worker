import type { Hono } from 'hono';

export type AppEnv = { Bindings: Env };

export type Access = 'open' | 'api';

export type Size = 'raw' | 'full' | 'regular' | 'small' | 'thumb';

export type Orientation = 'landscape' | 'portrait' | 'squarish';

export type Image = {
	id: string;
	provider: string;
	width: number | null;
	height: number | null;
	description: string | null;
	/** Page on the provider's site for this image. */
	page: string;
	urls: Partial<Record<Size, string>> & { regular: string };
	author: { name: string | null; url: string | null };
	license?: { name: string; url: string | null };
};

export type SearchResult = {
	provider: string;
	page: number;
	per_page: number;
	total: number | null;
	results: Image[];
};

export type Params = {
	query?: string;
	orientation?: Orientation;
	page: number;
	perPage: number;
	/** All query parameters from the request, for provider-specific options. */
	raw: URLSearchParams;
};

export type DocsParam = { name: string; description: string };

export interface Provider {
	id: string;
	name: string;
	access: Access;
	homepage: string;
	description: string;
	/** Env var holding the API key. Only set when `access` is `api`. */
	envKey?: keyof Env;
	/** Provider-specific query parameters, listed on the docs page. */
	params?: DocsParam[];
	random(params: Params, env: Env): Promise<Image>;
	search(params: Params, env: Env): Promise<SearchResult>;
	photo(id: string, params: Params, env: Env): Promise<Image>;
	/** Extra routes, registered before the shared /random, /search and /photos/:id routes. */
	routes?(app: Hono<AppEnv>): void;
}
