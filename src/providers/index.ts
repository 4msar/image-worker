import { openverse } from './openverse';
import { pexels } from './pexels';
import { picsum } from './picsum';
import { pixabay } from './pixabay';
import type { Provider } from './types';
import { unsplash } from './unsplash';

export const providers: Provider[] = [unsplash, pexels, pixabay, picsum, openverse];

/** Open providers are always available; API providers only once their key is set. */
export const isConfigured = (provider: Provider, env: Env): boolean =>
	provider.access === 'open' || Boolean(provider.envKey && env[provider.envKey]);

export const availableProviders = (env: Env): Provider[] => providers.filter((provider) => isConfigured(provider, env));
