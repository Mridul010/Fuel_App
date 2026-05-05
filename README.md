# ⛽ FuelRate: Transparent Fuel Intelligence

FuelRate is a lightweight, high-performance Progressive Web App (PWA) designed to bring transparency to fuel prices across India. It provides real-time tracking for Petrol, Diesel, LPG, and CNG, while contextualizing prices with global crude trends and state averages.

## 🌟 Key Features

- **📍 Smart Location Detection**: Automatically identifies your city via Geolocation to show hyper-local rates.
- **📈 7-Day Trend Analysis**: Interactive charts showing price fluctuations over the last week.
- **⇄ Comparison Engine**: Side-by-side comparison of prices between multiple Indian cities to find the cheapest "fill-up."
- **📊 Price Breakdown**: Understand the "Base Cost" vs "VAT" vs "Excise Duty" for every litre.
- **🌍 Global Context**: Real-time tracking of Brent Crude Oil and USD/INR exchange rates.
- **📱 PWA Ready**: Install it on your home screen for an offline-first, native-app experience.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom variables-based design system), Vanilla JS (ES6+).
- **Automation**: GitHub Actions for daily 6:00 AM IST fuel price scraping.
- **Data**: Node.js + Puppeteer + Cheerio scraper extracting data from `goodreturns.in`.
- **Styling**: Modern typography (Syne & DM Sans), glassmorphism, and HSL-based harmonious color palette.
- **Charts**: Chart.js for interactive 7-day trend visualization.
- **Icons**: Lucide Icons for a clean, consistent icon set.

## 🚀 Getting Started

### Prerequisites
- Node.js (for running the scraper)
- NPM

### Local Development
1. Clone the repository.
   ```bash
   git clone https://github.com/Mridul010/Fuel_App.git
   ```
2. Open `index.html` in your browser.

### Running the Scraper
1. Navigate to the `scraper` directory.
   ```bash
   cd scraper
   npm install
   ```
2. Run the scraper manually:
   ```bash
   node scrape.js
   ```

## 🤖 How it Works

The app uses a **Hybrid Scraping + Static Data Approach**:

1. **Daily Automation**: Every morning at 6:00 AM IST, a GitHub Action triggers the Puppeteer scraper.
2. **Smart Extraction**: The scraper visits each city's page on `goodreturns.in` and uses a multi-strategy price extraction engine:
   - Page body text parsing (e.g., "Petrol price in Kochi is Rs. 105.60 per litre")
   - Meta tag extraction (og:description, meta description)
   - City-keyword-aware table row matching
   - Date-based "Last 10 Days" table lookup
   - Suspicious-price detection (prevents cross-city contamination)
3. **Static File Update**: The scraped data is written to `data/prices.js` and committed back to the repo.
4. **Zero-Latency Frontend**: The PWA consumes this static file, ensuring instant load times and full offline availability.

## 📍 Supported Cities

**Kerala**: Thiruvananthapuram, Kollam, Pathanamthitta, Alappuzha, Kottayam, Idukki, Ernakulam (Kochi), Thrissur, Palakkad, Malappuram, Kozhikode, Wayanad, Kannur, Kasaragod

**Other States**: Mahe (Puducherry), Mangaluru & Bengaluru (Karnataka), Coimbatore & Chennai (Tamil Nadu), Delhi, Mumbai, Kolkata, Hyderabad

---

Built with ❤️ for better transparency.
