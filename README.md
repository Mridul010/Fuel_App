# ⛽ FuelRate: Transparent Fuel Intelligence

FuelRate is a lightweight, high-performance Progressive Web App (PWA) designed to bring transparency to fuel prices across India. It provides real-time tracking for Petrol, Diesel, LPG, and CNG, while contextualizing prices with global crude trends and state averages.

![FuelRate Mockup](https://raw.githubusercontent.com/Mridul010/Fuel_App/main/img/mockup.png)

## 🌟 Key Features

- **📍 Smart Location Detection**: Automatically identifies your city via Geolocation to show hyper-local rates.
- **📈 7-Day Trend Analysis**: Interactive charts showing price fluctuations over the last week.
- **⇄ Comparison Engine**: Side-by-side comparison of prices between multiple Indian cities to find the cheapest "fill-up."
- **📊 Price Breakdown**: Understand the "Base Cost" vs "VAT" vs "Excise Duty" for every litre.
- **🌍 Global Context**: Real-time tracking of Brent Crude Oil and USD/INR exchange rates.
- **📱 PWA Ready**: Install it on your home screen for an offline-first, native-app experience.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom variables-based design system), Vanilla JS (ES6+).
- **Automation**: GitHub Actions for daily 6:00 AM fuel price scraping.
- **Data**: Node.js + Puppeteer scraper extracting data from `goodreturns.in`.
- **Styling**: Modern typography (Syne & DM Sans), glassmorphism, and HSL-based harmonious color palette.

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
The app uses a **Hybrid API Approach**. Every morning at 6:00 AM IST, a GitHub Action triggers the Puppeteer scraper. The scraper fetches the latest rates and updates `data/prices.js`. The frontend then consumes this static file, ensuring zero-latency performance and offline availability.

---

Built with ❤️ for better transparency.
