const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const JS_PATH = path.join(__dirname, '../data/prices.js');

async function getHtml(browser, url) {
    if (!url) return null;
    try {
        const page = await browser.newPage();
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

async function scrapeStateMap(html) {
    const map = {};
    if(!html) return map;
    
    const $ = cheerio.load(html);
    $('tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length >= 2) {
            const stateText = tds.eq(0).text().trim().toLowerCase();
            if(stateText.length > 2 && stateText.length < 30) {
                const priceMatch = tds.eq(1).text().match(/([0-9,]{2,}\.[0-9]{2})/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                    if (!isNaN(price) && price > 30 && price < 2000) {
                        map[stateText] = price;
                    }
                }
            }
        }
    });
    return map;
}

async function scrapePrice(browser, url, cityName, min=50, max=2000) {
    const html = await getHtml(browser, url);
    if(!html) return null;
    
    let m = html.match(/([\d]{2,4}\.[\d]{2})\s*\/\s*(Ltr|Kg|Cylinder)/i);
    if (m) {
        const v = parseFloat(m[1]);
        if(v > min && v < max) return v;
    }
    
    m = html.match(/is at [^\d]*([\d]{2,4}\.[\d]{2})\s*per/i);
    if (m) {
        const v = parseFloat(m[1]);
        if(v > min && v < max) return v;
    }
    
    let fallback = null;
    let val = null;
    const $ = cheerio.load(html);
    
    $('tr').each((i, el) => {
        const rowText = $(el).text().toLowerCase().trim();
        const tdText = $(el).find('td').eq(1).text();
        const match = tdText ? tdText.match(/([0-9]{2,4}\.[0-9]{2})/) : null;
        
        if (match) {
            const num = parseFloat(match[1]);
            if (num > min && num < max && !fallback) fallback = num;
            
            if (rowText.includes(cityName.toLowerCase())) {
                if (num > min && num < max && !val) val = num;
            }
        }
    });
    
    if (!val) {
        $('.price_details strong').each((i, el) => {
            const num = parseFloat($(el).text().replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > min && num < max && !val) val = num;
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

    console.log(`Extracting Global Crude...`);
    let globalCrude = 89.50; // default fallback
    const mainHtml = await getHtml(browser, 'https://www.goodreturns.in/petrol-price.html');
    if (mainHtml) {
        const crMatch = mainHtml.match(/Crude.*?([\d,]{2,}\.?[\d]*)/i);
        if (crMatch) {
            const crVal = parseFloat(crMatch[1].replace(/,/g, ''));
            // If it's in INR (e.g., ₹7,125), convert to USD using an approx 83.5 exchange rate
            if (crVal > 1000) {
                globalCrude = parseFloat((crVal / 83.5).toFixed(2));
            } else {
                globalCrude = crVal; // Already in dollars
            }
            console.log('Global Crude determined as:', globalCrude);
        }
    }

    console.log(`Scraping State Maps...`);
    const lpgHtml = await getHtml(browser, 'https://www.goodreturns.in/lpg-price.html');
    const cngHtml = await getHtml(browser, 'https://www.goodreturns.in/cng-price.html');
    const lpgMap = await scrapeStateMap(lpgHtml);
    const cngMap = await scrapeStateMap(cngHtml);

    for (let c of data.cities) {
        console.log(`Processing ${c.name}...`);
        const cNameShort = c.name.split(' ')[0];
        
        if (c.goodreturns_url) {
            const p = await scrapePrice(browser, c.goodreturns_url, cNameShort, 50, 150);
            if (p) c.p = p;
            
            // Try explicit City-level LPG and CNG URL based on petrol URL
            const lpgUrl = c.goodreturns_url.replace('petrol', 'lpg');
            const lpg = await scrapePrice(browser, lpgUrl, cNameShort, 600, 1500);
            if (lpg) c.lpg = lpg;
            
            const cngUrl = c.goodreturns_url.replace('petrol', 'cng');
            const cng = await scrapePrice(browser, cngUrl, cNameShort, 40, 150);
            if (cng) c.cng = cng;
        }
        
        if (c.d_goodreturns_url) {
            const d = await scrapePrice(browser, c.d_goodreturns_url, cNameShort, 50, 150);
            if (d) c.d = d;
        }
        
        // Fallback to State Map if City-level failed or missing
        const stateLow = c.state.toLowerCase();
        if (!c.lpg || c.lpg < 600) c.lpg = lpgMap[stateLow] || lpgMap['kerala'] || 912;
        if (!c.cng || c.cng < 40) c.cng = cngMap[stateLow] || cngMap['kerala'] || 85;
        
        // Inject global crude
        c.crude = globalCrude;
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
