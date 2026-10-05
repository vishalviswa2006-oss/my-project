const API_BASE = '/api';

const getToken = () => localStorage.getItem('dailyHabitTrackerToken');

const setToken = (token) => {
  if (token) {
    localStorage.setItem('dailyHabitTrackerToken', token);
  } else {
    localStorage.removeItem('dailyHabitTrackerToken');
  }
};

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const showMessage = (messageEl, text, type = 'success') => {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message-box ${type}`;
  messageEl.classList.remove('hidden');
};

const redirectIfLoggedOut = () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
  }
};

const attachAuthForms = () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '').trim();
      const messageBox = document.getElementById('authMessage');

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed.');
        }

        setToken(data.token);
        showMessage(messageBox, data.message || 'Login successful.', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 600);
      } catch (error) {
        showMessage(messageBox, error.message, 'error');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '').trim();
      const messageBox = document.getElementById('authMessage');

      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed.');
        }

        setToken(data.token);
        showMessage(messageBox, data.message || 'Registration successful.', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 600);
      } catch (error) {
        showMessage(messageBox, error.message, 'error');
      }
    });
  }

  const logoutButton = document.getElementById('logoutBtn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      } finally {
        setToken(null);
        window.location.href = '/login.html';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  attachAuthForms();

  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    redirectIfLoggedOut();
  }

  if (window.location.pathname === '/login.html' || window.location.pathname === '/register.html') {
    const token = getToken();
    if (token) {
      window.location.href = '/';
    }
  }
});
