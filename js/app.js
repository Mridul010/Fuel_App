let C = [];
let HIST = {};
const DEFAULT_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

let city = null, ch = null, tab = 'p', cmpCities = [], mfor = 'home', dark = true;

const THEME_KEY = 'fuelrate_theme';
let updatedAt = null;

// Per-city history when the scraper recorded it, else the global series
function seriesFor(c, t) {
    const perCity = HIST.cities && c && HIST.cities[c.name];
    const s = (perCity && perCity[t]) || HIST[t];
    return Array.isArray(s) && s.length ? s : null;
}

function dayLabels(len) {
    const d = Array.isArray(HIST.days) && HIST.days.length ? HIST.days : DEFAULT_DAYS;
    return d.slice(-len);
}

function freshnessText(iso) {
    const at = new Date(iso);
    if (isNaN(at)) return 'Last updated: unknown';
    const timeStr = at.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'});
    const dayOf = x => new Date(x).toLocaleDateString('en-CA', {timeZone: 'Asia/Kolkata'});
    const days = Math.round((new Date(dayOf(Date.now())) - new Date(dayOf(at))) / 86400000);
    if (days <= 0) return `Updated today at ${timeStr} IST`;
    if (days === 1) return `Updated yesterday at ${timeStr} IST`;
    return `Updated ${at.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'})} (${days} days ago)`;
}

// Initialize icons and data
async function init() {
    // Initialize Lucide icons
    if(window.lucide) {
        lucide.createIcons();
    }

    const d = new Date();
    document.getElementById('dtp').textContent = 
        d.toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'});
    
    // Saved preference wins over the system one
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        setTheme(savedTheme === 'dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme(false);
    }

    try {
        // Use global FUEL_DATA loaded from prices.js
        const data = FUEL_DATA;
        C = data.cities || [];
        HIST = data.history || {};
        if (!C.length) throw new Error('No cities in FUEL_DATA');

        updatedAt = data.updatedAt;
        document.getElementById('update-time').textContent = freshnessText(updatedAt);

        renderGlobalRates();

        // LPG and CNG are now city-specific and updated in setCity()

        // Default cities for comparison
        cmpCities = [C[0], C.find(c => c.name === 'Delhi'), C.find(c => c.name === 'Mumbai')]
            .filter(Boolean)
            .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);
        
        // Location logic
        const savedCityName = localStorage.getItem('fuelrate_city');
        const savedCity = savedCityName ? C.find(c => c.name === savedCityName) : null;
        
        if (savedCity) {
            setCity(savedCity, true);
        } else if(navigator.geolocation) {
            // Show a city immediately: an unanswered permission prompt never
            // fires either callback, which used to leave the UI on "Detecting…"
            setCity(C[0]);
            navigator.geolocation.getCurrentPosition(
                p => setCity(nearest(p.coords.latitude, p.coords.longitude)),
                () => {},
                {enableHighAccuracy: true, timeout: 5000, maximumAge: 0}
            );
        } else {
            setCity(C[0]);
        }
        
    } catch (e) {
        console.error("Error loading data:", e);
        document.getElementById('lcity').textContent = "Error loading data";
    }
}

function nearest(la, lo) {
    if(!C.length) return null;
    // Longitude degrees shrink towards the poles, so scale them before comparing
    const k = Math.cos(la * Math.PI / 180);
    const dist = c => Math.hypot(c.la - la, (c.lo - lo) * k);
    return C.reduce((b, c) => dist(c) < dist(b) ? c : b);
}

// Brent trades in tens of dollars; anything outside this band is bad scraped data
function plausibleCrude(v) {
    return typeof v === 'number' && v >= 30 && v <= 200 ? v : null;
}

function renderGlobalRates() {
    const crude = C.map(c => plausibleCrude(c.crude)).find(Boolean);
    const brent = document.getElementById('rc-brent');
    if (brent) brent.textContent = crude ? '$' + crude.toFixed(2) : '—';

    const delhi = C.find(x => x.name === 'Delhi');
    const delhiCng = document.getElementById('rc-cng-delhi');
    if (delhiCng) delhiCng.textContent = delhi && delhi.cng ? '₹' + delhi.cng.toFixed(2) : '—';

    const sub = updatedAt ? freshnessText(updatedAt) : '';
    ['rc-p-sub', 'rc-d-sub'].forEach(id => {
        const el = document.getElementById(id);
        if (el && sub) el.textContent = sub;
    });
}

