/**
 * Connection Indicator Component
 * Monitors online/offline/syncing states and updates UI
 */
const ConnectionIndicator = {
  isOnline: navigator.onLine,
  isSyncing: false,
  listeners: [],

  init() {
    window.addEventListener('online', () => this._setStatus(true));
    window.addEventListener('offline', () => this._setStatus(false));
    this._updateUI();
  },

  _setStatus(online) {
    this.isOnline = online;
    this._updateUI();
    this._notify();
    if (online && typeof SyncEngine !== 'undefined') {
      SyncEngine.triggerSync();
    }
  },

  setSyncing(syncing) {
    this.isSyncing = syncing;
    this._updateUI();
  },

  _updateUI() {
    const bar = document.getElementById('connectionBar');
    const status = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    const banner = document.getElementById('offlineBanner');

    if (bar) {
      bar.className = 'connection-bar';
      if (this.isSyncing) bar.classList.add('syncing');
      else if (this.isOnline) bar.classList.add('online');
      else bar.classList.add('offline');
    }

    if (status) {
      status.className = 'sidebar-connection';
      if (this.isSyncing) { status.classList.add('syncing'); if (text) text.textContent = 'Syncing...'; }
      else if (this.isOnline) { status.classList.add('online'); if (text) text.textContent = 'Connected'; }
      else { status.classList.add('offline'); if (text) text.textContent = 'Offline'; }
    }

    if (banner) {
      banner.classList.toggle('visible', !this.isOnline);
    }
  },

  onChange(callback) {
    this.listeners.push(callback);
  },

  _notify() {
    this.listeners.forEach(cb => cb(this.isOnline));
  },

  getStatus() {
    if (this.isSyncing) return 'syncing';
    return this.isOnline ? 'online' : 'offline';
  }
};
