// Favori yönetimi - Kullanıcıya özel
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('stockify_current_user')) || null;
}

function getUserFavs(userId) {
  return JSON.parse(localStorage.getItem(`favs_${userId}`)) || [];
}

function setUserFavs(userId, favs) {
  localStorage.setItem(`favs_${userId}`, JSON.stringify(favs));
}

function getUserPortfolio(userId) {
  return JSON.parse(localStorage.getItem(`portfolio_${userId}`)) || [];
}

function setUserPortfolio(userId, portfolio) {
  localStorage.setItem(`portfolio_${userId}`, JSON.stringify(portfolio));
}

// API KEY'ler
const TWELVE_KEY = '1594770918234460900d5176b42b72b1';
const NEWS_KEY   = 'fcd853c2ef8d4168b46a4eab5281da6a';

// Elementler
const inputEl  = document.getElementById('symbol-input');
const btnEl    = document.getElementById('search-btn');
const priceEl  = document.querySelector('.current-price');
const titleEl  = document.querySelector('.symbol-block h1');
const iconEl   = document.querySelector('.symbol-block i');
const chartCtx = document.getElementById('detail-chart').getContext('2d');
const metricsEls = document.querySelectorAll('.key-metrics .metric .value');
const newsGrid   = document.querySelector('.detail-news .news-grid');
const intervalBtns = document.querySelectorAll('.interval-buttons button');
let detailChart, currentInterval = '1day';

// Kendi coin listeniz (manuel eklenmiş coinler)
const customCoins = [
  { symbol: "NIT", name: "Nitcoin", description: "Custom coin example" }
];

// Sembol doğrulama
async function validateSymbol(q) {
  try {
    const r = await fetch(`https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${TWELVE_KEY}`);
    const j = await r.json();
    if (j.status === 'error' || !j.data?.length) {
      // API'dan sonuç yoksa custom coin listesine bak
      const custom = customCoins.find(x => x.symbol.toUpperCase() === q.toUpperCase() || x.name.toLowerCase() === q.toLowerCase());
      if (custom) {
        return { symbol: custom.symbol, name: custom.name };
      }
      throw new Error('No result found for this symbol. Please check the symbol and try again.');
    }
    // Önce tam sembol eşleşmesi ara
    let m = j.data.find(x => x.symbol.toUpperCase() === q.toUpperCase());
    // Tam eşleşme yoksa ilk sonucu al
    if (!m) m = j.data[0];
    // Eğer tam eşleşme yoksa ve aranan sembol ile ilk sonuç farklıysa, kullanıcıya uyarı ver
    if (m.symbol.toUpperCase() !== q.toUpperCase()) {
      throw new Error('No exact match found. Please check the symbol.');
    }
    // İsim önceliği: name > instrument_name > (currency_base/currency_quote) > symbol
    let displayName = m.name || m.instrument_name;
    if (!displayName && m.currency_base && m.currency_quote) {
      displayName = `${m.currency_base} / ${m.currency_quote}`;
    }
    if (!displayName) {
      displayName = m.symbol;
    }
    return { symbol: m.symbol.toUpperCase(), name: displayName };
  } catch (err) {
    // API hatası olursa custom coin listesine bak
    const custom = customCoins.find(x => x.symbol.toUpperCase() === q.toUpperCase() || x.name.toLowerCase() === q.toLowerCase());
    if (custom) {
      return { symbol: custom.symbol, name: custom.name };
    }
    throw err;
  }
}

// Zaman serisi çekme
async function fetchSeries(sym,interval) {
  const url = `https://api.twelvedata.com/time_series?symbol=${sym}`+
              `&interval=${interval}&outputsize=30&apikey=${TWELVE_KEY}`;
  const r = await fetch(url), j = await r.json();
  if (j.status==='error') throw new Error(j.message);
  return j.values.reverse();
}

