// 1) API Keys
const TD_KEY   = '1594770918234460900d5176b42b72b1';
const NEWS_KEY = 'fcd853c2ef8d4168b46a4eab5281da6a';

// 2) Kullanıcı yönetimi - script.js'den fonksiyonları kullan
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('stockify_current_user')) || null;
}

function getUserFavs(userId) {
  return JSON.parse(localStorage.getItem(`favs_${userId}`)) || [];
}

function setUserFavs(userId, favs) {
  localStorage.setItem(`favs_${userId}`, JSON.stringify(favs));
}

// 3) Theme Management
function getCurrentTheme() {
  return localStorage.getItem('stockify_theme') || 'light';
}

function setTheme(theme) {
  localStorage.setItem('stockify_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeButton(theme);
}

function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

function updateThemeButton(theme) {
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'light' ? '<i class="fas fa-moon"></i> Dark' : '<i class="fas fa-sun"></i> Light';
  }
}

// 4) Popular coins list (her zaman sabit)
const popularCoins = [
  { symbol: 'BTC/USD', name: 'Bitcoin' },
  { symbol: 'ETH/USD', name: 'Ethereum' },
  { symbol: 'SOL/USD', name: 'Solana' },
  { symbol: 'DOGE/USD', name: 'Dogecoin' }
];

const countryMap = {
  US: { flag: '🇺🇸', name: 'USA' },
  DE: { flag: '🇩🇪', name: 'Germany' },
  JP: { flag: '🇯🇵', name: 'Japan' },
  GB: { flag: '🇬🇧', name: 'UK' }
};

async function detectCountryAndRender() {
  let countryText = '🌐 Global';
  try {
    const geoRes = await fetch('https://ipapi.co/json/');
    const geo = await geoRes.json();
    if (geo && geo.country_code && countryMap[geo.country_code]) {
      const c = countryMap[geo.country_code];
      countryText = `${c.flag} ${c.name}`;
    }
  } catch {}
  document.getElementById('country-info').textContent = countryText;
  renderPopularCoins();
}

function renderPopularCoins() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }

  const grid = document.getElementById('popular-coins-grid');
  grid.innerHTML = '';
  popularCoins.forEach(async coin => {
    const card = document.createElement('div');
    card.className = 'card';
    // Fiyat ve günlük değişim çek
    let priceText = '— USD';
    let changeHtml = '';
    try {
      // Günlük zaman serisi ile açılış ve kapanış fiyatı al
      const res = await fetch(`https://api.twelvedata.com/time_series?symbol=${coin.symbol}&interval=1day&outputsize=2&apikey=${TD_KEY}`);
      const j = await res.json();
      if (j.values && j.values.length) {
        const today = j.values[0];
        const open = parseFloat(today.open);
        const close = parseFloat(today.close);
        priceText = `${close.toFixed(2)} USD`;
        if (!isNaN(open) && !isNaN(close) && open > 0) {
          const perc = ((close - open) / open) * 100;
          const up = perc > 0;
          const down = perc < 0;
          changeHtml = `<span style="font-size:.98em;font-weight:600;color:${up ? 'var(--positive-color)' : down ? 'var(--negative-color)' : 'var(--text-muted)'};margin-left:.5em;">${up ? '+' : ''}${perc.toFixed(2)}%</span>`;
        }
      }
    } catch {}
    // Haber çek
    let newsHtml = '<span style="color:var(--text-muted);font-size:.95em;">No recent news</span>';
    try {
      const article = await fetchNews(coin.symbol.split('/')[0]);
      if (article) {
        const img = article.urlToImage || 'https://via.placeholder.com/60x40?text=No+Img';
        newsHtml = `<div class="fav-news"><img src="${img}" alt="" /><a class="news-link" href="${article.url}" target="_blank">${article.title}</a></div>`;
      }
    } catch {}
    // Favoride mi kontrol et
    const favs = getUserFavs(currentUser.id);
    const isFav = favs.includes(coin.symbol);
    card.innerHTML = `
      <div class="card-header">${coin.name} <span style="font-size:0.9em;opacity:.7;">(${coin.symbol})</span></div>
      <div class="card-body">
        <div class="price">${priceText} ${changeHtml}</div>
        ${newsHtml}
      </div>
      <div class="card-footer">
        <button class="add-fav-btn" data-symbol="${coin.symbol}" data-name="${coin.name}" ${isFav ? 'disabled' : ''}>${isFav ? 'Added' : 'Add to Favorites'}</button>
      </div>
    `;
    grid.appendChild(card);
  });
  // Butonlara event bağla
  setTimeout(() => {
    document.querySelectorAll('.add-fav-btn').forEach(btn => {
      btn.onclick = e => {
        const symbol = btn.dataset.symbol;
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        let favs = getUserFavs(currentUser.id);
        if (!favs.includes(symbol)) {
          favs.push(symbol);
          setUserFavs(currentUser.id, favs);
          btn.textContent = 'Added';
          btn.disabled = true;
          renderFavorites();
        }
      };
    });
  }, 300);
}

