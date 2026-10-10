import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const USER_AGENT = 'image-worker (+https://github.com/4msar/image-worker)';

/** Fetch JSON from an upstream API, turning upstream failures into HTTP errors. */
export const fetchJson = async <T>(provider: string, url: string, init: RequestInit = {}): Promise<T> => {
	const response = await fetch(url, {
		...init,
		headers: { 'user-agent': USER_AGENT, accept: 'application/json', ...init.headers },
	});

	if (!response.ok) {
		// Pass through client errors; anything else (bad key, upstream outage) is our gateway's problem.
		const status = ([400, 404, 429].includes(response.status) ? response.status : 502) as ContentfulStatusCode;
		throw new HTTPException(status, { message: `${provider} responded with ${response.status}` });
	}

	return response.json<T>();
};

export const notFound = (provider: string): never => {
	throw new HTTPException(404, { message: `No image found on ${provider}` });
};

export const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export const pick = <T>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
