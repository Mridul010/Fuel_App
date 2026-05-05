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

/**
 * Extract the city-specific name keywords from both the city name and URL
 * so we can match against page content more reliably.
 * e.g. "Ernakulam (Kochi)" + url containing "kochi" → ["ernakulam", "kochi"]
 */
function getCityKeywords(cityName, url) {
    const keywords = [];
    
    // Extract all words from the city name (split on spaces, parens, hyphens)
    const nameParts = cityName.toLowerCase().replace(/[()]/g, ' ').split(/[\s,]+/).filter(w => w.length > 2);
    keywords.push(...nameParts);
    
    // Extract city slug from URL (e.g. "petrol-price-in-kochi.html" → "kochi")
    if (url) {
        const urlMatch = url.match(/price-in-([a-z-]+)\.html/i);
        if (urlMatch) {
            const slug = urlMatch[1].replace(/-/g, ' ').split(' ').filter(w => w.length > 2);
            keywords.push(...slug);
        }
    }
    
    // Deduplicate
    return [...new Set(keywords)];
}

/**
 * Scrape price for a specific city from its goodreturns page.
 * 
 * Strategy (in priority order):
 * 1. Look for the main "hero" price element on the page (city-specific page heading price)
 * 2. Search table rows for the city name match
 * 3. Look for structured price elements (.price_details)
 * 4. Fallback: first valid table row price (least reliable)
 * 
 * IMPORTANT: We do NOT use raw html.match() because it grabs the first price
 * on the page which is often a comparison city (Mumbai/Delhi), not the target city.
 */
