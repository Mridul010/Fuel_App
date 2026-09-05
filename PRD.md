# FuelRate — Product Requirements Document

**Version:** 2.0
**Owner:** Mridul
**Status:** Live (PWA, static hosting)

---

## 1. Problem

Indian fuel prices change daily and differ by city, sometimes by ₹10+ per litre across a
short drive. Existing sources are ad-heavy, slow, often stale, and rarely let you compare
cities side by side. Drivers near state or district borders have no easy way to answer:
*"is it cheaper to fill up here or 20 km away?"*

## 2. Goal

A fast, ad-free, offline-capable app that answers three questions in under five seconds:

1. What do petrol and diesel cost in my city today?
2. Is that above or below what I paid yesterday / what my state pays?
3. Where nearby is it cheaper?

## 3. Non-goals

- User accounts, logins, or any personal data collection.
- Pump-level (individual petrol station) pricing.
- Price predictions or forecasting.
- Native iOS/Android builds — the PWA is the app.
- Anything that costs money to run (see §9).

## 4. Target users

| Persona | Need |
|---|---|
| Daily commuter | Today's local rate, day-on-day change |
| Border-district driver | City comparison to pick the cheaper side |
| Fleet / delivery operator | Diesel trend across several cities |
| Curious reader | Tax breakdown and crude context |

## 5. Functional requirements

### 5.1 Prices (Home)
- Show petrol and diesel for the active city, in ₹ with 2 decimals.
- Show day-on-day change per fuel, derived from that city's own history.
- Active city resolves in this order: user's saved pick → geolocation-nearest city →
  first city in the dataset. The UI must never sit on "Detecting…" waiting for a
  permission prompt that is never answered.
- Show data freshness honestly: "today", "yesterday", or "N days ago".
- Manual refresh re-fetches `data/prices.js` bypassing the service worker cache.

### 5.2 Trend
- 7-day line chart per fuel for the active city, with day labels from the dataset.
- Petrol/diesel toggle; chart re-renders on theme change.

### 5.3 Compare
- Up to 4 cities side by side: petrol, diesel, and difference vs the active city.
- Highlight the cheapest and state the saving vs the most expensive.

### 5.4 Rates
- Active city petrol/diesel, LPG (14.2 kg) and CNG for the city's state.
- Delhi CNG as a national reference point.
- Global context: Brent crude, USD/INR.
- Indicative petrol tax breakdown (base, excise, VAT, dealer, transport).
- Any value that cannot be sourced or fails a sanity check renders as "—", never as a
  stale or implausible number.

### 5.5 Cities
- Searchable city picker by city or state name.
- Coverage: all 14 Kerala districts plus Mahe, Mangaluru, Bengaluru, Coimbatore,
  Chennai, Delhi, Mumbai, Kolkata, Hyderabad.

### 5.6 PWA
- Installable, works offline with the last known prices.
- Dark and light themes; the user's choice persists across visits.
- Network-first for code and data, cache-first for static assets, so an update reaches
  users on the next load rather than after a cache expiry.

## 6. Data pipeline

```
GitHub Actions (daily 06:30 IST)
  └─ scraper/scrape.js  (Puppeteer + Cheerio → goodreturns.in)
       ├─ petrol / diesel / LPG / CNG per city, multi-strategy extraction
       ├─ redirect + city-keyword validation (a page that isn't the city's is skipped)
       ├─ Brent crude with a plausibility band ($30–$200)
       └─ append one history point per calendar day (per city, 7-day window)
  └─ commit data/prices.js  →  GitHub Pages serves it statically
```

**Data integrity rules**
- Never overwrite a good value with a failed scrape — keep the previous day's number.
- Never accept a price from a page whose title/H1 does not name the city.
- One history entry per IST calendar day; re-runs on the same day overwrite, not append.

## 7. Non-functional requirements

- **Speed:** first contentful paint under 1.5 s on 4G; prices are inlined static JS, no
  runtime API calls.
- **Size:** no framework, no build step. Vanilla HTML/CSS/JS.
- **Offline:** full app usable offline with the last cached dataset.
- **Privacy:** no analytics, no cookies, no accounts. Geolocation is used in-browser only
  and never transmitted. Only the chosen city and theme are stored, in `localStorage`.
- **Accessibility:** pinch-zoom allowed, Escape closes modals, icon buttons labelled.

## 8. Success metrics

- Data correctness: zero cross-city price contamination in a week of scrapes.
- Freshness: dataset updated on ≥ 95% of days.
- Load: interactive in under 2 s on a mid-range Android phone.
- Retention proxy: repeat installs / saved-city usage (measured only if a privacy-safe,
  free method exists — otherwise not measured).

## 9. Cost constraint (hard requirement)

**The project must cost ₹0 to build and run.** Every dependency has to sit inside a free
tier with no card on file:

| Concern | Choice | Cost |
|---|---|---|
| Hosting | GitHub Pages (public repo) | Free |
| Automation | GitHub Actions on a public repo | Free, unlimited minutes |
| Data source | Public web pages (goodreturns.in) | Free |
| Charts / icons / fonts | Chart.js, Lucide, Google Fonts via public CDN | Free |
| Backend / database | None — a committed static JS file is the database | Free |
| Domain | `*.github.io` subdomain | Free |

Any future feature that needs a paid API, a server, a database, or a paid domain is out
of scope unless a free alternative exists.

## 10. Known limitations

- Prices are scraped from a third party and can be wrong or stale if that site changes
  layout or goes down.
- USD/INR and the tax breakdown are static reference figures, not live data.
- History only accumulates going forward; there is no backfill of past prices.
- LPG and CNG are state-level averages, not city-exact.

## 11. Roadmap

See `TODO.md`.