// Haber çekme
async function fetchNews(sym) {
  const r = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(sym)}&pageSize=5&apiKey=${NEWS_KEY}`);
  const j = await r.json();
  if (j.status!=='ok') throw new Error(j.message);
  return j.articles;
}

// Rastgele metrik üret
function genMetrics(){
  return {
    marketCap:`$${(Math.random()*100).toFixed(2)}T`,
    peRatio:(Math.random()*30).toFixed(2),
    divYield:(Math.random()*5).toFixed(2)+'%',
    high52:`$${(100+Math.random()*100).toFixed(2)}`,
    low52:`$${(50+Math.random()*50).toFixed(2)}`
  };
}

// Veri yükleyici
async function loadDetail(raw){
  try {
    const {symbol,name} = await validateSymbol(raw);
    titleEl.innerHTML=`${name} <span>(${symbol})</span>`;
    iconEl.className='fas fa-chart-line fa-3x';

    // Grafik
    const series = await fetchSeries(symbol,currentInterval);
    const labels = series.map(v=>v.datetime);
    const data   = series.map(v=>parseFloat(v.close));
    const last   = data.at(-1);
    priceEl.textContent=`${last.toFixed(2)} USD`;
    if(detailChart) detailChart.destroy();
    // Nokta ve çizgi boyutunu veri yoğunluğuna göre ayarla
    let pointRadius = 6, pointHoverRadius = 10, borderWidth = 3, fontSize = 14, maxTicks = 8;
    if (labels.length > 20) {
      pointRadius = 3;
      pointHoverRadius = 6;
      borderWidth = 2;
      fontSize = 11;
      maxTicks = 5;
    }
    if (labels.length > 40) {
      pointRadius = 2;
      pointHoverRadius = 4;
      borderWidth = 1.5;
      fontSize = 10;
      maxTicks = 3;
    }

    // Gradient oluştur
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(30,58,138,0.18)');
    gradient.addColorStop(1, 'rgba(30,58,138,0)');

    // --- BULANIKLIK FİXİ ---
    // Canvas'ı temizle ve yüksek DPI için boyutlandır
    const chartCanvas = document.getElementById('detail-chart');
    const dpr = window.devicePixelRatio || 1;
    chartCanvas.width = chartCanvas.offsetWidth * dpr;
    chartCanvas.height = 350 * dpr;
    chartCanvas.style.width = chartCanvas.offsetWidth + 'px';
    chartCanvas.style.height = '350px';
    chartCtx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    // --- BULANIKLIK FİXİ SONU ---

    detailChart = new Chart(chartCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Fiyat',
          data,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#1e3a8a',
          borderWidth,
          pointBackgroundColor: '#ffcc00',
          pointBorderColor: '#fff',
          pointRadius,
          pointHoverRadius,
          pointHoverBackgroundColor: '#0e0972',
          tension: 0.35,
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
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
              label: function(context) {
                return ` Fiyat: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(30,58,138,0.07)' },
            ticks: {
              color: '#1e3a8a',
              font: { weight: 'bold', size: fontSize },
              autoSkip: true,
              maxTicksLimit: maxTicks,
              maxRotation: 0,
              minRotation: 0,
            }
          },
          y: {
            grid: { color: 'rgba(30,58,138,0.07)' },
            ticks: {
              color: '#1e3a8a',
              font: { weight: 'bold', size: fontSize }
            }
          }
        }
      }
    });

    // Metrikler
    const m = genMetrics(),
          vals=[m.marketCap,m.peRatio,m.divYield,m.high52,m.low52];
    metricsEls.forEach((el,i)=>el.textContent=vals[i]);

    // Haberler
    const arts = await fetchNews(symbol);
    document.querySelector('.detail-news h2').textContent = `Latest News on ${symbol}`;
    newsGrid.innerHTML='';
    arts.forEach(a=>{
      const img=a.urlToImage||'https://via.placeholder.com/300x180?text=No+Image';
      const card=document.createElement('article');
      card.className='news-card';
      card.innerHTML=`
        <img src="${img}" alt="">
        <div class="news-content">
          <h3>${a.title}</h3>
          <div class="meta"><i class="fa-regular fa-calendar"></i> ${new Date(a.publishedAt).toLocaleDateString()}</div>
          <a href="${a.url}" target="_blank" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
        </div>`;
      newsGrid.appendChild(card);
    });

    // Favori butonu
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = 'Login-register.html';
      return;
    }

    const fb = document.getElementById('fav-btn'),
          arr = getUserFavs(currentUser.id);
    fb.textContent = arr.includes(symbol)?'Remove from Favorites':'Add to Favorites';
    fb.onclick = ()=>{
      let f = getUserFavs(currentUser.id);
      if(f.includes(symbol)) f=f.filter(s=>s!==symbol);
      else f.push(symbol);
      setUserFavs(currentUser.id, f);
      fb.textContent = f.includes(symbol)?'Remove from Favorites':'Add to Favorites';
    };

    // Buy/Sell butonlarını her yüklemede tekrar seç ve bağla
    const buyBtn = document.getElementById('buy-btn');
    const sellBtn = document.getElementById('sell-btn');
    if (buyBtn && sellBtn) {
      buyBtn.onclick = () => {
        const symbol = document.querySelector('.symbol-block h1 span').textContent.replace(/[()]/g, '');
        const price = parseFloat(document.querySelector('.current-price').textContent);
        openTradeModal('buy', symbol, price);
      };
      sellBtn.onclick = () => {
        const symbol = document.querySelector('.symbol-block h1 span').textContent.replace(/[()]/g, '');
        const price = parseFloat(document.querySelector('.current-price').textContent);
        openTradeModal('sell', symbol, price);
      };
    }

  } catch(err){
    alert(err.message);
  }
}