// persist only for explicit user picks, so auto-detection stays live across visits
function setCity(c, persist = false) {
    if(!c) return;
    city = c;
    if (persist) localStorage.setItem('fuelrate_city', c.name);
    document.getElementById('lcity').textContent = c.name + ', ' + c.state;
    countUp('pp', c.p); 
    countUp('dp', c.d);
    
    // Dynamic Location-based LPG & CNG & Crude
    setFuelRow('lpg', c.lpg, 'LPG Cylinder', `${c.state} Avg (14.2 kg)`);
    setFuelRow('cng', c.cng, 'CNG', `${c.state} Avg (per kg)`);
    // Crude usually isn't city specific but update if the data object passes it along with city
    const cr = document.getElementById('ui-cr');
    if (cr) {
        const crude = plausibleCrude(c.crude);
        cr.textContent = crude ? '$' + crude.toFixed(2) : '—';
    }
    
    // Day-on-day change, from this city's own history when available
    badge('pb', dayChange(c, 'p'));
    badge('db', dayChange(c, 'd'));
    
    document.getElementById('rc-city').textContent = c.name;
    document.getElementById('rc-p').textContent = '₹' + c.p.toFixed(2);
    document.getElementById('rc-d').textContent = '₹' + c.d.toFixed(2);
    
    drawChart(tab);
    renderNB(c);
    
    // State Average Banner
    const st = C.filter(x => x.state === c.state);
    if(st.length > 0) {
        const avg = (st.reduce((a, x) => a + x.p, 0) / st.length).toFixed(2);
        const diff = (c.p - avg).toFixed(2);
        document.getElementById('stban').innerHTML = 
            `<i data-lucide="info" width="16" height="16"></i>
             <div><b>${c.state} avg: ₹${avg} petrol</b> — Your city is ₹${Math.abs(diff)} ${diff >= 0 ? 'above' : 'below'} average</div>`;
        if(window.lucide) lucide.createIcons();
    }
}

function setFuelRow(kind, value, name, sub) {
    const pill = document.getElementById('ui-' + kind);
    const rate = document.getElementById('ui-' + kind + '-rate');
    const lbl = document.getElementById('ui-' + kind + '-lbl');
    if (pill) pill.textContent = value ? '₹' + Math.round(value) : '—';
    if (rate) rate.textContent = value ? '₹' + value.toFixed(2) : '—';
    if (lbl && value) lbl.innerHTML = `<div class="r-name">${name}</div><div class="r-sub">${sub}</div>`;
}

function dayChange(c, t) {
    const s = seriesFor(c, t);
    if (!s || s.length < 2) return null;
    const prev = s[s.length - 2];
    if (typeof prev !== 'number') return null;
    return +(c[t] - prev).toFixed(2);
}

