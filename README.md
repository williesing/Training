# Snip backend

Snip is a tiny URL shortener powered by a dependency-free Bun server. Links
are stored in memory and are cleared when the process restarts.

## Run

```sh
bun start
```

The server listens on port 3000 by default. Set `PORT`, `BASE_URL`, or
`PUBLIC_DIR` to configure it.

## API

- `POST /api/links` with `{ "url": "https://example.com" }` creates a link.
- `GET /api/links` lists all links.
- `GET /:code` redirects to the original URL and increments its hit count.
