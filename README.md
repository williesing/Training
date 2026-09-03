# Snip

Snip is a tiny URL shortener demonstrating one backend with two very different
clients: a browser UI and a terminal CLI. Each layer is maintained on its own
branch and mounted here as a Git submodule.

## Layout

| Branch | Submodule | Technology |
| --- | --- | --- |
| `backend` | `backend/` | Zero-dependency Bun API |
| `frontend` | `frontend/` | Angular 19 web app |
| `cli` | `cli/` | Zero-dependency Node 20+ CLI |

Clone the complete project (plain clones leave submodule directories empty):

```sh
git clone --recurse-submodules https://github.com/williesing/Training snip-demo
```

## API contract

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201 { code, url, shortUrl, hits, createdAt }`; `400` for invalid input |
| `GET` | `/api/links` | — | `200` array of links |
| `GET` | `/:code` | — | `302` redirect and incremented hit count; `404` if unknown |

Links are stored in an in-memory map and disappear when the backend restarts.

## Run

Start the backend:

```sh
cd backend
bun start
```

In another terminal, start the Angular UI at port 4200:

```sh
cd frontend
npm install
npx ng serve
```

Use the CLI from a third terminal:

```sh
cd cli
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
```

## Updating a layer

Commit and push changes from inside the relevant submodule first:

```sh
cd backend
git add -A
git commit -m "Describe the backend change"
git push
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Use the same workflow for `frontend` or `cli`. The superproject stores a
pointer to a specific commit on each layer branch.

## Generated bundle

Build the release submodule from the latest backend, frontend, and CLI branch
tips:

```sh
node scripts/build-bundle.mjs
node scripts/build-bundle.mjs --push
```

The generated `bundle/` submodule serves the UI and API from one Bun process.
Do not hand-edit its contents.