function countUp(id, target) {
    const el = document.getElementById(id);
    const t0 = Date.now(), dur = 680;
    (function f() {
        const p = Math.min((Date.now() - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = (e * target).toFixed(2);
        if(p < 1) requestAnimationFrame(f);
        else el.textContent = target.toFixed(2);
    })();
}

function badge(id, diff) {
    const el = document.getElementById(id);
    if (diff === null) {
        el.className = 'cbadge nn';
        el.innerHTML = `<i data-lucide="minus" width="12" height="12"></i> No data`;
        if(window.lucide) lucide.createIcons();
        return;
    }
    el.className = 'cbadge ' + (diff > 0 ? 'up' : diff < 0 ? 'dn' : 'nn');
    
    let icon = diff > 0 ? 'trending-up' : diff < 0 ? 'trending-down' : 'minus';
    let text = diff > 0 ? `₹${diff.toFixed(2)}` : diff < 0 ? `₹${Math.abs(diff).toFixed(2)}` : 'No change';
    
    el.innerHTML = `<i data-lucide="${icon}" width="12" height="12"></i> ${text}`;
    if(window.lucide) lucide.createIcons();
}

function getCv(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

function drawChart(t) {
    tab = t;
    const data = seriesFor(city, t);
    if(!data) return;
    const labels = dayLabels(data.length);
    
    const col = t === 'p' ? getCv('--pe') : getCv('--di');
    const cv = document.getElementById('cv');
    
    if(ch) ch.destroy();
    
    ch = new Chart(cv, {
        type: 'line',
        data: {
            labels, 
            datasets: [{
                data, 
                borderColor: col, 
                borderWidth: 2, 
                tension: 0.42,
                pointBackgroundColor: col,
                pointRadius: ctx => ctx.dataIndex === data.length - 1 ? 5 : 3,
                fill: true,
                backgroundColor(ctx) {
                    const chart = ctx.chart;
                    const {ctx: c, chartArea} = chart;
                    if (!chartArea) return null;
                    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    g.addColorStop(0, col + '28'); 
                    g.addColorStop(1, col + '00'); 
                    return g;
                }
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            animation: {duration: 280},
            plugins: {
                legend: {display: false},
                tooltip: {
                    callbacks: {label: c => '₹' + c.raw.toFixed(2)},
                    backgroundColor: dark ? '#1c1c27' : '#ffffff',
                    titleColor: dark ? '#f0f0f5' : '#0f0f14',
                    bodyColor: dark ? '#9090a8' : '#555560',
                    borderColor: dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)',
                    borderWidth: 1, 
                    cornerRadius: 8, 
                    padding: 10
                }
            },
            scales: {
                x: {display: false}, 
                y: {display: false, min: Math.min(...data) - 0.5, max: Math.max(...data) + 0.5}
            }
        }
    });
    document.getElementById('cdays').innerHTML = labels.map(d => `<span>${d}</span>`).join('');
}

window.swTab = function(t, btn) {
    document.querySelectorAll('.ctab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    drawChart(t);
}

function renderNB(c) {
    const nb = [...C].filter(x => x.name !== c.name)
        .sort((a, b) => Math.hypot(a.la - c.la, a.lo - c.lo) - Math.hypot(b.la - c.la, b.lo - c.lo))
        .slice(0, 4);
        
    document.getElementById('nb').innerHTML = nb.map(x => `
        <div class="nb-row" onclick='window.setCityC("${x.name}")'>
            <div><div class="nb-city">${x.name}</div><div class="nb-st">${x.state}</div></div>
            <div class="nb-pp">
                <div class="nv p">₹${x.p.toFixed(2)}</div>
                <div class="nv d">₹${x.d.toFixed(2)}</div>
            </div>
        </div>`).join('');
}

window.setCityC = function(name) {
    const c = C.find(x => x.name === name);
    if(c) setCity(c, true);
};

function renderCmp() {
    const base = city || C[0];
    const ch2 = document.getElementById('chips');
    
    ch2.innerHTML = cmpCities.map(c => `
        <div class="chip" onclick="rmCmp('${c.name}')">
            ${c.name}
            <button class="chip-x"><i data-lucide="x" width="10" height="10"></i></button>
        </div>`).join('');
        
    if(cmpCities.length < 4) {
        ch2.innerHTML += `<div class="add-chip" onclick="openM('cmp')"><i data-lucide="plus" width="12" height="12"></i> Add city</div>`;
    }
    
    if(window.lucide) lucide.createIcons();
    
    if(cmpCities.length === 0) {
        document.getElementById('crows').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--t2);">Add cities to compare</div>';
        document.getElementById('ins').style.display = 'none';
        return;
    }
    
    const sorted = [...cmpCities].sort((a, b) => a.p - b.p);
    const cheap = sorted[0];
    const exp = sorted[sorted.length - 1];
    
    document.getElementById('crows').innerHTML = cmpCities.map(c => {
        const diff = +(c.p - base.p).toFixed(2);
        const dc = diff > 0 ? 'pos' : diff < 0 ? 'neg' : '';
        const dcTxt = (diff > 0 ? '+' : '') + diff.toFixed(2);
        return `
            <div class="cmp-row${c.name === cheap.name ? ' cheap' : ''}">
                <div><div class="cr-city">${c.name}</div><div class="cr-st">${c.state}</div></div>
                <div class="cr-v p">₹${c.p.toFixed(2)}</div>
                <div class="cr-v d">₹${c.d.toFixed(2)}</div>
                <div class="cr-v ${dc}">${dcTxt}</div>
            </div>`;
    }).join('');
    
    if(cmpCities.length > 1) {
        const sav = (exp.p - cheap.p).toFixed(2);
        document.getElementById('ins').style.display = 'flex';
        document.getElementById('ins').innerHTML = `
            <i data-lucide="lightbulb" width="18" height="18" style="color:var(--pe); flex-shrink:0; margin-top:2px;"></i>
            <span>Petrol is <b>₹${sav} cheaper in ${cheap.name}</b> than ${exp.name} — fill up there!</span>`;
        if(window.lucide) lucide.createIcons();
    } else {
        document.getElementById('ins').style.display = 'none';
    }
}

window.rmCmp = function(n) {
    cmpCities = cmpCities.filter(c => c.name !== n);
    renderCmp();
}

window.openM = function(f = 'home') {
    mfor = f;
    document.getElementById('modal').classList.add('on');
    // Pre-populate list
    renderCL(C);
    setTimeout(() => {
        const inp = document.getElementById('minp');
        inp.value = '';
        inp.focus();
    }, 200);
}

window.openAbout = function() {
    document.getElementById('about-modal').classList.add('on');
}

window.maybeClose = function(e) {
    if(e.target.classList.contains('mover')) {
        e.target.classList.remove('on');
    }
}

window.closeM = function(id = 'modal') {
    document.getElementById(id).classList.remove('on');
}

function renderCL(list) {
    document.getElementById('mlist').innerHTML = list.map(c => `
        <div class="mitem" onclick="selC('${c.name}')">
            <div class="mi-name">${c.name}</div>
            <div class="mi-st">${c.state}</div>
        </div>`).join('');
}

window.filterC = function(q) {
    renderCL(C.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.state.toLowerCase().includes(q.toLowerCase())));
}

window.selC = function(name) {
    const c = C.find(x => x.name === name);
    if(!c) return;
    
    if(mfor === 'cmp') {
        if(!cmpCities.find(x => x.name === c.name) && cmpCities.length < 4) {
            cmpCities.push(c);
            renderCmp();
        }
    } else {
        setCity(c, true);
    }
    window.closeM();
}

let cur = 'home';
window.goS = function(s) {
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.remove('hide', 'left');
        if(el.id !== 's-' + s) el.classList.add('hide');
    });
    
    document.getElementById('s-' + s).classList.remove('hide', 'left');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    
    const nav = document.getElementById('n-' + s);
    if(nav) nav.classList.add('on');
    
    cur = s;
    if(s === 'compare') renderCmp();
}

function setTheme(isDark, persist = false) {
    dark = isDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (persist) localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    
    if(dark) {
        document.querySelector('.icon-sun').style.display = 'block';
        document.querySelector('.icon-moon').style.display = 'none';
    } else {
        document.querySelector('.icon-sun').style.display = 'none';
        document.querySelector('.icon-moon').style.display = 'block';
    }
    
    if(ch) setTimeout(() => drawChart(tab), 60);
}

document.getElementById('thbtn').onclick = function() {
    setTheme(!dark, true);
};

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.mover.on').forEach(m => m.classList.remove('on'));
});

