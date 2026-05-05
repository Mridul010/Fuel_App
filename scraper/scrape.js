const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const JS_PATH = path.join(__dirname, '../data/prices.js');

async function getHtml(browser, url) {
    if (!url) return { html: null, finalUrl: url };
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
        const finalUrl = page.url();
        const html = await page.content();
        await page.close();
        
        // Detect redirect: if the final URL doesn't contain "price-in-", we got redirected
        // to the generic page (e.g. petrol-price.html) and should NOT use this data
        if (url.includes('price-in-') && !finalUrl.includes('price-in-')) {
            console.log(`  ⚠ REDIRECT DETECTED: ${url} → ${finalUrl} (SKIPPING)`);
            return { html: null, finalUrl };
        }
        
        return { html, finalUrl };
    } catch (e) {
        console.error("Puppeteer Failed for", url, e.message);
        return { html: null, finalUrl: url };
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

/**
 * Extract city keywords from both the city name and URL for matching.
 * e.g. "Ernakulam (Kochi)" + "petrol-price-in-kochi.html" -> ["ernakulam", "kochi"]
 */
function getCityKeywords(cityName, url) {
    const keywords = [];
    const nameParts = cityName.toLowerCase().replace(/[()]/g, ' ').split(/[\s,]+/).filter(w => w.length > 2);
    keywords.push(...nameParts);
    if (url) {
        const urlMatch = url.match(/price-in-([a-z-]+)\.html/i);
        if (urlMatch) {
            const slug = urlMatch[1].replace(/-/g, ' ').split(' ').filter(w => w.length > 2);
            keywords.push(...slug);
        }
    }
    return [...new Set(keywords)];
}

/**
 * Scrape price for a specific city. Uses multiple strategies to ensure
 * we get the CITY-SPECIFIC price and not a comparison/reference price.
 */
async function scrapePrice(browser, url, cityName, cityKeywords, min=50, max=2000) {
    const { html } = await getHtml(browser, url);
    if(!html) return null;
    
    const $ = cheerio.load(html);
    const bodyText = $('body').text();
    let val = null;
    let fallback = null;
    
    // Check if the page title/h1 confirms this is the right city's page
    const pageTitle = $('title').text().toLowerCase();
    const h1Text = $('h1').first().text().toLowerCase();
    const cityMatched = cityKeywords.some(kw => pageTitle.includes(kw) || h1Text.includes(kw));
    
    console.log(`  Page title: "${$('title').text().trim().substring(0, 60)}..." cityMatched=${cityMatched}`);

    // ============================================================
    // STRATEGY 1: Body text paragraph (most reliable for goodreturns)
    // Page says: "Petrol price today in Kasaragod (Kerala) is Rs. 106.27 per litre"
    // ============================================================
    if (cityMatched) {
        for (const kw of cityKeywords) {
            // "price ... <city> ... is Rs. 106.27 per"
            const re1 = new RegExp('price[^.]*?' + kw + '[^.]*?(?:is|at)\\D{0,20}?(?:Rs\\.?|\\u20b9)\\s*(\\d{2,4}\\.\\d{2})\\s*per', 'i');
            const m1 = bodyText.match(re1);
            if (m1) {
                const v = parseFloat(m1[1]);
                if (v > min && v < max) { val = v; console.log(`  Strategy 1a matched: ${val}`); break; }
            }
            // "<city> ... Rs. 106.27 per"
            const re2 = new RegExp(kw + '[^.]{0,150}?(?:Rs\\.?|\\u20b9)\\s*(\\d{2,4}\\.\\d{2})\\s*per', 'i');
            const m2 = bodyText.match(re2);
            if (m2) {
                const v = parseFloat(m2[1]);
                if (v > min && v < max) { val = v; console.log(`  Strategy 1b matched: ${val}`); break; }
            }
        }
    }

    // ============================================================
    // STRATEGY 2: Meta tags (og:description, meta description)
    // ============================================================
    if (!val) {
        const ogDesc = $('meta[property="og:description"]').attr('content') || '';
        const metaDesc = $('meta[name="description"]').attr('content') || '';
        const combinedMeta = ogDesc + ' ' + metaDesc;
        
        const metaMatch = combinedMeta.match(/(?:Rs\.?|₹)\s*(\d{2,4}\.\d{2})/i);
        if (metaMatch) {
            const v = parseFloat(metaMatch[1]);
            if (v > min && v < max) { val = v; console.log(`  Strategy 2 (meta) matched: ${val}`); }
        }
    }

    // ============================================================
    // STRATEGY 3: ".price_details" DOM elements (goodreturns specific)
    // ============================================================
    if (!val && cityMatched) {
        $('.price_details strong, .price_details b, .price_details .price').each((i, el) => {
            const num = parseFloat($(el).text().replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > min && num < max && !val) {
                val = num;
                console.log(`  Strategy 3 (.price_details) matched: ${val}`);
            }
        });
    }

    // ============================================================
    // STRATEGY 4: "is Rs. XX.XX per" without city keyword (if page title confirmed city)
    // ============================================================
    if (!val && cityMatched) {
        const isRsGlobal = bodyText.match(/(?:is|at)\D{0,20}?(?:Rs\.?|₹)\s*(\d{2,4}\.\d{2})\s*per/i);
        if (isRsGlobal) {
            const v = parseFloat(isRsGlobal[1]);
            if (v > min && v < max) { val = v; console.log(`  Strategy 4 (global is Rs.) matched: ${val}`); }
        }
    }
    
    // ============================================================
    // STRATEGY 5: Table rows matching city name
    // ============================================================
    if (!val) {
        $('tr').each((i, el) => {
            const rowText = $(el).text().toLowerCase().trim();
            const tds = $(el).find('td');
            for (let tdIdx = 0; tdIdx < tds.length; tdIdx++) {
                const tdText = tds.eq(tdIdx).text();
                const match = tdText.match(/(\d{2,4}\.\d{2})/);
                if (match) {
                    const num = parseFloat(match[1]);
                    if (num > min && num < max) {
                        const rowMatchesCity = cityKeywords.some(kw => rowText.includes(kw));
                        if (rowMatchesCity && !val) {
                            val = num;
                            console.log(`  Strategy 5 (table city match) matched: ${val}`);
                        }
                        if (!fallback) fallback = num;
                    }
                }
            }
        });
    }

    // ============================================================
    // STRATEGY 6: Today's date row in "Last 10 Days" table
    // ============================================================
    if (!val) {
        const today = new Date();
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const todayDay = String(today.getDate()).padStart(2, '0');
        const todayStr = monthNames[today.getMonth()] + ' ' + todayDay;
        // Also try without leading zero
        const todayStr2 = monthNames[today.getMonth()] + ' ' + today.getDate();
        
        $('tr').each((i, el) => {
            if (val) return;
            const rowText = $(el).text().toLowerCase().trim();
            if (rowText.includes(todayStr) || rowText.includes(todayStr2)) {
                const tds = $(el).find('td');
                for (let tdIdx = 0; tdIdx < tds.length; tdIdx++) {
                    const tdText = tds.eq(tdIdx).text();
                    const match = tdText.match(/(\d{2,4}\.\d{2})/);
                    if (match) {
                        const num = parseFloat(match[1]);
                        if (num > min && num < max && !val) {
                            val = num;
                            console.log(`  Strategy 6 (today's date row) matched: ${val}`);
                        }
                    }
                }
            }
        });
    }

    // ============================================================
    // STRATEGY 7: Context-aware regex - city keyword near price pattern
    // ============================================================
    if (!val) {
        for (const kw of cityKeywords) {
            // "cityname ... XX.XX /Ltr"
            const re = new RegExp(kw + '\\D{0,200}?(\\d{2,4}\\.\\d{2})\\s*/\\s*(?:Ltr|Kg|Cylinder)', 'i');
            const m = bodyText.match(re);
            if (m) {
                const v = parseFloat(m[1]);
                if (v > min && v < max) { val = v; console.log(`  Strategy 7 matched: ${val}`); break; }
            }
        }
    }

    // ============================================================
    // LOG RESULT
    // ============================================================
    if (val) {
        console.log(`  >>> RESULT for ${cityName}: ${val}`);
    } else if (fallback) {
        console.log(`  >>> FALLBACK for ${cityName}: ${fallback} (no city-specific match)`);
    } else {
        console.log(`  >>> NO PRICE for ${cityName}`);
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

    console.log('Extracting Global Crude...');
    let globalCrude = 89.50;
    const { html: mainHtml } = await getHtml(browser, 'https://www.goodreturns.in/petrol-price.html');
    if (mainHtml) {
        const crMatch = mainHtml.match(/Crude.*?([\d,]{2,}\.?\d*)/i);
        if (crMatch) {
            const crVal = parseFloat(crMatch[1].replace(/,/g, ''));
            if (crVal > 1000) {
                globalCrude = parseFloat((crVal / 83.5).toFixed(2));
            } else {
                globalCrude = crVal;
            }
            console.log('Global Crude determined as:', globalCrude);
        }
    }

    console.log('Scraping State Maps...');
    const { html: lpgHtml } = await getHtml(browser, 'https://www.goodreturns.in/lpg-price.html');
    const { html: cngHtml } = await getHtml(browser, 'https://www.goodreturns.in/cng-price.html');
    const lpgMap = await scrapeStateMap(lpgHtml);
    const cngMap = await scrapeStateMap(cngHtml);

    for (let c of data.cities) {
        console.log(`\n=== Processing ${c.name} ===`);
        const cityKeywords = getCityKeywords(c.name, c.goodreturns_url);
        console.log(`  Keywords: [${cityKeywords.join(', ')}]`);
        
        if (c.goodreturns_url) {
            console.log(`  Scraping PETROL from: ${c.goodreturns_url}`);
            const p = await scrapePrice(browser, c.goodreturns_url, c.name, cityKeywords, 50, 150);
            if (p) c.p = p;
            
            const lpgUrl = c.goodreturns_url.replace('petrol', 'lpg');
            const lpgKeywords = getCityKeywords(c.name, lpgUrl);
            const lpg = await scrapePrice(browser, lpgUrl, c.name, lpgKeywords, 600, 1500);
            if (lpg) c.lpg = lpg;
            
            const cngUrl = c.goodreturns_url.replace('petrol', 'cng');
            const cngKeywords = getCityKeywords(c.name, cngUrl);
            const cng = await scrapePrice(browser, cngUrl, c.name, cngKeywords, 40, 150);
            if (cng) c.cng = cng;
        }
        
        if (c.d_goodreturns_url) {
            console.log(`  Scraping DIESEL from: ${c.d_goodreturns_url}`);
            const dKeywords = getCityKeywords(c.name, c.d_goodreturns_url);
            const d = await scrapePrice(browser, c.d_goodreturns_url, c.name, dKeywords, 50, 150);
            if (d) c.d = d;
        }
        
        // Fallback to State Map if City-level failed or missing
        const stateLow = c.state.toLowerCase();
        if (!c.lpg || c.lpg < 600) c.lpg = lpgMap[stateLow] || lpgMap['kerala'] || 912;
        if (!c.cng || c.cng < 40) c.cng = cngMap[stateLow] || cngMap['kerala'] || 85;
        
        c.crude = globalCrude;
        
        console.log(`  FINAL: p=${c.p}, d=${c.d}, lpg=${c.lpg}, cng=${c.cng}`);
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
    console.log('\nScrape complete. Updated prices.js successfully!');
}

run().catch(console.error);
