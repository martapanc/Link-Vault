# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn install   # Install dependencies
yarn dev       # Start dev server (http://localhost:3000)
yarn build     # Production build
yarn start     # Run production build
```

No linting or test scripts are configured.

## Architecture

Link Vault is a Next.js 15 (App Router) application. Users paste up to 20 URLs; the app archives them via Archive.org and shortens them via TinyURL, then displays results with copy and CSV export.

**Key files:**
- `app/page.tsx` — Client component (`"use client"`), full UI and state logic
- `app/api/process/route.ts` — POST Route Handler; calls `archiveUrl()` (Archive.org Save Page Now, 30s timeout) and `shortenUrl()` (TinyURL, 10s timeout) concurrently per URL via `Promise.all()`
- `lib/types.ts` — Shared `LinkResult` interface imported by both the page and the route
- `app/globals.css` — CSS custom properties (color palette, font variables, animations)
- `app/layout.tsx` — Root layout; loads IBM Plex Mono + Syne from Google Fonts

**Data flow:** Client POSTs `{ urls: string[] }` to `/api/process` → route processes all URLs in parallel → returns `{ results: LinkResult[] }` where each result has `status: "success" | "partial" | "error"`.