// Start logic
window.addEventListener('DOMContentLoaded', init);

// PWA Install Logic
let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.installApp = function() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      deferredPrompt = null;
    });
  } else {
    alert("App is already installed, or your browser blocked the prompt (e.g. running in simple browser tab without HTTPS).");
  }
};

// Refresh data — clears cached prices.js and reloads fresh data from server
window.refreshData = async function() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  
  try {
    // Delete prices.js from service worker cache
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      for (const key of keys) {
        if (key.url.includes('prices.js')) {
          await cache.delete(key);
        }
      }
    }
    
    // Force-fetch fresh prices.js from network (bypass cache)
    const resp = await fetch('./data/prices.js?t=' + Date.now(), { cache: 'no-store' });
    const text = await resp.text();
    
    // Execute the fresh script to update FUEL_DATA
    const fn = new Function(text + '\nreturn FUEL_DATA;');
    const freshData = fn();
    
    // Re-apply
    C = freshData.cities || [];
    HIST = freshData.history || {};
    if (!C.length) throw new Error('No cities in refreshed data');

    updatedAt = freshData.updatedAt;
    document.getElementById('update-time').textContent = freshnessText(updatedAt);
    renderGlobalRates();

    // Keep the comparison list pointing at the refreshed city objects
    cmpCities = cmpCities.map(c => C.find(x => x.name === c.name)).filter(Boolean);

    // Re-set city (use saved or current)
    const savedName = localStorage.getItem('fuelrate_city');
    const match = savedName ? C.find(c => c.name === savedName) : null;
    setCity(match || (city && C.find(c => c.name === city.name)) || C[0]);
    if (cur === 'compare') renderCmp();
    
    // Also refresh the SW itself
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'REFRESH' });
    }
    
  } catch (e) {
    console.error('Refresh failed:', e);
    document.getElementById('update-time').textContent = 'Refresh failed — check connection';
  }
  
  setTimeout(() => btn.classList.remove('spinning'), 700);
};