// Interval butonları
intervalBtns.forEach(b=>{
  b.onclick=()=>{
    intervalBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentInterval = b.dataset.interval;
    if(inputEl.value.trim()) loadDetail(inputEl.value.trim());
    else loadDetail('AAPL');
  };
});

// Olaylar
btnEl.addEventListener('click',()=>{
  const q=inputEl.value.trim();
  if(q) loadDetail(q);
});

// Sayfa yüklendiğinde kullanıcı kontrolü
window.addEventListener('DOMContentLoaded',()=>{
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }
  loadDetail('AAPL');
});

// --- TRADE MODAL LOGIC ---
const tradeModal = document.getElementById('trade-modal');
const tradeClose = document.getElementById('trade-close');
const tradeTitle = document.getElementById('trade-title');

function openTradeModal(type, symbol, price) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }

  tradeModal.style.display = 'flex';
  tradeTitle.textContent = type === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`;
  document.getElementById('trade-price').textContent = price.toFixed(2);
  const qtyInput = document.getElementById('trade-qty');
  const infoDiv = document.getElementById('trade-info');
  const totalDiv = document.getElementById('trade-total');
  const confirmBtn = document.getElementById('trade-confirm');
  qtyInput.value = 1;
  let maxQty = 999999;
  if (type === 'sell') {
    // Portföydeki mevcut adedi bul
    const pf = getUserPortfolio(currentUser.id);
    const pos = pf.find(p => p.symbol === symbol);
    maxQty = pos ? pos.qty : 0;
    qtyInput.max = maxQty;
    infoDiv.innerHTML = `<small>You own: <b>${maxQty}</b> shares</small>`;
    if (maxQty === 0) confirmBtn.disabled = true;
    else confirmBtn.disabled = false;
  } else {
    qtyInput.removeAttribute('max');
    infoDiv.innerHTML = '';
    confirmBtn.disabled = false;
  }
  // Toplamı güncelle
  function updateTotal() {
    let val = parseInt(qtyInput.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (type === 'sell' && val > maxQty) val = maxQty;
    qtyInput.value = val;
    totalDiv.textContent = (val * price).toFixed(2);
    if (type === 'sell') {
      infoDiv.innerHTML = `<small>You own: <b>${maxQty}</b> shares</small>`;
      confirmBtn.disabled = (val > maxQty || maxQty === 0);
    }
  }
  qtyInput.oninput = updateTotal;
  updateTotal();
  // Onayla butonu
  document.getElementById('trade-form').onsubmit = function(e) {
    e.preventDefault();
    const qty = parseInt(qtyInput.value, 10);
    if (type === 'buy') {
      let pf = getUserPortfolio(currentUser.id);
      let pos = pf.find(p => p.symbol === symbol);
      if (pos) {
        // Ortalama maliyetle güncelle
        const totalQty = pos.qty + qty;
        pos.buyPrice = ((pos.buyPrice * pos.qty) + (price * qty)) / totalQty;
        pos.qty = totalQty;
      } else {
        pf.push({ symbol, qty, buyPrice: price });
      }
      setUserPortfolio(currentUser.id, pf);
    } else if (type === 'sell') {
      let pf = getUserPortfolio(currentUser.id);
      let pos = pf.find(p => p.symbol === symbol);
      if (pos) {
        pos.qty -= qty;
        if (pos.qty <= 0) {
          pf = pf.filter(p => p.symbol !== symbol);
        }
        setUserPortfolio(currentUser.id, pf);
      }
    }
    tradeModal.style.display = 'none';
    if (window.location.pathname.toLowerCase().includes('portfolio')) {
      window.location.reload();
    }
  };
}
if (tradeClose) {
  tradeClose.onclick = () => { tradeModal.style.display = 'none'; };
}
window.onclick = function(event) {
  if (event.target === tradeModal) tradeModal.style.display = 'none';
};
