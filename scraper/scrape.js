const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const JS_PATH = path.join(__dirname, '../data/prices.js');

async function scrapePrice(url) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(data);
        // Look for the specific Goodreturns price element (usually big text in a bold element)
        let priceStr = $('.price_number, .gold_18, .blue-text, strong').filter(function() {
            return $(this).text().includes('₹');
        }).first().text();

        // Fallback: look for generic bold element that looks like a price (XX.XX)
        if (!priceStr) {
            priceStr = $('strong, b, span').filter(function() {
                return /^\s*(?:₹|Rs\.?)?\s*\d{2,3}\.\d{2}\s*$/.test($(this).text());
            }).first().text();
        }

        const match = priceStr.match(/\d{2,3}\.\d{2}/);
        return match ? parseFloat(match[0]) : null;
    } catch (e) {
        console.error(`Failed to scrape ${url}: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log('Starting daily fuel price scrape...');
    
    // Read the JS file and strip out "const FUEL_DATA = " and ";"
    const rawJs = fs.readFileSync(JS_PATH, 'utf8');
    const jsonStr = rawJs.replace('const FUEL_DATA = ', '').trim().replace(/;$/, '');
    const data = JSON.parse(jsonStr);
    
    let updatedCities = 0;
    
    // We will update the top few cities synchronously to avoid rate limits, or Promise.all
    // For safety, let's delay between requests to be polite.
    for (let c of data.cities) {
        if (c.goodreturns_url) {
            console.log(`Scraping Petrol for ${c.name}...`);
            const p = await scrapePrice(c.goodreturns_url);
            if (p) c.p = p;
            await new Promise(r => setTimeout(r, 1000)); // sleep 1s
        }
        if (c.d_goodreturns_url) {
            console.log(`Scraping Diesel for ${c.name}...`);
            const d = await scrapePrice(c.d_goodreturns_url);
            if (d) c.d = d;
            await new Promise(r => setTimeout(r, 1000)); // sleep 1s
        }
        updatedCities++;
    }

    // Update History (simplified mock logic for the prototype)
    const baseCity = data.cities[0];
    
    data.history.p.shift();
    data.history.p.push(baseCity.p);
    
    data.history.d.shift();
    data.history.d.push(baseCity.d);

    // Shift days
    const d = new Date();
    data.history.days.shift();
    const dayStr = d.toLocaleDateString('en-IN', {weekday:'short'});
    data.history.days.push(dayStr);
    
    data.updatedAt = d.toISOString();

    // Write back as a valid JS file
    const outputContent = `const FUEL_DATA = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(JS_PATH, outputContent);
    console.log(`Scraping finished. Updated ${updatedCities} cities.`);
}

run().catch(console.error);
