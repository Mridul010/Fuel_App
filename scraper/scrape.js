const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const JS_PATH = path.join(__dirname, '../data/prices.js');

async function getHtml(browser, url) {
    if (!url) return null;
    try {
        const page = await browser.newPage();
        // Block images and css for speed
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if(['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const html = await page.content();
        await page.close();
        return html;
    } catch (e) {
        console.error("Puppeteer Failed for", url, e.message);
        return null;
    }
}

async function scrapeStateMap(browser, url) {
    const map = {};
    const html = await getHtml(browser, url);
    if(!html) return map;
    
    const $ = cheerio.load(html);
    // Look at all table rows
    $('tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length >= 2) {
            const stateText = tds.eq(0).text().trim().toLowerCase();
            if(stateText.length > 2 && stateText.length < 30) {
                const priceMatch = tds.eq(1).text().match(/([0-9,]{2,}\.[0-9]{2})/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                    // LPG is usually ~800-1100, CNG is ~70-100.
                    if (!isNaN(price) && price > 30 && price < 2000) {
                        map[stateText] = price;
                    }
                }
            }
        }
    });
    return map;
}

async function scrapePrice(browser, url, cityName) {
    const html = await getHtml(browser, url);
    if(!html) return null;
    
    // Strategy 1: Big green block with " / Ltr"
    let m = html.match(/([\d]{2,3}\.[\d]{2})\s*\/\s*Ltr/i);
    if (m) return parseFloat(m[1]);
    
    // Strategy 2: Introductory paragraph "is at ₹XXX per litre"
    m = html.match(/is at [^\d]*([\d]{2,3}\.[\d]{2})\s*per/i);
    if (m) return parseFloat(m[1]);
    
    let fallback = null;
    let val = null;
    const $ = cheerio.load(html);
    
    // Logic 1: Find row with exactly the city name or purely the date
    $('tr').each((i, el) => {
        const rowText = $(el).text().toLowerCase().trim();
        const tdText = $(el).find('td').eq(1).text();
        const match = tdText ? tdText.match(/([0-9]{2,3}\.[0-9]{2})/) : null;
        
        if (match) {
            const num = parseFloat(match[1]);
            if (num > 60 && num < 150 && !fallback) fallback = num; // any valid price fallback
            
            // Only accept if row explicitly contains city name
            if (rowText.includes(cityName.toLowerCase())) {
                if (num > 60 && num < 150 && !val) val = num;
            }
        }
    });
    
    // Logic 2: Strong tags if tables fail
    if (!val) {
        $('.price_details strong').each((i, el) => {
            const num = parseFloat($(el).text().replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 60 && num < 150 && !val) val = num;
        });
    }
    
    return val || fallback;
}

async function run() {
    console.log('Starting daily fuel price scrape via Puppeteer...');
    const rawJs = fs.readFileSync(JS_PATH, 'utf8');
    const jsonStr = rawJs.replace('const FUEL_DATA = ', '').trim().replace(/;$/, '');
    const data = JSON.parse(jsonStr);

    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    console.log(`Scraping LPG State Map...`);
    const lpgMap = await scrapeStateMap(browser, 'https://www.goodreturns.in/lpg-price.html');
    
    console.log(`Scraping CNG State Map...`);
    const cngMap = await scrapeStateMap(browser, 'https://www.goodreturns.in/cng-price.html');

    for (let c of data.cities) {
        console.log(`Processing ${c.name}...`);
        if (c.goodreturns_url) {
            const p = await scrapePrice(browser, c.goodreturns_url, c.name.split(' ')[0]);
            if (p) c.p = p;
        }
        if (c.d_goodreturns_url) {
            const d = await scrapePrice(browser, c.d_goodreturns_url, c.name.split(' ')[0]);
            if (d) c.d = d;
        }
        
        // Map LPG and CNG to the city using its state
        const stateLow = c.state.toLowerCase();
        c.lpg = lpgMap[stateLow] || lpgMap['kerala'] || c.lpg || 912;
        c.cng = cngMap[stateLow] || cngMap['kerala'] || c.cng || 89;
    }
    
    await browser.close();

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
    console.log('Scrape complete. Updated prices.js successfully!');
}

run().catch(console.error);
