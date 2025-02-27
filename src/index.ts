import docs from './docs.html';
import { getUnsplashImage, checkCorrectUnsplashEndpoint } from './utils';

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

				return getUnsplashImage(path, url.searchParams, preferredResponseType ?? 'image');
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
