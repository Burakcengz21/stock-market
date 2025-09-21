// js/app.js

// 1) Twelve Data API anahtarınızı buraya yapıştırın
const TWELVE_API_KEY = '1594770918234460900d5176b42b72b1';

// 2) İzlenecek dört hisse ve DOM element eşleştirmeleri
const stocks = {
  apple:     { symbol: 'AAPL', priceEl: 'price-apple',    chartEl: 'chart-apple'    },
  microsoft: { symbol: 'MSFT', priceEl: 'price-microsoft',chartEl: 'chart-microsoft'},
  amazon:    { symbol: 'AMZN', priceEl: 'price-amazon',   chartEl: 'chart-amazon'   },
  tesla:     { symbol: 'TSLA', priceEl: 'price-tesla',    chartEl: 'chart-tesla'    },
};

// 3) Günlük (EOD) son 10 kapanışı çekip hem fiyatı hem grafiği güncelleyen fonksiyon
async function updateStock(stockKey) {
  const { symbol, priceEl, chartEl } = stocks[stockKey];
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}` +
              `&interval=1day&outputsize=10&apikey=${TWELVE_API_KEY}`;

  try {
    const res  = await fetch(url);
    const json = await res.json();

    if (json.status === 'error') {
      throw new Error(json.message);
    }

    // Zaman serisini eski→yeni sıraya çevir
    const series = json.values.reverse();

    // En son kapanış fiyatı
    const lastClose = parseFloat(series.at(-1).close).toFixed(2);
    document.getElementById(priceEl).textContent = `${lastClose} USD`;

    // Grafik için etiketler ve veri seti
    const labels = series.map(v => v.datetime);
    const data   = series.map(v => parseFloat(v.close));

    const ctx = document.getElementById(chartEl).getContext('2d');
    new Chart(ctx, {
      type:    'line',
      data:    {
        labels,
        datasets: [{
          data,
          tension:    0.3,
          borderWidth:2,
          fill:       false
        }]
      },
      options: {
        animation: false,
        scales:    { x:{ display:false }, y:{ display:false } },
        plugins:   { legend:{ display:false } },
        elements:  { point:{ radius:0 } }
      }
    });

  } catch (err) {
    console.error(`Error loading ${symbol}:`, err);
    // Hata durumunda fiyatı temizle
    document.getElementById(priceEl).textContent = `— USD`;
  }
}

// 4) Sayfa yüklendiğinde ve her 5 dakikada bir veriyi güncelle
window.addEventListener('DOMContentLoaded', () => {
  Object.keys(stocks).forEach(updateStock);
  setInterval(() => {
    Object.keys(stocks).forEach(updateStock);
  }, 5 * 60 * 1000);
});
