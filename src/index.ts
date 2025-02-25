import docs from './docs.html';
import icon from './favicon.png';

/**
 * @typedef {Object} Env
 */

export default {
	/**
	 * @param {Request} request
	 * @param {Env & Record<string, string>} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/favicon.ico') {
			return new Response(icon, {
				headers: {
					'content-type': 'image/png',
				},
			});
		}

		try {
			const preferredResponseType = url.searchParams.get('type') as ResponseType;
			url.searchParams.delete('type');

			if (request.method !== 'GET') {
				return new Response('Method Not Allowed', {
					status: 405,
					headers: {
						'content-type': 'text/plain',
					},
				});
			}

			if (url.pathname.startsWith('/unsplash/') && checkCorrectUnsplashEndpoint(url.pathname)) {
				let path = url.pathname;

				// Remove the /unsplash/ prefix from start of path
				path = path.replace('/unsplash/', '');

				url.searchParams.set('client_id', env.UNSPLASH_ACCESS_KEY);

				return getUnsplashImage(path, url.searchParams, preferredResponseType);
			}

			return new Response(docs, {
				headers: {
					'content-type': 'text/html',
				},
			});
		} catch (error) {
			return new Response(JSON.stringify(error), {
				status: 500,
				headers: {
					'content-type': 'application/json',
				},
			});
		}
	},
};

const getUnsplashImage = async (path: string, params: URLSearchParams, type: ResponseType) => {
	const unsplashResponse = await fetch(`https://api.unsplash.com/${path}?${params.toString()}`);
	const unsplashResult: UnsplashResponse | ErrorResponse = await unsplashResponse.json();

	if (unsplashResult?.errors) {
		return new Response(JSON.stringify(unsplashResult), {
			status: 400,
			headers: {
				'content-type': 'application/json',
			},
		});
	}

	if (type === 'json') {
		return new Response(JSON.stringify(unsplashResult), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}

	if (type === 'view') {
		return Response.redirect(unsplashResult.links.html, 301);
	}

	if (type === 'redirect') {
		return Response.redirect(unsplashResult.urls.full, 301);
	}

	const unsplashImageResponse = await fetch(unsplashResult.urls.regular);
	const unsplashImageBuffer = await unsplashImageResponse.arrayBuffer();
	const unsplashImage = new Uint8Array(unsplashImageBuffer);

	return new Response(unsplashImage, {
		headers: {
			'content-type': unsplashImageResponse.headers.get('content-type') || 'image/jpeg',
		},
	});
};

const checkCorrectUnsplashEndpoint = (path: string): boolean => {
	const unsplashEndpoints = ['/unsplash/photos', '/unsplash/collections', '/unsplash/users', '/unsplash/search'];

	return unsplashEndpoints.some((endpoint) => path.startsWith(endpoint));
};
