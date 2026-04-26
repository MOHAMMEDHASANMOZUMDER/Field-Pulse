/**
 * SPA Router — Hash-based navigation
 */
const Router = {
  routes: {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of your field operations',
      render: () => DashboardView.render(),
    },
    submissions: {
      title: 'New Submission',
      subtitle: 'Create a new field report',
      render: () => SubmissionsView.render(),
    },
    capture: {
      title: 'Photo & Signature',
      subtitle: 'Capture media for your records',
      render: () => CaptureView.render(),
    },
    routes: {
      title: 'Routes',
      subtitle: 'GPS route tracking',
      render: () => RoutesView.render(),
    },
    history: {
      title: 'History',
      subtitle: 'All submissions and sync status',
      render: () => HistoryView.render(),
    },
    settings: {
      title: 'Settings',
      subtitle: 'Preferences and data management',
      render: () => SettingsView.render(),
    },
  },

  currentRoute: 'dashboard',

  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute();
  },

  navigate(route) {
    window.location.hash = route;
  },

  _handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const route = this.routes[hash];

    if (!route) {
      this.navigate('dashboard');
      return;
    }

    this.currentRoute = hash;

    // Update page header
    document.getElementById('pageTitle').textContent = route.title;
    document.getElementById('pageSubtitle').textContent = route.subtitle;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });

    // Render view
    const pageContent = document.getElementById('pageContent');
    pageContent.style.animation = 'none';
    pageContent.offsetHeight; // Force reflow
    pageContent.style.animation = 'fadeInUp var(--duration-slow) var(--ease-out)';
    route.render();

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
  }
};
