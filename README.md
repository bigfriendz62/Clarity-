# Clarity v2 — Career Decision AI

> Not an AI that decides. One that makes you sharper.

## What's New in v2
- ✅ 5 free decisions per month (then paywall)
- ✅ Free Pro taste unlocked after decision 3
- ✅ Star rating system after every session
- ✅ Upgrade / pricing modal with monthly & annual plans
- ✅ Usage bar on homepage
- ✅ "Go Pro" button in nav
- ✅ Decision history with ratings shown

## Quick Start

```bash
npm install
cp .env.example .env
# Add your API key to .env
npm run dev
```

Open http://localhost:5173

## Deploy to Vercel

```bash
npm install -g vercel
vercel
# Set VITE_ANTHROPIC_API_KEY when prompted
```

## Pricing Config (edit src/App.jsx top)

```js
const FREE_LIMIT = 5       // free decisions per month
const UNLOCK_AT  = 3       // show pro teaser after this many decisions
const PRICE_MONTHLY = 7    // USD
const PRICE_ANNUAL  = 49   // USD
```

## Next Steps
- [ ] Connect Stripe for real payments (replace alert in PaywallModal)
- [ ] Add image upload (Pro feature)
- [ ] Add voice input (Pro feature)
- [ ] Add backend to verify Pro status server-side
