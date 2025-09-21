// js/script.js

// -----------------------
// A) TOGGLE LOGIC
// -----------------------
const container   = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn    = document.getElementById('login');

registerBtn.addEventListener('click', () => {
  container.classList.add('active');
});
loginBtn.addEventListener('click', () => {
  container.classList.remove('active');
});

// -----------------------
// B) MULTI-USER AUTH LOGIC
// -----------------------
const $ = sel => document.querySelector(sel);

// Kullanıcıları localStorage'dan al veya boş array oluştur
function getUsers() {
  return JSON.parse(localStorage.getItem('stockify_users')) || [];
}

function setUsers(users) {
  localStorage.setItem('stockify_users', JSON.stringify(users));
}

// Aktif kullanıcıyı localStorage'dan al
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('stockify_current_user')) || null;
}

function setCurrentUser(user) {
  localStorage.setItem('stockify_current_user', JSON.stringify(user));
}

// Kullanıcıya özel favoriler
function getUserFavs(userId) {
  return JSON.parse(localStorage.getItem(`favs_${userId}`)) || [];
}

function setUserFavs(userId, favs) {
  localStorage.setItem(`favs_${userId}`, JSON.stringify(favs));
}

// Kullanıcıya özel portföy
function getUserPortfolio(userId) {
  return JSON.parse(localStorage.getItem(`portfolio_${userId}`)) || [];
}

function setUserPortfolio(userId, portfolio) {
  localStorage.setItem(`portfolio_${userId}`, JSON.stringify(portfolio));
}

// Kullanıcıya özel nakit
function getUserCash(userId) {
  return parseFloat(localStorage.getItem(`portfolio_cash_${userId}`)) || 5000;
}

function setUserCash(userId, amount) {
  localStorage.setItem(`portfolio_cash_${userId}`, amount.toFixed(2));
}

// REGISTER HANDLER
const regForm = $('#register-form');
if (regForm) {
  regForm.addEventListener('submit', e => {
    e.preventDefault();
    const name     = $('#reg-name').value.trim();
    const surname  = $('#reg-surname').value.trim();
    const email    = $('#reg-email').value.trim();
    const pass     = $('#reg-password').value;
    const confirm  = $('#reg-confirm').value;
    const errDiv   = $('#register-error');
    errDiv.textContent = '';

    if (!name || !surname || !email || !pass || !confirm) {
      errDiv.textContent = 'Please fill in all fields.';
      return;
    }
    if (pass !== confirm) {
      errDiv.textContent = 'Passwords do not match.';
      return;
    }

    // Email kontrolü
    const users = getUsers();
    if (users.find(u => u.email === email)) {
      errDiv.textContent = 'This email is already registered.';
      return;
    }

    // Yeni kullanıcı oluştur
    const newUser = {
      id: Date.now().toString(), // Basit ID oluştur
      name,
      surname,
      email,
      password: pass,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    setUsers(users);

    container.classList.remove('active');
    $('#login-error').textContent = 'Registration successful! Please sign in.';
    $('#login-email').value = email;
  });
}

// LOGIN HANDLER
const loginForm = $('#login-form');
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const emailIn = $('#login-email').value.trim();
    const passIn  = $('#login-password').value;
    const errDiv  = $('#login-error');
    errDiv.textContent = '';

    const users = getUsers();
    const user = users.find(u => u.email === emailIn && u.password === passIn);

    if (user) {
      setCurrentUser(user);
      window.location.href = 'Main.html';
    } else {
      errDiv.textContent = 'Email or password is incorrect.';
    }
  });
}
