# Start Page

A customizable, minimal start page for your browser. Features a clock, weather widget, Google search with live autocomplete, Google Apps launcher, and a customizable grid of link groups — all wrapped in an Apple-inspired liquid glass design.

Hosted on **Cloudflare Workers** with **Cloudflare KV** for syncing across devices.

## Features

- **Link Groups:** Organize sites into groups and lists with drag-and-drop reordering.
- **Sections:** Group your cards by category (e.g., "Clients", "Tools") with colored tint overlays.
- **Live Search:** Google autocomplete + instant search across all your saved links, URLs, and group names.
- **Sync Across Devices:** Data stored in Cloudflare KV — same layout everywhere you're logged in.
- **Google Apps Launcher:** Quick access to Google services with official icons.
- **Branded Groups:** Fetch brand colors, logos, and banners via Brandfetch API (key set in Settings).
- **Header Colors:** Set custom header colors on non-branded groups.
- **Wallpaper Picker:** Choose from presets or set a custom image URL.
- **Typography:** Customize fonts and weights for clock, date, and links.
- **Import/Export:** Download or upload your data as JSON.
- **Privacy:** Hide all content when logged out — only the sign-in button shows.
- **Responsive:** Full-screen edit modal with iOS-style tab bar on mobile.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Hosting:** Cloudflare Workers + Static Assets
- **Storage:** Cloudflare KV
- **Auth:** Server-side Google OAuth → JWT (HS256) in httpOnly cookie (7-day expiry)
- **Design:** Liquid glass aesthetic — backdrop-filter, system fonts, Apple HIG-inspired

## Setup

### Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
2. [Node.js](https://nodejs.org/) installed
3. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed

### 1. Clone & Install

```bash
git clone https://github.com/csullivan145/Start_page.git
cd Start_page
npm install
```

### 2. Create a KV Namespace

```bash
wrangler kv namespace create START_PAGE_DATA
```

Copy the `id` from the output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "START_PAGE_DATA"
id = "your-namespace-id-here"
```

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **Google Auth Platform → Branding** — configure the consent screen.
3. **Audience** — set publishing status to **Production** (or add your email as a test user).
4. **Clients** → **Create Client** (Web Application).
5. Add your domain to **Authorized JavaScript origins** (e.g., `https://yourdomain.com`).
6. Add `https://yourdomain.com/api/auth/callback` to **Authorized redirect URIs**.
7. Copy the **Client ID** and **Client Secret**.

### 4. Set Secrets

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI
wrangler secret put JWT_SECRET
```

When prompted:
- `GOOGLE_CLIENT_ID` — from step 3
- `GOOGLE_CLIENT_SECRET` — from step 3
- `GOOGLE_REDIRECT_URI` — `https://yourdomain.com/api/auth/callback`
- `JWT_SECRET` — generate with `openssl rand -base64 32`

### 5. Update wrangler.toml

Edit `wrangler.toml` and set your domain:

```toml
routes = [
  { pattern = "yourdomain.com", custom_domain = true }
]
```

### 6. Deploy

```bash
npm run deploy
```

### 7. First Login

1. Visit your domain and click the Google sign-in button.
2. After signing in, open **Settings → Account** and set your email in **Allowed Emails**.
3. Click **Save** — now only your email can edit the page.

### 8. Brandfetch API (Optional)

To use branded group headers with auto-fetched logos and colors:

1. Get a free API key at [brandfetch.com](https://brandfetch.com).
2. Go to **Settings → Account → Brandfetch API**.
3. Enter your **API Key** and **Client ID**.
4. Save — keys sync across devices via KV.

## Local Development

```bash
npm run dev
```

This runs `wrangler dev` on port 8788. For Google sign-in locally, create a **`.dev.vars`** file (gitignored):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/callback
JWT_SECRET=any-random-string
```

Add `http://localhost:8788` to **Authorized JavaScript origins** and `http://localhost:8788/api/auth/callback` to **Authorized redirect URIs** in Google Cloud Console.

## Settings

Settings are in a tabbed sidebar panel:

| Tab | Controls |
|-----|----------|
| **Appearance** | Wallpaper, layout mode, typography, sections manager |
| **Google Apps** | Toggle which apps appear in the launcher |
| **Account** | Allowed emails, hide-when-logged-out, Brandfetch API keys |
| **Data** | Import/Export JSON, reset defaults |

## Project Structure

```
public/                     — Static assets (served by Worker)
  index.html                — Main entry point
  styles.css                — All styling (liquid glass design)
  script.js                 — Frontend logic, auth, search, settings
  default_data.js           — Fallback data when KV is empty
  favicon.svg               — Glass grid favicon
worker/
  index.js                  — Worker entry point (API router)
functions/                  — Route handlers (imported by worker)
  lib/
    jwt.js                  — JWT signing/verification (HS256)
    auth.js                 — Cookie parsing, getAuthUser helper
    cookies.js              — Set-Cookie builder
    kv.js                   — KV binding helper
    oauth_env.js            — OAuth credential loading
  api/
    auth/
      login.js              — Redirects to Google OAuth
      callback.js           — Exchanges code, sets JWT cookie
      me.js                 — Returns current user from cookie
      logout.js             — Clears JWT cookie
      config.js             — Returns OAuth config status
    data.js                 — GET/PUT app data (KV)
    auth_setup.js           — PUT allowed emails (KV)
    suggest.js              — Google autocomplete proxy
    brandfetch_config.js    — Legacy Brandfetch endpoint
wrangler.toml               — Worker configuration
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `invalid_client` on login | Wrong Client ID — check `wrangler secret list` matches Google Console. |
| "OAuth client was deleted" | Create a new client in Google Cloud Console. |
| "Access blocked" | Consent screen not configured or in Testing mode. |
| Buttons visible when logged out | Hard refresh (`Cmd+Shift+R`). CSS may be cached. |
| Branded groups not working | Add Brandfetch keys in Settings → Account. |
| Weather not loading | Browser blocking geolocation — falls back to NYC. |
| Search autocomplete empty | `/api/suggest` needs the Worker deployed (not just static files). |
| Changes not showing on mobile | Clear site data in browser settings, or try incognito. |

## License

Personal use.
