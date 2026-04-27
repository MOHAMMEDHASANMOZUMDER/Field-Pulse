/**
 * Login View — Real-world authentication
 * Supports: Email registration, Email login, Google OAuth,
 *           Email verification, Forgot/Reset password
 */
const LoginView = {
  isRegister: false,
  pendingEmail: null,
  resetToken: null,

  init() {
    // Main auth form
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

    // Google Sign-In
    const googleBtn = document.getElementById('googleSignInBtn');
    googleBtn.addEventListener('click', () => this.initGoogleSignIn());

    // Forgot password
    document.getElementById('forgotPasswordLink').addEventListener('click', e => {
      e.preventDefault();
      this.showPanel('forgotPanel');
    });

    document.getElementById('forgotForm').addEventListener('submit', e => {
      e.preventDefault();
      this.handleForgotPassword();
    });

    document.getElementById('backToLoginFromForgot').addEventListener('click', e => {
      e.preventDefault();
      this.showPanel('authPanel');
    });

    // Reset password
    document.getElementById('resetForm').addEventListener('submit', e => {
      e.preventDefault();
      this.handleResetPassword();
    });

    // Verification panel
    document.getElementById('resendVerificationBtn').addEventListener('click', () => {
      this.handleResendVerification();
    });

    document.getElementById('backToLoginLink').addEventListener('click', e => {
      e.preventDefault();
      this.showPanel('authPanel');
    });

    // Check URL for verification result or reset token
    this.checkUrlParams();
  },

  /**
   * Check URL for ?verified= or ?reset= parameters
   */
  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('verified')) {
      const status = params.get('verified');
      if (status === 'success') {
        this.showPanel('authPanel');
        const successEl = document.getElementById('authSuccess');
        successEl.textContent = '✓ Email verified successfully! You can now sign in.';
        successEl.style.display = 'block';
      } else if (status === 'expired') {
        this.showPanel('authPanel');
        const errorEl = document.getElementById('authError');
        errorEl.textContent = 'Verification link expired. Please request a new one.';
        errorEl.style.display = 'block';
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.has('reset')) {
      this.resetToken = params.get('reset');
      this.showPanel('resetPanel');
      window.history.replaceState({}, '', window.location.pathname);
    }
  },

  /**
   * Switch between login/register mode
   */
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
    document.getElementById('forgotPasswordLink').style.display = this.isRegister ? 'none' : '';
    this.clearMessages();
  },

  /**
   * Show a specific panel (authPanel, verificationPanel, forgotPanel, resetPanel)
   */
  showPanel(panelId) {
    ['authPanel', 'verificationPanel', 'forgotPanel', 'resetPanel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = id === panelId ? '' : 'none';
    });
  },

  clearMessages() {
    ['authError', 'authSuccess', 'forgotError', 'forgotSuccess', 'resetError', 'resetSuccess'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
  },

  // ─────────────────────────────────────────
  // Email Sign-Up / Sign-In
  // ─────────────────────────────────────────
  async handleSubmit() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');
    const btn = document.getElementById('authSubmitBtn');

    this.clearMessages();

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }

    btn.classList.add('btn-loading');

    try {
      const endpoint = this.isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = this.isRegister ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Check if server returned actual JSON (not Vercel SPA HTML fallback)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Server API not available — use local fallback
        this._localAuthFallback(email, password, name);
        return;
      }

      const data = await res.json();

      if (data.requiresVerification) {
        // Registration success — show verification panel
        this.pendingEmail = email;
        document.getElementById('verificationEmail').textContent =
          `We've sent a verification link to ${email}`;
        this.showPanel('verificationPanel');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Login success
      localStorage.setItem('fp_token', data.token);
      localStorage.setItem('fp_user', JSON.stringify(data.user));
      App.onAuthSuccess(data.user);
    } catch (err) {
      // Network error — try local fallback
      try {
        this._localAuthFallback(email, password, name);
      } catch (localErr) {
        errorEl.textContent = localErr.message || err.message || 'Network error. Please try again.';
        errorEl.style.display = 'block';
      }
    } finally {
      btn.classList.remove('btn-loading');
    }
  },

  // ─────────────────────────────────────────
  // Google OAuth
  // ─────────────────────────────────────────
  initGoogleSignIn() {
    // Check if Google SDK is loaded
    if (typeof google === 'undefined' || !google.accounts) {
      // Try a popup-based approach without the SDK
      this.googlePopupFallback();
      return;
    }

    google.accounts.id.initialize({
      client_id: window.GOOGLE_CLIENT_ID || '',
      callback: (response) => this.handleGoogleCallback(response),
      auto_select: false,
    });

    // If client_id is not configured, show a message
    if (!window.GOOGLE_CLIENT_ID) {
      Toast.warning('Google Sign-In', 'Google Client ID not configured. Set GOOGLE_CLIENT_ID in your environment.');
      return;
    }

    google.accounts.id.prompt();
  },

  googlePopupFallback() {
    if (!window.GOOGLE_CLIENT_ID) {
      Toast.warning('Google Sign-In', 'Google Sign-In requires a Google Client ID to be configured.');
      return;
    }

    // Open Google OAuth consent screen in a popup
    const redirectUri = encodeURIComponent(window.location.origin + '/api/auth/google/callback');
    const scope = encodeURIComponent('openid email profile');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${window.GOOGLE_CLIENT_ID}&response_type=id_token&redirect_uri=${redirectUri}&scope=${scope}&nonce=${Date.now()}`;

    const popup = window.open(url, 'googleSignIn', 'width=500,height=600');
    if (!popup) {
      Toast.error('Popup Blocked', 'Please allow popups for Google Sign-In');
    }
  },

  async handleGoogleCallback(response) {
    if (!response.credential) return;

    const errorEl = document.getElementById('authError');
    this.clearMessages();

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server API not available');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google sign-in failed');
      }

      localStorage.setItem('fp_token', data.token);
      localStorage.setItem('fp_user', JSON.stringify(data.user));
      App.onAuthSuccess(data.user);
      Toast.success('Welcome!', `Signed in as ${data.user.name}`);
    } catch (err) {
      errorEl.textContent = err.message || 'Google sign-in failed. Please try again.';
      errorEl.style.display = 'block';
    }
  },

  // ─────────────────────────────────────────
  // Forgot Password
  // ─────────────────────────────────────────
  async handleForgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    const errorEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');
    const btn = document.getElementById('forgotSubmitBtn');

    this.clearMessages();

    if (!email) {
      errorEl.textContent = 'Please enter your email';
      errorEl.style.display = 'block';
      return;
    }

    btn.classList.add('btn-loading');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server API not available');
      }

      const data = await res.json();
      successEl.textContent = data.message || 'If an account exists, a reset link has been sent.';
      successEl.style.display = 'block';
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to send reset email. Please try again.';
      errorEl.style.display = 'block';
    } finally {
      btn.classList.remove('btn-loading');
    }
  },

  // ─────────────────────────────────────────
  // Reset Password
  // ─────────────────────────────────────────
  async handleResetPassword() {
    const password = document.getElementById('resetPassword').value;
    const confirm = document.getElementById('resetPasswordConfirm').value;
    const errorEl = document.getElementById('resetError');
    const successEl = document.getElementById('resetSuccess');
    const btn = document.getElementById('resetSubmitBtn');

    this.clearMessages();

    if (!password || !confirm) {
      errorEl.textContent = 'Please fill in both fields';
      errorEl.style.display = 'block';
      return;
    }

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.style.display = 'block';
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      errorEl.style.display = 'block';
      return;
    }

    btn.classList.add('btn-loading');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.resetToken, newPassword: password }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server API not available');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      successEl.textContent = data.message || 'Password reset! You can now sign in.';
      successEl.style.display = 'block';

      // Switch to login after 2 seconds
      setTimeout(() => {
        this.showPanel('authPanel');
        this.clearMessages();
        const authSuccess = document.getElementById('authSuccess');
        authSuccess.textContent = '✓ Password reset successfully. Sign in with your new password.';
        authSuccess.style.display = 'block';
      }, 2000);
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to reset password. Please try again.';
      errorEl.style.display = 'block';
    } finally {
      btn.classList.remove('btn-loading');
    }
  },

  // ─────────────────────────────────────────
  // Resend Verification
  // ─────────────────────────────────────────
  async handleResendVerification() {
    const btn = document.getElementById('resendVerificationBtn');
    btn.classList.add('btn-loading');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.pendingEmail }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        Toast.success('Email Sent', data.message || 'Verification email resent!');
      }
    } catch (err) {
      Toast.error('Error', 'Failed to resend verification email');
    } finally {
      btn.classList.remove('btn-loading');
    }
  },

  // ─────────────────────────────────────────
  // Offline / no-backend fallback
  // ─────────────────────────────────────────
  _localAuthFallback(email, password, name) {
    const accounts = JSON.parse(localStorage.getItem('fp_local_accounts') || '{}');

    if (this.isRegister) {
      if (accounts[email]) {
        throw new Error('An account with this email already exists');
      }
      const user = {
        id: 'local-' + Date.now(),
        email,
        name: name || email.split('@')[0],
        role: 'technician',
        auth_provider: 'local',
      };
      accounts[email] = { password, user };
      localStorage.setItem('fp_local_accounts', JSON.stringify(accounts));
      localStorage.setItem('fp_user', JSON.stringify(user));
      App.onAuthSuccess(user);
      Toast.success('Account Created', 'Signed up in offline mode');
    } else {
      const entry = accounts[email];
      if (entry && entry.password === password) {
        localStorage.setItem('fp_user', JSON.stringify(entry.user));
        App.onAuthSuccess(entry.user);
        Toast.info('Offline Mode', 'Signed in with local credentials');
        return;
      }
      const cachedUser = localStorage.getItem('fp_user');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed.email === email) {
          App.onAuthSuccess(parsed);
          Toast.info('Offline Mode', 'Signed in with cached credentials');
          return;
        }
      }
      throw new Error('Invalid email or password');
    }
  },
};
