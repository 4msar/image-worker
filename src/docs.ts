import template from './docs.html';
import type { Provider } from './providers/types';

const listNames = (names: string[]) =>
	names.length <= 1 ? (names[0] ?? 'free photo providers') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const renderParams = (provider: Provider) =>
	provider.params?.length
		? `<div class="table-wrap"><table><thead><tr><th>Extra parameter</th><th>Description</th></tr></thead><tbody>${provider.params
				.map((param) => `<tr><td><code>${param.name}</code></td><td>${param.description}</td></tr>`)
				.join('')}</tbody></table></div>`
		: '';

const renderProvider = (provider: Provider) => `
				<article class="provider" id="provider-${provider.id}">
					<div class="provider-head">
						<h3>${provider.name}</h3>
						<code>${provider.id}</code>
						<span class="access ${provider.access}">${provider.access === 'open' ? 'Open' : 'API key'}</span>
					</div>
					<p>${provider.description} <a target="_blank" rel="noopener" href="${provider.homepage}">Website&nbsp;&rarr;</a></p>
					${renderParams(provider)}
					<div class="provider-links">
						<a href="/${provider.id}/random">/${provider.id}/random</a>
						<a href="/${provider.id}/search?query=nature">/${provider.id}/search?query=nature</a>
					</div>
				</article>`;

const escapeAttribute = (value: string) =>
	value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const jsonLd = (origin: string, description: string, providers: Provider[]) =>
	JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebAPI',
		name: 'Image API',
		description,
		url: `${origin}/`,
		documentation: `${origin}/`,
		isAccessibleForFree: true,
		provider: { '@type': 'Person', name: 'Saiful Alam Rakib', url: 'https://msar.me' },
		mentions: providers.map((provider) => ({ '@type': 'WebSite', name: provider.name, url: provider.homepage })),
	}).replaceAll('<', '\\u003c');

/** Docs page listing only the providers that are available. Provider fields are trusted, static HTML. */
export const renderDocs = (providers: Provider[], origin: string): string => {
	const names = listNames(providers.map((provider) => provider.name));
	const description = `Free image API: fetch photos from ${names} as an image, JSON, redirect or browser view with one simple URL. No API key needed.`;

	return template
		.replaceAll('{{ORIGIN}}', escapeAttribute(origin))
		.replaceAll('{{DESCRIPTION}}', escapeAttribute(description))
		.replaceAll('{{PROVIDER_KEYWORDS}}', escapeAttribute(providers.map((provider) => provider.name).join(', ')))
		.replace('{{JSON_LD}}', jsonLd(origin, description, providers))
		.replaceAll('{{PROVIDER_COUNT}}', String(providers.length))
		.replaceAll('{{PROVIDER_NAMES}}', names)
		.replaceAll('{{EXAMPLE}}', providers[0]?.id ?? 'picsum')
		.replace('{{PROVIDERS}}', `<div class="providers">${providers.map(renderProvider).join('')}</div>`);
};