// 5) Fetch price & dates
async function fetchSeries(symbol) {
  const res = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${symbol}`
    + `&interval=1day&outputsize=10&apikey=${TD_KEY}`
  );
  const json = await res.json();
  if (json.status==='error' || !json.values) {
    throw new Error(json.message||'No data');
  }
  return json.values.reverse().map(v=>({
    date: new Date(v.datetime),
    close: parseFloat(v.close)
  }));
}

// 6) Fetch one news
async function fetchNews(symbol) {
  const res = await fetch(
    `https://newsapi.org/v2/everything?` +
    `q=${encodeURIComponent(symbol)}&pageSize=1&apiKey=${NEWS_KEY}`
  );
  const json = await res.json();
  if (json.status!=='ok' || !json.articles.length) return null;
  return json.articles[0];
}

// 7) Render favorites (only coins)
async function renderFavorites() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const favs = getUserFavs(currentUser.id);
  const favGrid = document.getElementById('favorites-container');
  const favSection = document.getElementById('favorites-section');
  favGrid.innerHTML = '';
  if (!favs.length) {
    favSection.style.display = 'none';
    return;
  }
  favSection.style.display = 'block';
  for (let sym of favs) {
    // Coin adı için popularCoins listesinden bul
    const coin = popularCoins.find(c => c.symbol === sym) || { name: sym, symbol: sym };
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${sym}`;
    card.innerHTML = `
      <div class="card-header">${coin.name} <span style="font-size:0.9em;opacity:.7;">(${coin.symbol})</span></div>
      <div class="card-body">
        <div class="price" id="price-${sym}">-- USD</div>
        <canvas id="chart-${sym}" height="80"></canvas>
        <div class="fav-news" id="news-${sym}"><span>Loading news…</span></div>
      </div>
      <div class="card-footer">
        <button class="remove-fav" data-symbol="${sym}">Remove</button>
      </div>`;
    favGrid.appendChild(card);
    // price & chart
    fetchSeries(sym)
      .then(series => {
        document.getElementById(`price-${sym}`).textContent =
          `${series.at(-1).close.toFixed(2)} USD`;
        const ctx = document.getElementById(`chart-${sym}`).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, 'rgba(30,58,138,0.18)');
        gradient.addColorStop(1, 'rgba(30,58,138,0)');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: series.map(p => p.date),
            datasets: [{
              data: series.map(p => p.close),
              fill: true,
              backgroundColor: gradient,
              borderColor: '#1e88e5',
              borderWidth: 2.5,
              pointRadius: 3,
              pointBackgroundColor: '#ffcc00',
              pointBorderColor: '#fff',
              pointHoverRadius: 7,
              pointHoverBackgroundColor: '#0e0972',
              tension: 0.35
            }]
          },
          options: {
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#fff',
                titleColor: '#0e0972',
                bodyColor: '#1e3a8a',
                borderColor: '#ffcc00',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                  label: ctx => ` Fiyat: $${ctx.parsed.y.toFixed(2)}`
                }
              }
            },
            scales: {
              x: {
                type: 'time',
                time: { unit: 'day', tooltipFormat: 'MMM d' },
                grid: { color: 'rgba(30,58,138,0.07)' },
                ticks: { autoSkip: true, maxTicksLimit: 5, color: '#1e3a8a', font: { weight: 'bold', size: 10 } }
              },
              y: {
                grid: { color: 'rgba(30,58,138,0.07)' },
                ticks: { color: '#1e3a8a', font: { weight: 'bold', size: 10 }, callback: v => `$${v}` }
              }
            }
          }
        });
      })
      .catch(err => console.error(`Series ${sym}`, err));
    // news
    fetchNews(sym)
      .then(article => {
        const el = document.getElementById(`news-${sym}`);
        if (article) {
          const img = article.urlToImage ||
                      'https://via.placeholder.com/60x40?text=No+Img';
          el.innerHTML = `
            <img src="${img}" alt="" />
            <a class="news-link" href="${article.url}" target="_blank">
              ${article.title}
            </a>`;
        } else {
          el.textContent = 'No recent news';
        }
      })
      .catch(err => console.error(`News ${sym}`, err));
  }
  // remove buttons
  document.querySelectorAll('.remove-fav').forEach(btn => {
    btn.onclick = () => {
      const s = btn.dataset.symbol;
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      
      const favs = getUserFavs(currentUser.id);
      setUserFavs(currentUser.id, favs.filter(x => x !== s));
      renderFavorites();
    };
  });
}

// 8) Init
window.addEventListener('DOMContentLoaded', () => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }
  
  // Theme initialization
  const savedTheme = getCurrentTheme();
  setTheme(savedTheme);
  
  // Add theme toggle button to header
  const header = document.querySelector('header nav');
  if (header && !document.querySelector('.theme-toggle')) {
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle';
    themeBtn.onclick = toggleTheme;
    updateThemeButton(savedTheme);
    header.appendChild(themeBtn);
  }
  
  // Kullanıcı adını göster
  document.getElementById('welcome-name').textContent = currentUser.name;
  
  detectCountryAndRender();
  renderFavorites();
});
