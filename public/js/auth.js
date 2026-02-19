// ==================== AUTH PAGE LOGIC ====================

// Tab switching
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const authSwitch = document.getElementById('authSwitch');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        authSwitch.innerHTML = `<span data-i18n="noAccount">${t('noAccount')}</span> <a onclick="switchTab('register')" data-i18n="register">${t('register')}</a>`;
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        authSwitch.innerHTML = `<span data-i18n="hasAccount">${t('hasAccount')}</span> <a onclick="switchTab('login')" data-i18n="login">${t('login')}</a>`;
    }
}

// Password visibility toggle
function togglePasswordVisibility(btn) {
    const input = btn.previousElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('loginSubmit');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast(t('email') + ' & ' + t('password') + ' are required', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        setToken(data.token);
        setUser(data.user);
        showToast(t('signInSuccess'), 'success');

        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 800);
    } catch (error) {
        showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = t('loginBtn');
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('registerSubmit');
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Client-side validation
    if (!username || !email || !password || !confirmPassword) {
        showToast('All fields are required', 'error');
        return;
    }

    if (username.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
        const data = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        setToken(data.token);
        setUser(data.user);
        showToast(t('signUpSuccess'), 'success');

        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 800);
    } catch (error) {
        showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = t('registerBtn');
    }
}

// Google Sign In (placeholder — requires Google Client ID)
function handleGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.prompt();
    } else {
        showToast('Google Sign-In is not configured yet. Please add your Google Client ID.', 'warning');
    }
}

// Initialize Google Sign In if Client ID is available
function initGoogleSignIn() {
    // This will be activated once the Google Client ID is set in .env
    // The server would need to expose it, or it can be hardcoded here
    const clientId = null; // Replace with actual client ID

    if (clientId && typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
                try {
                    const data = await apiRequest('/api/auth/google', {
                        method: 'POST',
                        body: JSON.stringify({ credential: response.credential })
                    });

                    setToken(data.token);
                    setUser(data.user);
                    showToast(t('signInSuccess'), 'success');

                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 800);
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    }
}

// Check if already logged in
if (getToken()) {
    window.location.href = '/dashboard';
}
