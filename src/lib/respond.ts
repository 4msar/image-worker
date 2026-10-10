import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Image, Size } from '../providers/types';

const RESPONSE_TYPES: ResponseType[] = ['image', 'json', 'view', 'redirect'];
const SIZES: Size[] = ['raw', 'full', 'regular', 'small', 'thumb'];

export const getResponseType = (value: string | undefined): ResponseType =>
	RESPONSE_TYPES.includes(value as ResponseType) ? (value as ResponseType) : 'image';

export const getSize = (value: string | undefined): Size =>
	SIZES.includes(value as Size) ? (value as Size) : 'regular';

/** Stream an image from its source URL back to the client. */
export const proxyImage = async (url: string): Promise<Response> => {
	const upstream = await fetch(url);

	if (!upstream.ok || !upstream.body) {
		throw new HTTPException(502, { message: `Image source responded with ${upstream.status}` });
	}

	return new Response(upstream.body, {
		headers: {
			'content-type': upstream.headers.get('content-type') || 'image/jpeg',
		},
	});
};

/** Answer with an image in the format the client asked for via `type`. */
export const sendImage = (c: Context, image: Image, type: ResponseType, size: Size): Response | Promise<Response> => {
	const url = image.urls[size] ?? image.urls.regular;

	switch (type) {
		case 'json':
			return c.json(image);
		case 'view':
			return c.redirect(image.page, 302);
		case 'redirect':
			return c.redirect(url, 302);
		case 'image':
			return proxyImage(url);
	}
};
