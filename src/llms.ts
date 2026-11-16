import type { Provider } from './providers/types';

const renderProvider = (origin: string, provider: Provider) => {
	const lines = [
		`### ${provider.name} (\`${provider.id}\`)`,
		'',
		`${provider.description} Website: ${provider.homepage}`,
		'',
		`- [Random image](${origin}/${provider.id}/random): \`GET /${provider.id}/random\``,
		`- [Search](${origin}/${provider.id}/search?query=nature): \`GET /${provider.id}/search?query=...\``,
		`- Single image: \`GET /${provider.id}/photos/{id}\``,
	];
	if (provider.params?.length) {
		lines.push(
			'',
			'Extra parameters:',
			...provider.params.map((param) => `- \`${param.name}\`: ${param.description}`),
		);
	}
	return lines.join('\n');
};

/** llms.txt (https://llmstxt.org) describing the API for LLMs, listing only the available providers. */
export const renderLlms = (providers: Provider[], origin: string): string => {
	const example = providers[0]?.id ?? 'picsum';

	return `# Image API

> Free image API with no API key needed. Fetch photos from ${providers.length} free photo providers through one URL scheme, and get each one back as image bytes, JSON, a redirect to the image or a redirect to its page on the provider's site. All routes are GET, and CORS is open to every origin.

## Routes

- [Docs](${origin}/): Human-readable docs page
- [Providers](${origin}/providers): Available providers as JSON, with their routes
- \`GET /{provider}/random\`: A random image
- \`GET /{provider}/search\`: Search results as JSON, same shape for every provider
- \`GET /{provider}/photos/{id}\`: A single image by id

## Query parameters

- \`query\` (or \`q\`): Search terms; on \`/random\` it narrows the pick where the provider supports it
- \`orientation\`: \`landscape\`, \`portrait\` or \`squarish\`
- \`page\`: Page number, from 1
- \`per_page\`: Results per page, 1 to 200 (default 10)
- \`size\`: \`raw\`, \`full\`, \`regular\` (default), \`small\` or \`thumb\`
- \`type\`: \`image\` (default, image bytes), \`json\`, \`view\` (redirect to the provider page) or \`redirect\` (redirect to the image URL)

## Response shapes

Image (\`type=json\`):

\`\`\`json
{
  "id": "string",
  "provider": "string",
  "width": 1920,
  "height": 1080,
  "description": "string | null",
  "page": "https://provider.example/photo",
  "urls": { "raw": "...", "full": "...", "regular": "...", "small": "...", "thumb": "..." },
  "author": { "name": "string | null", "url": "string | null" },
  "license": { "name": "string", "url": "string | null" }
}
\`\`\`

Search: \`{ "provider", "page", "per_page", "total", "results": Image[] }\`

Errors: \`{ "error": "message" }\` with a matching HTTP status.

## Examples

- ${origin}/${example}/random
- ${origin}/${example}/random?type=json&size=small
- ${origin}/${example}/search?query=mountains&per_page=5

## Providers

${providers.map((provider) => renderProvider(origin, provider)).join('\n\n')}
`;
};
