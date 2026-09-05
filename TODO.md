# TODO

Working list for FuelRate. Everything here must stay inside free tiers — no paid APIs,
servers, or domains (see `PRD.md` §9).

## Fixed

- [x] 7-day chart showed Thiruvananthapuram's history for every city — scraper now
      records a per-city series and the chart reads the selected city's.
- [x] Day-on-day change badges compared any city against Thiruvananthapuram's history,
      and read the wrong index (`[5]`, not the last point).
- [x] Chart day labels were hardcoded Mon→Sun while the data is Sun→Sat.
- [x] "Updated today at …" was shown even when the data was days old.
- [x] Brent crude scraped as `$24.23` — the regex matched the first number after any
      occurrence of "crude". Stricter patterns plus a $30–$200 plausibility band, and a
      failed parse keeps yesterday's value instead of overwriting it.
- [x] Rates screen had hardcoded CNG/Brent figures that ignored the dataset.
- [x] "National rates" card actually showed the selected city's LPG/CNG.
- [x] Scraper fell back to any number found on a page even when the page wasn't the
      city's — the likely cause of identical prices across Kollam / Pathanamthitta /
      Idukki.
- [x] `pathananthitta` typo in both goodreturns URLs → the page redirected and was skipped.
- [x] Re-running the scraper twice in a day shifted the history window twice.
- [x] Service worker `addAll` included cross-origin CDN URLs: one failing CDN aborted
      the whole install, so the app never went offline-capable. Chart.js was never cached
      either, so the chart broke offline.
- [x] Service worker ignored the `REFRESH` message the app posts to it.
- [x] An unanswered geolocation prompt left the UI stuck on "Detecting…" forever.
- [x] Auto-detected city was written to `localStorage`, so detection only ever ran once.
- [x] Theme choice was not persisted.
- [x] `user-scalable=no` blocked pinch-zoom.
- [x] Escape now closes the city and about modals.

## Next

- [ ] Backfill/keep more than 7 days of history and add a 30-day view.
- [ ] Live USD/INR instead of the static ₹83.42 (free source, e.g. exchangerate.host).
- [ ] Make the petrol tax breakdown state-specific rather than one static split.
- [ ] Add a scraper smoke test (fixture HTML → expected price) run in CI on PRs.
- [ ] Alert on scrape failure: if a city's price is unchanged for N days, flag it in the
      workflow summary.
- [ ] Reconcile the "6:00 AM IST" copy in README with the actual 06:30 IST schedule.
- [ ] Shrink `img/icon.png` (910 KB) and ship real 192/512 variants for the manifest.
- [ ] "Cheapest nearby" ranking by distance and price together, not distance alone.
- [ ] Share card / deep link for a city (`?city=kochi`).
- [ ] Price-drop notification via the Notifications API (opt-in, still zero-cost).

## Maybe

- [ ] More states — the dataset is a plain list, adding a city is one entry plus URLs.
- [ ] EV charging tariffs alongside fuel.
- [ ] Fuel cost calculator (litres × rate, or trip distance × mileage).
