# Link Vault

Paste URLs → get **permanent archive.org snapshots** + **TinyURL short links** in seconds.

## Features

- Submit up to 20 URLs per batch
- Permanently archives each URL to the [Wayback Machine](https://web.archive.org) (Save Page Now API)
- Generates a [TinyURL](https://tinyurl.com) short link for each URL
- One-click copy for any archive or short link
- Export all results as CSV
- Status per URL: `OK` / `PARTIAL` / `FAIL`

## Tech Stack

| Layer   | Tech                          |
|---------|-------------------------------|
| App     | Next.js 15 (App Router)       |
| Archive | archive.org Save Page Now API |
| Shorten | TinyURL free API              |

## Setup

```bash
yarn install
yarn dev     # http://localhost:3000
```

## Production

```bash
yarn build
yarn start
```

## API

### `POST /api/process`

**Body:**
```json
{ "urls": ["https://example.com", "https://another.org"] }
```

**Response:**
```json
{
  "results": [
    {
      "originalUrl": "https://example.com",
      "archiveUrl": "https://web.archive.org/web/20240101120000/https://example.com",
      "archiveError": null,
      "shortUrl": "https://tinyurl.com/abc123",
      "shortError": null,
      "status": "success"
    }
  ]
}
```

## Notes

- archive.org can be slow (up to 30s per URL) — the UI shows a progress indicator
- archive.org may rate-limit heavy usage; results are best-effort
- TinyURL's free API requires no authentication
