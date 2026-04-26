/**
 * Login View
 */
const LoginView = {
  isRegister: false,

  init() {
    const form = document.getElementById('authForm');
    const toggleLink = document.getElementById('authToggleLink');

    form.addEventListener('submit', e => {
      e.preventDefault();
      this.handleSubmit();
    });

    toggleLink.addEventListener('click', e => {
      e.preventDefault();
      this.toggleMode();
    });
  },

  toggleMode() {
    this.isRegister = !this.isRegister;
    document.getElementById('authFormTitle').textContent = this.isRegister ? 'Create account' : 'Welcome back';
    document.getElementById('authFormSubtitle').textContent = this.isRegister
      ? 'Set up your FieldPulse account'
      : 'Sign in to your FieldPulse account';
    document.getElementById('nameField').style.display = this.isRegister ? '' : 'none';
    document.getElementById('authSubmitBtn').querySelector('.btn-text').textContent = this.isRegister ? 'Create Account' : 'Sign In';
    document.getElementById('authToggleText').textContent = this.isRegister ? 'Already have an account?' : "Don't have an account?";
    document.getElementById('authToggleLink').textContent = this.isRegister ? 'Sign in' : 'Create one';
    document.getElementById('authError').style.display = 'none';
  },

  async handleSubmit() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();
    const errorEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmitBtn');

    if (!username || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }

    btn.classList.add('btn-loading');
    errorEl.style.display = 'none';

    try {
      const endpoint = this.isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = this.isRegister ? { username, password, name } : { username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // If the server returned a real response (not a 404 fallback)
      if (res.status !== 404) {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        localStorage.setItem('fp_token', data.token);
        localStorage.setItem('fp_user', JSON.stringify(data.user));
        App.onAuthSuccess(data.user);
        return;
      }

      // Server API not available — use local auth fallback
      this._localAuthFallback(username, password, name);
    } catch (err) {
      // Network error (offline or server unreachable)
      try {
        this._localAuthFallback(username, password, name);
      } catch (localErr) {
        errorEl.textContent = localErr.message || 'Network error. Please try again.';
        errorEl.style.display = 'block';
      }
    } finally {
      btn.classList.remove('btn-loading');
    }
  },

  /**
   * Offline / no-backend auth: stores credentials in localStorage
   */
  _localAuthFallback(username, password, name) {
    const accounts = JSON.parse(localStorage.getItem('fp_local_accounts') || '{}');

    if (this.isRegister) {
      if (accounts[username]) {
        throw new Error('Username already exists');
      }
      const user = {
        id: 'local-' + Date.now(),
        username,
        name: name || username,
        role: 'technician',
      };
      accounts[username] = { password, user };
      localStorage.setItem('fp_local_accounts', JSON.stringify(accounts));
      localStorage.setItem('fp_user', JSON.stringify(user));
      App.onAuthSuccess(user);
      Toast.success('Account Created', 'Your account was created locally (offline mode)');
    } else {
      // Login — check local accounts first, then cached session
      const entry = accounts[username];
      if (entry && entry.password === password) {
        localStorage.setItem('fp_user', JSON.stringify(entry.user));
        App.onAuthSuccess(entry.user);
        Toast.info('Offline Mode', 'Signed in with local credentials');
        return;
      }
      // Fall back to any cached session
      const cachedUser = localStorage.getItem('fp_user');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed.username === username) {
          App.onAuthSuccess(parsed);
          Toast.info('Offline Mode', 'Signed in with cached credentials');
          return;
        }
      }
      throw new Error('Invalid credentials or no local account found');
    }
  },
};

