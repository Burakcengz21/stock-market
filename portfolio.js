// js/portfolio.js

// Kullanıcı yönetimi fonksiyonları
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('stockify_current_user')) || null;
}

// Portföyü localStorage'dan oku - Kullanıcıya özel
function getUserPortfolio(userId) {
  return JSON.parse(localStorage.getItem(`portfolio_${userId}`)) || [];
}

function setUserPortfolio(userId, portfolio) {
  localStorage.setItem(`portfolio_${userId}`, JSON.stringify(portfolio));
}

function getUserCash(userId) {
  return parseFloat(localStorage.getItem(`portfolio_cash_${userId}`)) || 5000;
}

function setUserCash(userId, amount) {
  localStorage.setItem(`portfolio_cash_${userId}`, amount.toFixed(2));
}

// API key (aynı TwelveData)
// ancak portföy güncel fiyatı almak için örneğin Price endpoint'ini kullanacağız.
const TWELVE_API_KEY = '1594770918234460900d5176b42b72b1';

// Helper: symbol için güncel fiyat çek
async function fetchPrice(symbol) {
  const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVE_API_KEY}`;
  try {
    const res = await fetch(url);
    const j   = await res.json();
    if (!j.price || isNaN(parseFloat(j.price))) return null;
    return parseFloat(j.price);
  } catch {
    return null;
  }
}

// Helper: 30 günlük portföy değeri için basit random örnek
function generatePortfolioSeries(totalStart) {
  const arr = [];
  let val = totalStart;
  for (let i=29;i>=0;i--) {
    // her gün ±%1 arasında değişim
    val = val * (1 + (Math.random()-0.5)/50);
    arr.push({ x: new Date(Date.now() - i*24*3600e3), y: val });
  }
  return arr;
}

async function fetchSeries(symbol) {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=10&apikey=${TWELVE_API_KEY}`;
  const res = await fetch(url);
  const j = await res.json();
  if (j.status==='error' || !j.values) return [];
  return j.values.reverse().map(v=>({ x: new Date(v.datetime), y: parseFloat(v.close) }));
}

