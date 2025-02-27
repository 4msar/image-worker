export const getUnsplashImage = async (path: string, params: URLSearchParams, type: ResponseType) => {
	const unsplashResponse = await fetch(`https://api.unsplash.com/${path}?${params.toString()}`);
	const result: UnsplashResponse | ErrorResponse = await unsplashResponse.json();

	let unsplashResult = result as UnsplashResponse;
	let errorResponse = result as ErrorResponse;

	if (errorResponse?.errors) {
		return new Response(JSON.stringify(unsplashResult), {
			status: 400,
			headers: {
				'content-type': 'application/json',
			},
		});
	}

	if (Array.isArray(unsplashResult) || Array.isArray((unsplashResult as UnsplashImages)?.results)) {
		return new Response(JSON.stringify(unsplashResult), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}

	unsplashResult = result as UnsplashImage;

	let size: UrlType = (params.get('size') || 'full') as UrlType;
	if (unsplashResult?.urls?.[size] === undefined) {
		size = 'regular';
	}

	if (type === 'view') {
		return Response.redirect(unsplashResult.links.html, 301);
	} else if (type === 'redirect') {
		return Response.redirect(unsplashResult.urls[size], 301);
	} else if (type === 'image') {
		const unsplashImageResponse = await fetch(unsplashResult.urls[size]);
		const unsplashImageBuffer = await unsplashImageResponse.arrayBuffer();
		const unsplashImage = new Uint8Array(unsplashImageBuffer);

		return new Response(unsplashImage, {
			headers: {
				'content-type': unsplashImageResponse.headers.get('content-type') || 'image/jpeg',
			},
		});
	}

	return new Response(JSON.stringify(unsplashResult), {
		headers: {
			'content-type': 'application/json',
		},
	});
};

export const checkCorrectUnsplashEndpoint = (path: string): boolean => {
	const unsplashEndpoints = ['/unsplash/photos', '/unsplash/collections', '/unsplash/users', '/unsplash/search'];

	return unsplashEndpoints.some((endpoint) => path.startsWith(endpoint));
};
