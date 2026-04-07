const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const JS_PATH = path.join(__dirname, '../data/prices.js');

async function scrapeGeneral(url, keywords) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        let val = null;
        $('table.gold_silver_table tr').each((i, el) => {
            const rowText = $(el).text().toLowerCase();
            const matchesKeyword = keywords.some(k => rowText.includes(k.toLowerCase()));
            if (matchesKeyword && !val) {
                const tdText = $(el).find('td').eq(1).text() || $(el).find('strong').text();
                const match = tdText.match(/([0-9,]+\.[0-9]{2})/);
                if (match) {
                    const num = parseFloat(match[1].replace(/,/g, ''));
                    if (num > 10) val = num;
                }
            }
        });
        return val;
    } catch (e) {
        return null;
    }
}

async function scrapePrice(url, cityName) {
    if (!url) return null;
    let fallback = null;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        let val = null;
        
        $('table.gold_silver_table tr').each((i, el) => {
            const rowText = $(el).text().toLowerCase();
            const tdText = $(el).find('td').eq(1).text();
            const match = tdText.match(/([0-9]{2,3}\.[0-9]{2})/);
            
            if (match) {
                const num = parseFloat(match[1]);
                // Save the first reasonable price as a fallback
                if (num > 60 && num < 150 && !fallback) fallback = num;
                
                // If this specific row mentions the city or "today", pick it
                if (rowText.includes(cityName.toLowerCase()) || rowText.includes('today') || rowText.includes('1 litre')) {
                    if (num > 60 && num < 150 && !val) val = num;
                }
            }
        });
        
        if (!val) {
            $('.price_details strong').each((i, el) => {
                const num = parseFloat($(el).text().replace(/[^0-9.]/g, ''));
                if (!isNaN(num) && num > 60 && num < 150 && !val) val = num;
            });
        }
        
        return val || fallback;
    } catch (e) {
        return null;
    }
}

async function run() {
    console.log('Starting daily fuel price scrape...');
    const rawJs = fs.readFileSync(JS_PATH, 'utf8');
    const jsonStr = rawJs.replace('const FUEL_DATA = ', '').trim().replace(/;$/, '');
    const data = JSON.parse(jsonStr);

    for (let c of data.cities) {
        if (c.goodreturns_url) {
            console.log(`Scraping Petrol for ${c.name}...`);
            const p = await scrapePrice(c.goodreturns_url, c.name.split(' ')[0]);
            if (p) c.p = p;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (c.d_goodreturns_url) {
            console.log(`Scraping Diesel for ${c.name}...`);
            const d = await scrapePrice(c.d_goodreturns_url, c.name.split(' ')[0]);
            if (d) c.d = d;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    // Scrape LPG (Kerala Average)
    console.log(`Scraping LPG...`);
    const lpg = await scrapeGeneral('https://www.goodreturns.in/lpg-price.html', ['kerala', 'ernakulam', 'kochi']);
    if (lpg) data.lpg = lpg;
    await new Promise(r => setTimeout(r, 1000));
    
    // Scrape CNG (Kerala Average)
    console.log(`Scraping CNG...`);
    const cng = await scrapeGeneral('https://www.goodreturns.in/cng-price.html', ['kerala', 'ernakulam']);
    if (cng) data.cng = cng;

    const baseCity = data.cities[0];
    data.history.p.shift();
    data.history.d.shift();
    data.history.days.shift();
    data.history.p.push(baseCity.p);
    data.history.d.push(baseCity.d);
    
    const d = new Date();
    data.history.days.push(d.toLocaleDateString('en-IN', {weekday:'short'}));
    data.updatedAt = d.toISOString();

    const outputContent = `const FUEL_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(JS_PATH, outputContent);
    console.log('Scrape complete. Updated prices.js successfully.');
}

run().catch(console.error);
