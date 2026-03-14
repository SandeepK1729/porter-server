# Multi-tenant Proxy (Next.js)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

It acts as a **multi-tenant proxy server** for the Porter ecosystem: it forwards **multi-domain** traffic to the appropriate upstream service based on **subdomain/path routing rules**.

---

## What it does

Today, this proxy implements a simple rule:

- Incoming request host: `abc.localhost:3000`
- Redirect domain (env): `NEXT_PUBLIC_REDIRECT_DOMAIN=localhost:3000`
- Forward target becomes: `localhost:3000/abc`

In other words, it forwards traffic to the single configured redirect domain, and uses the **subdomain as the first path segment**.

### Example

If your request is:

```text
GET http://abc.localhost:3000/some/page?x=1
```

And you have:

```env
NEXT_PUBLIC_REDIRECT_DOMAIN=localhost:3000
```

Then the proxy forwards to:

```text
http://localhost:3000/abc/some/page?x=1
```

---

## Roadmap / future behavior

In the future, the proxy may support **multiple redirect domains** based on configurable rules such as:

- subdomain patterns
- path patterns
- tenant allowlists/denylists
- custom mapping tables (tenant → upstream)
- weighted routing / fallbacks

Example of a future rule set:

- `abc.localhost:3000` → `localhost:3000/abc`
- `xyz.localhost:3000` → `localhost:4000/xyz`

---

## Getting started

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm / pnpm / yarn

### Install

```bash
npm install
```

### Configure environment variables

Create a `.env.local` file:

```env
# Upstream base domain the proxy forwards to (current single-domain behavior)
NEXT_PUBLIC_REDIRECT_DOMAIN=localhost:3000
```

> Note: `NEXT_PUBLIC_*` variables are exposed to the browser in Next.js.  
> If this value is only needed server-side, consider renaming it later to a non-`NEXT_PUBLIC_` env var (e.g. `REDIRECT_DOMAIN`) and reading it only in server runtime code.

### Run dev server

```bash
npm run dev
```

Open:

- http://localhost:3000

---

## How to test locally (subdomains on localhost)

To test requests like `abc.localhost:3000`, you can use the fact that many environments resolve `*.localhost` to `127.0.0.1`.

Try:

- http://abc.localhost:3000
- http://xyz.localhost:3000

If your OS/browser does not resolve subdomains of `localhost` automatically, alternatives include:

- adding entries to your hosts file, or
- using a local DNS tool, or
- using something like `lvh.me` (resolves wildcard subdomains to localhost)

---

## Scripts

```bash
npm run dev      # start Next.js in dev mode
npm run build    # production build
npm run start    # run production server
npm run lint     # lint
```

---

## Notes / design intent

- **Multi-tenant**: tenants are identified by host subdomain (e.g. `abc` in `abc.localhost:3000`)
- **Simple mapping today**: everything goes to a single upstream domain with `/{tenant}` prefix
- **Extensible later**: mapping rules can evolve without changing tenant URLs

---

## License

MIT (or your project’s license)