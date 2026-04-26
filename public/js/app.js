/**
 * App Bootstrap
 */
const App = {
  async init() {
    try {
      // Initialize database
      await DB.init();

      // Initialize components
      Toast.init();
      ConnectionIndicator.init();

      // Bind navigation events
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          Router.navigate(item.dataset.route);
        });
      });

      // Mobile menu toggle
      document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('visible');
      });

      document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('visible');
      });

      // Sync button
      document.getElementById('syncBtn').addEventListener('click', () => {
        if (navigator.onLine) {
          SyncEngine.triggerSync();
          Toast.info('Syncing', 'Sync started...');
        } else {
          Toast.warning('Offline', 'Cannot sync while offline');
        }
      });

      // Check authentication
      const token = localStorage.getItem('fp_token');
      const user = localStorage.getItem('fp_user');

      if (token && user) {
        this.onAuthSuccess(JSON.parse(user));
      } else {
        this.showLogin();
      }

      // Initialize login view
      LoginView.init();

      // Register service worker
      this.registerServiceWorker();

    } catch (err) {
      console.error('App init error:', err);
      Toast.error('Error', 'Failed to initialize app');
    }
  },

  showLogin() {
    document.getElementById('loginPage').style.display = '';
    document.getElementById('appShell').style.display = 'none';
  },

  onAuthSuccess(user) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appShell').style.display = '';

    // Update user info in sidebar
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    if (avatar) avatar.textContent = (user.name || user.username || 'FP').substring(0, 2).toUpperCase();
    if (name) name.textContent = user.name || user.username || 'Field Worker';

    // Initialize sync engine
    SyncEngine.init();

    // Initialize router
    Router.init();
  },

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', reg.scope);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    }
  }
};

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
