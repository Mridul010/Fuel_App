let C = [];
let HIST = {};
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

let city = null, ch = null, tab = 'p', cmpCities = [], mfor = 'home', dark = true;

// Initialize icons and data
async function init() {
    // Initialize Lucide icons
    if(window.lucide) {
        lucide.createIcons();
    }

    const d = new Date();
    document.getElementById('dtp').textContent = 
        d.toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'});
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme(false);
    }

    try {
        // Use global FUEL_DATA loaded from prices.js
        const data = FUEL_DATA;
        C = data.cities;
        HIST = data.history;
        
        // Update freshness
        const updatedAt = new Date(data.updatedAt);
        const timeStr = updatedAt.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata'});
        document.getElementById('update-time').textContent = `Updated today at ${timeStr} IST`;

        // LPG and CNG are now city-specific and updated in setCity()

        // Default cities for comparison
        cmpCities = [C[0], C.find(c => c.name === 'Delhi') || C[1], C.find(c => c.name === 'Mumbai') || C[2]];
        
        // Location logic
        const savedCityName = localStorage.getItem('fuelrate_city');
        const savedCity = savedCityName ? C.find(c => c.name === savedCityName) : null;
        
        if (savedCity) {
            setCity(savedCity);
        } else if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                p => setCity(nearest(p.coords.latitude, p.coords.longitude)),
                () => setCity(C[0]),
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
    return C.reduce((b, c) => Math.hypot(c.la - la, c.lo - lo) < Math.hypot(b.la - la, b.lo - lo) ? c : b);
}

function setCity(c) {
    if(!c) return;
    city = c;
    localStorage.setItem('fuelrate_city', c.name);
    document.getElementById('lcity').textContent = c.name + ', ' + c.state;
    countUp('pp', c.p); 
    countUp('dp', c.d);
    
    // Dynamic Location-based LPG & CNG & Crude
    if (c.lpg) {
        document.getElementById('ui-lpg').textContent = '₹' + Math.floor(c.lpg);
        if(document.getElementById('ui-lpg-rate')) {
            document.getElementById('ui-lpg-rate').textContent = '₹' + c.lpg.toFixed(2);
            document.getElementById('ui-lpg-rate').previousElementSibling.innerHTML = `<div class="r-name">LPG Cylinder</div><div class="r-sub">${c.state} Avg (14.2 kg)</div>`;
        }
    } else {
        document.getElementById('ui-lpg').textContent = '—';
        if(document.getElementById('ui-lpg-rate')) document.getElementById('ui-lpg-rate').textContent = '—';
    }
    if (c.cng) {
        document.getElementById('ui-cng').textContent = '₹' + Math.floor(c.cng);
        if(document.getElementById('ui-cng-rate')) {
            document.getElementById('ui-cng-rate').textContent = '₹' + c.cng.toFixed(2);
            document.getElementById('ui-cng-rate').previousElementSibling.innerHTML = `<div class="r-name">CNG</div><div class="r-sub">${c.state} Avg (per kg)</div>`;
        }
    } else {
        document.getElementById('ui-cng').textContent = '—';
        if(document.getElementById('ui-cng-rate')) document.getElementById('ui-cng-rate').textContent = '—';
    }
    // Crude usually isn't city specific but update if the data object passes it along with city
    if (c.crude) {
        if(document.getElementById('ui-cr')) document.getElementById('ui-cr').textContent = '$' + c.crude;
    }
    
    // Calculate simple badge change based on last history (mock for now)
    const pDiff = +(c.p - HIST.p[5]).toFixed(2);
    const dDiff = +(c.d - HIST.d[5]).toFixed(2);
    badge('pb', pDiff);
    badge('db', dDiff);
    
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
    el.className = 'cbadge ' + (diff > 0 ? 'up' : diff < 0 ? 'dn' : 'nn');
    
    let icon = diff > 0 ? 'trending-up' : diff < 0 ? 'trending-down' : 'minus';
    let text = diff > 0 ? `₹${diff}` : diff < 0 ? `₹${Math.abs(diff)}` : 'No change';
    
    el.innerHTML = `<i data-lucide="${icon}" width="12" height="12"></i> ${text}`;
    if(window.lucide) lucide.createIcons();
}

function getCv(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

function drawChart(t) {
    tab = t;
    const data = HIST[t];
    if(!data) return;
    
    const col = t === 'p' ? getCv('--pe') : getCv('--di');
    const cv = document.getElementById('cv');
    
    if(ch) ch.destroy();
    
    ch = new Chart(cv, {
        type: 'line',
        data: {
            labels: DAYS, 
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
    document.getElementById('cdays').innerHTML = DAYS.map(d => `<span>${d}</span>`).join('');
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
    if(c) setCity(c);
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
        const diff = (c.p - base.p).toFixed(2);
        const dc = diff > 0 ? 'pos' : diff < 0 ? 'neg' : '';
        const dcTxt = diff > 0 ? '+' + diff : diff;
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
        setCity(c);
    }
    window.closeM();
}

let cur = 'home';
window.goS = function(s) {
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.remove('hide', 'left');
        if(el.id !== 's-' + s) el.classList.add(cur === 'home' && s !== 'home' ? 'hide' : 'hide');
    });
    
    document.getElementById('s-' + s).classList.remove('hide', 'left');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    
    const nav = document.getElementById('n-' + s);
    if(nav) nav.classList.add('on');
    
    cur = s;
    if(s === 'compare') renderCmp();
}

function setTheme(isDark) {
    dark = isDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    
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
    setTheme(!dark);
};

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
    C = freshData.cities;
    HIST = freshData.history;
    
    const updatedAt = new Date(freshData.updatedAt);
    const timeStr = updatedAt.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata'});
    document.getElementById('update-time').textContent = `Updated today at ${timeStr} IST`;
    
    // Re-set city (use saved or current)
    const savedName = localStorage.getItem('fuelrate_city');
    const match = savedName ? C.find(c => c.name === savedName) : null;
    setCity(match || city || C[0]);
    
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