async function renderPortfolio() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }

  const pf = getUserPortfolio(currentUser.id);
  const tbody = document.querySelector('tbody');
  const holdingsSection = document.querySelector('.holdings');
  // Modern kart grid için yeni bir container
  let grid = document.getElementById('holdings-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.id = 'holdings-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(260px, 1fr))';
    grid.style.gap = '1.2rem';
    grid.style.margin = '1.2rem 0';
    holdingsSection.appendChild(grid);
  }
  grid.innerHTML = '';
  // Tabloyu gizle
  const tableWrapper = document.querySelector('.table-wrapper');
  if (tableWrapper) tableWrapper.style.display = 'none';

  if (!pf.length) {
    grid.innerHTML = '<div style="color:var(--text-muted);text-align:center;font-size:1.2rem;padding:2rem;">No holdings yet. Buy stocks from the Detail page!</div>';
    document.querySelector('.total-value .value').textContent = '$0.00';
    const changeDiv = document.querySelector('.today-change');
    if (changeDiv) {
      changeDiv.className = 'today-change';
      changeDiv.innerHTML = '<i class="fas fa-minus"></i> <span>$0.00 (0.00%) Today</span>';
    }
    return;
  }

  let totalValue = 0, totalValueYesterday = 0;
  for (let {symbol,qty,buyPrice} of pf) {
    const current = await fetchPrice(symbol);
    const safeCurrent = (typeof current === 'number' && !isNaN(current)) ? current : 0;
    const market  = safeCurrent * qty;
    const cost    = buyPrice * qty;
    const pl      = market - cost;
    const plPerc  = cost !== 0 ? (pl / cost)*100 : 0;
    totalValue   += market;
    let yesterday = safeCurrent;
    const series = await fetchSeries(symbol);
    if (series.length > 1) {
      yesterday = series[series.length-2].y;
    }
    totalValueYesterday += yesterday * qty;
    // Modern kart oluştur
    const card = document.createElement('div');
    card.className = 'holding-card';
    card.style.background = 'var(--bg-secondary)';
    card.style.borderRadius = '0.7rem';
    card.style.boxShadow = '0 2px 8px var(--shadow-blue-light)';
    card.style.padding = '1rem 1.2rem';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '0.7rem';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.7rem;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent-primary);">${symbol}</div>
        <div style="font-size:0.98rem;color:var(--text-muted);">${qty} shares</div>
      </div>
      <div style="display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap;">
        <div>
          <div style="font-size:0.98rem;color:var(--text-secondary);">Avg Cost</div>
          <div style="font-weight:600;">$${buyPrice.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:0.98rem;color:var(--text-secondary);">Current</div>
          <div style="font-weight:600;color:var(--accent-secondary);">${current === null ? '--' : `$${safeCurrent.toFixed(2)}`}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap;">
        <div>
          <div style="font-size:0.98rem;color:var(--text-secondary);">Value</div>
          <div style="font-weight:600;">${current === null ? '--' : `$${market.toFixed(2)}`}</div>
        </div>
        <div>
          <div style="font-size:0.98rem;color:var(--text-secondary);">P/L</div>
          <div style="font-weight:600;${pl>0?'color:var(--positive-color);':pl<0?'color:var(--negative-color);':''}">${current === null ? '--' : `${pl>0?'+':''}$${pl.toFixed(2)}`}</div>
        </div>
        <div>
          <div style="font-size:0.98rem;color:var(--text-secondary);">P/L %</div>
          <div style="font-weight:600;${plPerc>0?'color:var(--positive-color);':plPerc<0?'color:var(--negative-color);':''}">${current === null ? '--' : `${plPerc>0?'+':''}${plPerc.toFixed(2)}%`}</div>
        </div>
      </div>
      <div style="margin-top:0.5rem;">
        <canvas id="mini-chart-${symbol}" width="120" height="36" style="background:var(--bg-primary);border-radius:5px;"></canvas>
      </div>
    `;
    grid.appendChild(card);
    // Mini grafik çiz
    if (current !== null && series.length) {
      new Chart(document.getElementById(`mini-chart-${symbol}`).getContext('2d'), {
        type:'line',
        data:{ labels: series.map(p=>p.x), datasets:[{
          data: series.map(p=>p.y),
          borderColor:'var(--accent-secondary)',
          backgroundColor:'rgba(30,136,229,0.08)',
          borderWidth:1.2,
          pointRadius:0,
          fill:true,
          tension:0.3
        }]},
        options:{
          animation:false,
          plugins:{legend:{display:false},tooltip:{enabled:false}},
          scales:{x:{display:false},y:{display:false}},
        }
      });
    }
  }
  document.querySelector('.total-value .value').textContent = `$${isNaN(totalValue) ? '0.00' : totalValue.toFixed(2)}`;
  const changeDiv = document.querySelector('.today-change');
  if (changeDiv) {
    let diff = totalValue - totalValueYesterday;
    let perc = totalValueYesterday !== 0 ? (diff / totalValueYesterday) * 100 : 0;
    let up = diff > 0;
    let down = diff < 0;
    changeDiv.className = 'today-change' + (up ? ' up' : (down ? ' down' : ''));
    changeDiv.innerHTML = `<i class="fas fa-arrow-${up?'up':down?'down':'right'}"></i> <span>${diff>0?'+':''}$${diff.toFixed(2)} (${perc>0?'+':''}${perc.toFixed(2)}%) Today</span>`;
  }
}

window.addEventListener('DOMContentLoaded', renderPortfolio);

function updateCashBalance() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const cash = getUserCash(currentUser.id);
  const el = document.querySelector('.portfolio-metrics .metric-card:nth-child(2) .metric-value');
  if (el) el.textContent = `$${cash.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}

// Modal açma/kapama
const fundsModal = document.getElementById('funds-modal');
const fundsClose = document.getElementById('funds-close');
const fundsTitle = document.getElementById('funds-title');
const fundsForm = document.getElementById('funds-form');
const fundsAmount = document.getElementById('funds-amount');
const fundsCardFields = document.getElementById('funds-card-fields');
const fundsConfirm = document.getElementById('funds-confirm');

function openFundsModal(type) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }

  fundsModal.style.display = 'flex';
  fundsForm.reset();
  fundsAmount.value = '';
  if (type === 'add') {
    fundsTitle.textContent = 'Add Funds';
    fundsCardFields.style.display = 'block';
  } else {
    fundsTitle.textContent = 'Withdraw';
    fundsCardFields.style.display = 'none';
  }
  fundsConfirm.onclick = async function(e) {
    e.preventDefault();
    const amount = parseFloat(fundsAmount.value);
    if (!amount || amount <= 0) return alert('Please enter a valid amount.');
    if (type === 'add') {
      // Basit validasyon
      if (!document.getElementById('card-name').value.trim() ||
          !document.getElementById('card-number').value.trim() ||
          !document.getElementById('card-expiry').value.trim() ||
          !document.getElementById('card-cvc').value.trim()) {
        alert('Please fill in all card details.');
        return;
      }
      setUserCash(currentUser.id, getUserCash(currentUser.id) + amount);
    } else {
      if (amount > getUserCash(currentUser.id)) return alert('Insufficient balance!');
      setUserCash(currentUser.id, getUserCash(currentUser.id) - amount);
    }
    fundsModal.style.display = 'none';
    updateCashBalance();
  };
}
if (fundsClose) fundsClose.onclick = () => { fundsModal.style.display = 'none'; };
window.onclick = function(e) { if (e.target === fundsModal) fundsModal.style.display = 'none'; };

// Butonlara bağla
window.addEventListener('DOMContentLoaded', () => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }
  
  updateCashBalance();
  const addBtn = document.querySelector('.btn-primary');
  const withdrawBtn = document.querySelector('.btn-outline');
  if (addBtn) addBtn.onclick = () => openFundsModal('add');
  if (withdrawBtn) withdrawBtn.onclick = () => openFundsModal('withdraw');
});
