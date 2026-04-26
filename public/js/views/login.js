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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('fp_token', data.token);
      localStorage.setItem('fp_user', JSON.stringify(data.user));
      App.onAuthSuccess(data.user);
    } catch (err) {
      if (!navigator.onLine && !this.isRegister) {
        // Offline login: check cached credentials
        const cachedUser = localStorage.getItem('fp_user');
        if (cachedUser) {
          App.onAuthSuccess(JSON.parse(cachedUser));
          Toast.info('Offline Mode', 'Signed in with cached credentials');
          return;
        }
      }
      errorEl.textContent = err.message || 'Network error. Please try again.';
      errorEl.style.display = 'block';
    } finally {
      btn.classList.remove('btn-loading');
    }
  },
};
