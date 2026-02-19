// ==================== THEME TOGGLE ====================
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.innerHTML = isDark ? '☀️' : '🌙';
        btn.title = isDark ? 'Light Mode' : 'Dark Mode';
    }
}

// ==================== LANGUAGE TOGGLE ====================
let currentLang = localStorage.getItem('lang') || 'en';
let translations = {};

async function loadLanguage(lang) {
    try {
        const res = await fetch(`/lang/${lang}.json`);
        translations = await res.json();
        currentLang = lang;
        localStorage.setItem('lang', lang);
        applyTranslations();
        applyDirection();
        updateLangIcon();
    } catch (err) {
        console.error('Failed to load language:', err);
    }
}

function toggleLanguage() {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    loadLanguage(newLang);
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (el.tagName === 'INPUT' && el.type !== 'submit') {
                el.placeholder = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });
}

function applyDirection() {
    if (currentLang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
    }
}

function updateLangIcon() {
    const btn = document.getElementById('langToggle');
    if (btn) {
        btn.textContent = currentLang === 'en' ? 'AR' : 'EN';
    }
}

function t(key) {
    return translations[key] || key;
}

// ==================== TOAST SYSTEM ====================
function getToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'info') {
    const container = getToastContainer();
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.position = 'relative';
    toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    <div class="toast-progress"></div>
  `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ==================== AUTH HELPERS ====================
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = '/auth';
        return false;
    }
    return true;
}

// ==================== API HELPER ====================
async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const res = await fetch(url, { ...options, headers });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Something went wrong');
        }

        return data;
    } catch (error) {
        if (error.message === 'Token is not valid' || error.message === 'No token, authorization denied') {
            logout();
            return;
        }
        throw error;
    }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateThemeIcon();
    loadLanguage(currentLang);
});

// Global Error Handler
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast(event.reason.message || 'An unexpected error occurred', 'error');
});
