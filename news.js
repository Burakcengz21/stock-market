// js/news.js

const NEWS_API_KEY = 'fcd853c2ef8d4168b46a4eab5281da6a';
const pageSize     = 4;
let currentPage    = 1;
const gridEl       = document.querySelector('.news-grid');
const loadMoreBtn  = document.getElementById('load-more-btn');

// Kullanıcı kontrolü
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('stockify_current_user')) || null;
}

async function fetchNews(page = 1) {
  const url = `https://newsapi.org/v2/everything?` +
              `q=stock%20OR%20crypto&` +
              `pageSize=${pageSize}&page=${page}&` +
              `apiKey=${NEWS_API_KEY}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message);
  return json.articles;
}

function renderArticles(articles) {
  articles.forEach(a => {
    const img = a.urlToImage || 'https://via.placeholder.com/300x180?text=No+Image';
    const card = document.createElement('article');
    card.className = 'news-card';
    card.innerHTML = `
      <img src="${img}" alt="${a.title}">
      <div class="news-content">
        <h3>${a.title}</h3>
        <div class="meta"><i class="fa-regular fa-calendar"></i> ${new Date(a.publishedAt).toLocaleDateString()}</div>
        <p>${a.description || ''}</p>
        <a href="${a.url}" target="_blank" class="read-more">
          Read More <i class="fas fa-arrow-right"></i>
        </a>
      </div>`;
    gridEl.appendChild(card);
  });
}

async function loadMore() {
  try {
    const articles = await fetchNews(currentPage);
    renderArticles(articles);
    currentPage++;
  } catch (err) {
    alert('Error loading news: ' + err.message);
  }
}

// İlk yükleme - Kullanıcı kontrolü ile
window.addEventListener('DOMContentLoaded', () => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'Login-register.html';
    return;
  }
  loadMore();
});

// Load More butonu
loadMoreBtn.addEventListener('click', loadMore);