async function scrapePrice(browser, url, cityName, cityKeywords, min=50, max=2000) {
    const html = await getHtml(browser, url);
    if(!html) return null;
    
    const $ = cheerio.load(html);
    let val = null;
    let fallback = null;
    
    // --- Strategy 1: Hero/heading price ---
    // Goodreturns city pages typically have the main price in specific selectors.
    // Look for common patterns: h1/h2 nearby price, or specific price wrapper elements.
    
    // Try to find a price in the page title or heading context that mentions the city
    const pageTitle = $('title').text().toLowerCase();
    const h1Text = $('h1').first().text().toLowerCase();
    const cityMatched = cityKeywords.some(kw => pageTitle.includes(kw) || h1Text.includes(kw));
    
    if (cityMatched) {
        // The page IS for this city. Look for the prominent/main price.
        // Common goodreturns patterns: ".price_details", "#price_box", large price near h1
        
        // Try .price_details first (goodreturns specific)
        $('.price_details strong, .price_details b, .price_details .price').each((i, el) => {
            const num = parseFloat($(el).text().replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > min && num < max && !val) val = num;
        });
        
        // Try the body text paragraph: "Petrol price today in Kasaragod (Kerala) is Rs. 106.27 per litre"
        // This is the most prominent text on every goodreturns city page.
        if (!val) {
            const bodyText = $('body').text();
            for (const kw of cityKeywords) {
                // Match: "price today in <city>...is Rs. 106.27 per litre"
                const bodyRegex = new RegExp('price[^.]*?' + kw + '[^.]*?(?:is|at)[^\\d]*?(?:Rs\\.?|₹)\\s*([0-9]{2,4}\\.[0-9]{2})\\s*per', 'i');
                const bm = bodyText.match(bodyRegex);
                if (bm) {
                    const v = parseFloat(bm[1]);
                    if (v > min && v < max) { val = v; break; }
                }
                // Also try: "<city>...Rs. 106.27 per" without "is"
                const bodyRegex2 = new RegExp(kw + '[^.]{0,150}?(?:Rs\\.?|₹)\\s*([0-9]{2,4}\\.[0-9]{2})\\s*per', 'i');
                const bm2 = bodyText.match(bodyRegex2);
                if (bm2) {
                    const v = parseFloat(bm2[1]);
                    if (v > min && v < max) { val = v; break; }
                }
            }
        }

        // Try meta og:description which often has "Petrol price in Kochi today is Rs.105.60 per litre"
        if (!val) {
            const ogDesc = $('meta[property="og:description"]').attr('content') || '';
            const metaMatch = ogDesc.match(/(?:Rs\.?|₹)\s*([0-9]{2,4}\.[0-9]{2})/i);
            if (metaMatch) {
                const v = parseFloat(metaMatch[1]);
                if (v > min && v < max) val = v;
            }
        }
        
        // Try page description meta tag
        if (!val) {
            const metaDesc = $('meta[name="description"]').attr('content') || '';
            const metaMatch = metaDesc.match(/(?:Rs\.?|₹)\s*([0-9]{2,4}\.[0-9]{2})/i);
            if (metaMatch) {
                const v = parseFloat(metaMatch[1]);
                if (v > min && v < max) val = v;
            }
        }
    }
    
    // --- Strategy 2: Search table rows for city name match ---
    if (!val) {
        $('tr').each((i, el) => {
            const rowText = $(el).text().toLowerCase().trim();
            const tds = $(el).find('td');
            
            // Try both td[0] (often has date) and td[1] (often has price)
            // But also handle different table layouts
            for (let tdIdx = 0; tdIdx < tds.length; tdIdx++) {
                const tdText = tds.eq(tdIdx).text();
                const match = tdText.match(/([0-9]{2,4}\.[0-9]{2})/);
                
                if (match) {
                    const num = parseFloat(match[1]);
                    if (num > min && num < max) {
                        // Check if this row mentions our city
                        const rowMatchesCity = cityKeywords.some(kw => rowText.includes(kw));
                        if (rowMatchesCity && !val) {
                            val = num;
                        }
                        // Track the first table price as fallback
                        if (!fallback) fallback = num;
                    }
                }
            }
        });
    }
    
    // --- Strategy 3: Context-aware regex on full HTML ---
    // Only use this if we haven't found anything yet.
    // Look for patterns where the city name appears near a price.
    if (!val) {
        const bodyText = $('body').text();
        for (const kw of cityKeywords) {
            // Pattern: "cityname ... XX.XX /Ltr" within ~200 chars
            const cityRegex = new RegExp(kw + '[^\\d]{0,200}?([\\d]{2,4}\\.[\\d]{2})\\s*/\\s*(?:Ltr|Kg|Cylinder)', 'i');
            const cm = bodyText.match(cityRegex);
            if (cm) {
                const v = parseFloat(cm[1]);
                if (v > min && v < max) { val = v; break; }
            }
            
            // Pattern: "cityname ... is Rs. XX.XX per" (actual goodreturns format)
            const isRsRegex = new RegExp(kw + '[^.]{0,200}?(?:is|at)[^\\d]{0,30}?(?:Rs\\.?|₹)\\s*([\\d]{2,4}\\.[\\d]{2})\\s*per', 'i');
            const irm = bodyText.match(isRsRegex);
            if (irm) {
                const v = parseFloat(irm[1]);
                if (v > min && v < max) { val = v; break; }
            }
        }
    }
    
    // --- Strategy 4: "is Rs/at XX.XX per" pattern (global, no city keyword required) ---
    // Only if the page title confirmed this is the right city's page
    if (!val && cityMatched) {
        const bodyText = $('body').text();
        // Match "is Rs. 106.27 per litre" or "is at Rs 106.27 per litre"
        const isRsGlobal = bodyText.match(/(?:is|at)[^\d]{0,20}?(?:Rs\.?|₹)\s*([0-9]{2,4}\.[0-9]{2})\s*per/i);
        if (isRsGlobal) {
            const v = parseFloat(isRsGlobal[1]);
            if (v > min && v < max) val = v;
        }
    }
    
    // --- Strategy 5: Today's price table (date-based) ---
    // Many goodreturns pages have a "last 10 days" table where the first row is today
    if (!val) {
        const today = new Date();
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const todayStr = monthNames[today.getMonth()] + ' ' + String(today.getDate()).padStart(2, '0');
        const yesterdayStr = monthNames[today.getMonth()] + ' ' + String(today.getDate() - 1).padStart(2, '0');
        
        $('tr').each((i, el) => {
            if (val) return; // already found
            const rowText = $(el).text().toLowerCase().trim();
            if (rowText.includes(todayStr) || rowText.includes(yesterdayStr)) {
                const tds = $(el).find('td');
                for (let tdIdx = 0; tdIdx < tds.length; tdIdx++) {
                    const tdText = tds.eq(tdIdx).text();
                    const match = tdText.match(/([0-9]{2,4}\.[0-9]{2})/);
                    if (match) {
                        const num = parseFloat(match[1]);
                        if (num > min && num < max && !val) val = num;
                    }
                }
            }
        });
    }
    
    if (val) {
        console.log(`  ✓ Found price for ${cityName}: ${val}`);
    } else if (fallback) {
        console.log(`  ⚠ Using fallback price for ${cityName}: ${fallback} (city-specific match failed)`);
    } else {
        console.log(`  ✗ No price found for ${cityName}`);
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
        const crMatch = mainHtml.match(/Crude.*?([\d,]{2,}\.?\d*)/i);
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
        const cityKeywords = getCityKeywords(c.name, c.goodreturns_url);
        console.log(`  Keywords: [${cityKeywords.join(', ')}]`);
        
        // Store previous price as fallback in case scrape completely fails
        const prevPetrol = c.p;
        const prevDiesel = c.d;
        
        if (c.goodreturns_url) {
            const p = await scrapePrice(browser, c.goodreturns_url, c.name, cityKeywords, 50, 150);
            if (p) c.p = p;
            
            // Try explicit City-level LPG and CNG URL based on petrol URL
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
            const dKeywords = getCityKeywords(c.name, c.d_goodreturns_url);
            const d = await scrapePrice(browser, c.d_goodreturns_url, c.name, dKeywords, 50, 150);
            if (d) c.d = d;
        }
        
        // Sanity check: if the scraped price is identical to a known "default" price
        // that appears on multiple cities, it's likely the scraper grabbed a comparison 
        // price instead of the actual city price. Revert to previous known-good value.
        // We detect this by checking if petrol AND diesel both match a suspicious pattern.
        if (c.p === prevPetrol && c.d === prevDiesel) {
            // Price unchanged — that's fine, fuel prices are often stable
        } else {
            // Check if the new price suspiciously matches another major city exactly
            const majorCityPrices = [
                { p: 94.77, d: 87.67 },  // Delhi
                { p: 103.54, d: 90.03 }, // Mumbai  
            ];
            for (const mc of majorCityPrices) {
                if (c.p === mc.p && c.d === mc.d && c.name !== 'Delhi' && c.name !== 'Mumbai') {
                    console.log(`  ⚠ SUSPICIOUS: ${c.name} got same price as a major city (${mc.p}/${mc.d}). Keeping previous: ${prevPetrol}/${prevDiesel}`);
                    c.p = prevPetrol;
                    c.d = prevDiesel;
                    break;
                }
            }
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
