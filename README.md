# Start Page

A beautiful, customizable start page for your browser. Set it as your homepage and have all your important links, Google search, weather, and clock in one place.

Built with an Apple-inspired "liquid glass" design. Syncs across all your devices.

![Start Page](https://images.unsplash.com/photo-1460500063983-994d4c27756c?w=800&q=60)

## What You Get

- **Your links, organized** — Group your bookmarks into cards. Drag to reorder.
- **Google search** — With live autocomplete suggestions as you type, plus search across your own links.
- **Google Apps launcher** — Quick access to Gmail, Drive, Calendar, etc.
- **Branded groups** — Cards can auto-fetch brand colors and logos (optional, uses Brandfetch API).
- **Sections** — Color-code groups of cards (e.g., all client cards get a blue tint).
- **Custom backgrounds** — Pick from presets or use any image URL.
- **Custom fonts** — Change the clock, date, and link fonts.
- **Private** — Everything is hidden until you sign in with Google.
- **Synced** — Changes save to the cloud and show up on all your devices.

## How It's Built

This runs on [Cloudflare Workers](https://workers.cloudflare.com/) (free tier). Your data is stored in [Cloudflare KV](https://developers.cloudflare.com/kv/). Sign-in uses Google OAuth so only you can edit your page.

No frameworks. No build step. Just HTML, CSS, and JavaScript.

---

## Setup Guide

This will take about 15 minutes. You'll need:
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- A free [Google Cloud account](https://console.cloud.google.com/) (for sign-in)
- [Node.js](https://nodejs.org/) installed on your computer

### Step 1: Get the Code

Open your terminal and run:

```bash
git clone https://github.com/csullivan145/Start_page.git
cd Start_page
npm install
```

### Step 2: Log in to Cloudflare

```bash
npx wrangler login
```

This opens your browser. Sign in to Cloudflare and authorize Wrangler.

### Step 3: Create Storage

Your links and settings need a place to live. Run this to create a storage namespace:

```bash
npx wrangler kv namespace create START_PAGE_DATA
```

You'll see output like:

```
{ binding = "START_PAGE_DATA", id = "abc123def456..." }
```

**Copy that `id` value.** Open `wrangler.toml` and replace the existing ID:

```toml
[[kv_namespaces]]
binding = "START_PAGE_DATA"
id = "paste-your-id-here"
```

### Step 4: Set Up Google Sign-In

This lets you log in to edit your start page. Only you (or emails you allow) can make changes.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (call it anything, like "Start Page")
3. In the left sidebar, go to **Google Auth Platform → Branding**
   - Fill in the app name and your email
   - Click **Save**
4. Go to **Audience** (left sidebar)
   - Click **Publish App** (or add your email as a test user)
5. Go to **Clients** (left sidebar)
   - Click **+ Create Client**
   - Choose **Web application**
   - Under **Authorized JavaScript origins**, add: `https://yourdomain.com`
   - Under **Authorized redirect URIs**, add: `https://yourdomain.com/api/auth/callback`
   - Click **Create**
6. You'll see a **Client ID** and **Client Secret** — keep these handy

### Step 5: Add Your Secrets

Run each of these commands and paste the value when prompted:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
# Paste your Client ID from Step 4

npx wrangler secret put GOOGLE_CLIENT_SECRET
# Paste your Client Secret from Step 4

npx wrangler secret put GOOGLE_REDIRECT_URI
# Type: https://yourdomain.com/api/auth/callback

npx wrangler secret put JWT_SECRET
# Paste a random string — generate one with: openssl rand -base64 32
```

### Step 6: Set Your Domain

Open `wrangler.toml` and change the domain to yours:

```toml
routes = [
  { pattern = "yourdomain.com", custom_domain = true }
]
```

Your domain must already be added to your Cloudflare account (DNS managed by Cloudflare).

### Step 7: Deploy

```bash
npm run deploy
```

That's it! Visit your domain. You should see the start page with a Google sign-in button.

### Step 8: First Login

1. Click the **Google icon** (top right) to sign in
2. Click the **gear icon** to open Settings
3. Go to the **Account** tab
4. Enter your email in **Allowed Emails**
5. Click **Save**

Now only your email can edit the page. Anyone else will just see a sign-in button (or nothing, if you enable "Hide content when logged out").

---

## Optional: Branded Groups

Want your cards to show brand logos and colors? (e.g., a Google card with the Google banner)

1. Sign up at [brandfetch.com](https://brandfetch.com) (free tier available)
2. Get your **API Key** and **Client ID**
3. Go to **Settings → Account → Brandfetch API**
4. Enter both keys and save

Now when you edit a group and check "Branded", enter the company's domain (e.g., `google.com`) and it'll fetch their branding.

---

## Running Locally

Want to make changes and test before deploying?

```bash
npm run dev
```

This starts a local server at `http://localhost:8788`.

For Google sign-in to work locally, create a file called `.dev.vars` in the project root:

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/callback
JWT_SECRET=any-random-string-for-local-dev
```

Then add these to your Google OAuth client:
- **Authorized JavaScript origins:** `http://localhost:8788`
- **Authorized redirect URIs:** `http://localhost:8788/api/auth/callback`

---

## Settings

Click the gear icon (top right, visible after sign-in) to open Settings:

| Tab | What it does |
|-----|-------------|
| **Appearance** | Change wallpaper, layout, fonts, and manage sections |
| **Google Apps** | Choose which Google apps show in the launcher |
| **Account** | Set allowed emails, privacy mode, Brandfetch API keys |
| **Data** | Import/export your data as JSON, reset to defaults |

---

## Troubleshooting

**Can't sign in?**
- Make sure your Google OAuth consent screen is set to **Production** (not Testing)
- Check that your redirect URI matches exactly: `https://yourdomain.com/api/auth/callback`
- Run `npx wrangler secret list` to verify all 4 secrets are set

**Page looks broken or outdated?**
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Try incognito/private window
- On mobile: clear site data in browser settings

**Branded groups not working?**
- Add your Brandfetch API Key and Client ID in Settings → Account

**Weather shows NYC?**
- Your browser is blocking location access. Allow it in browser settings.

---

## Project Structure

```
public/                     Static files (HTML, CSS, JS)
worker/index.js             Worker entry point — routes API requests
functions/                  API route handlers
  lib/                      Shared utilities (JWT, cookies, KV, OAuth)
  api/auth/                 Google OAuth endpoints
  api/data.js               Read/write app data
  api/suggest.js            Google autocomplete proxy
  api/auth_setup.js         Manage allowed emails
wrangler.toml               Cloudflare Worker config
```

## License

Personal use.
