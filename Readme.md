# Image Worker

A Cloudflare Worker built with [Hono](https://hono.dev) that fetches images from several free photo providers behind one API.

## Providers

| Id          | Provider                                    | Access  | Env var               |
| ----------- | ------------------------------------------- | ------- | --------------------- |
| `unsplash`  | [Unsplash](https://unsplash.com/developers) | API key | `UNSPLASH_ACCESS_KEY` |
| `pexels`    | [Pexels](https://www.pexels.com/api/)       | API key | `PEXELS_API_KEY`      |
| `pixabay`   | [Pixabay](https://pixabay.com/api/docs/)    | API key | `PIXABAY_API_KEY`     |
| `picsum`    | [Lorem Picsum](https://picsum.photos)       | Open    | none                  |
| `openverse` | [Openverse](https://openverse.org)          | Open    | none                  |

Open providers are always on. An API provider is enabled only when its key is set. Without the key it is left off the docs page and `/providers`, and its routes return 404.

## Routes

| Route                    | Description                                   |
| ------------------------ | --------------------------------------------- |
| `/`                      | Docs page, listing the available providers    |
| `/providers`             | Available providers as JSON                   |
| `/{provider}/random`     | A random image                                |
| `/{provider}/search`     | Search results as JSON, same shape everywhere |
| `/{provider}/photos/:id` | A single image by id                          |

Shared query parameters: `query` (or `q`), `orientation` (`landscape`, `portrait`, `squarish`), `page`, `per_page`, `size` (`raw`, `full`, `regular`, `small`, `thumb`) and `type` (`image`, `json`, `view`, `redirect`).

The original Unsplash passthrough still works: `/unsplash/photos/...`, `/unsplash/collections/...`, `/unsplash/users/...` and `/unsplash/search/...` forward to the [Unsplash API](https://unsplash.com/documentation) with your query parameters.

## Configuration

Copy `.dev.vars.example` to `.dev.vars` for local development and fill in the keys you have. In production, set them as secrets:

```bash
npx wrangler secret put PEXELS_API_KEY
```

## Development

```bash
yarn install
yarn dev        # run locally
yarn test       # run tests
yarn typecheck
yarn deploy
```
