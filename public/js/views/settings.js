/**
 * Settings View
 */
const SettingsView = {
  async render() {
    const user = JSON.parse(localStorage.getItem('fp_user') || '{}');
    const storage = await DB.getStorageEstimate();
    const autoSync = await DB.getSetting('autoSync', true);
    const syncInterval = await DB.getSetting('syncInterval', 30);
    const submissions = await DB.count(DB.STORES.SUBMISSIONS);
    const photos = await DB.count(DB.STORES.PHOTOS);
    const signatures = await DB.count(DB.STORES.SIGNATURES);
    const routes = await DB.count(DB.STORES.ROUTES);

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <!-- Profile -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <div class="card-title">Profile</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-lg);">
          <div class="avatar avatar-lg">${(user.name || user.username || 'FP').substring(0, 2).toUpperCase()}</div>
          <div>
            <div style="font-size:var(--text-lg);font-weight:var(--weight-semibold);">${user.name || user.username || 'Field Worker'}</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary);">@${user.username || 'user'}</div>
          </div>
        </div>
      </div>

      <!-- Sync Settings -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <div class="card-title">Sync Settings</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-lg);">
          <div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);">Auto Sync</div>
            <div style="font-size:var(--text-xs);color:var(--text-secondary);">Automatically sync when online</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="autoSyncToggle" ${autoSync ? 'checked' : ''} onchange="SettingsView.updateSetting('autoSync', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Sync Interval (seconds)</label>
          <select class="form-select" id="syncIntervalSelect" onchange="SettingsView.updateSetting('syncInterval', parseInt(this.value))">
            <option value="15" ${syncInterval === 15 ? 'selected' : ''}>15 seconds</option>
            <option value="30" ${syncInterval === 30 ? 'selected' : ''}>30 seconds</option>
            <option value="60" ${syncInterval === 60 ? 'selected' : ''}>1 minute</option>
            <option value="300" ${syncInterval === 300 ? 'selected' : ''}>5 minutes</option>
          </select>
        </div>
      </div>

      <!-- Data Usage -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <div class="card-title">Data & Storage</div>
        </div>
        <div style="margin-bottom:var(--space-lg);">
          <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-sm);">
            <span style="font-size:var(--text-sm);">Storage Used</span>
            <span style="font-size:var(--text-sm);color:var(--text-secondary);">${this._formatBytes(storage.usage)} / ${this._formatBytes(storage.quota)}</span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-fill" style="width:${Math.min(storage.percent, 100)}%;"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-md);">
          <div style="padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);">${submissions}</div>
            <div style="font-size:var(--text-xs);color:var(--text-secondary);">Submissions</div>
          </div>
          <div style="padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);">${photos}</div>
            <div style="font-size:var(--text-xs);color:var(--text-secondary);">Photos</div>
          </div>
          <div style="padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);">${signatures}</div>
            <div style="font-size:var(--text-xs);color:var(--text-secondary);">Signatures</div>
          </div>
          <div style="padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);">${routes}</div>
            <div style="font-size:var(--text-xs);color:var(--text-secondary);">Routes</div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <div class="card-title">Actions</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
          <button class="btn btn-secondary w-full" onclick="SyncEngine.triggerSync()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <span class="btn-text">Force Sync Now</span>
          </button>
          <button class="btn btn-danger w-full" onclick="SettingsView.clearData()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span class="btn-text">Clear All Local Data</span>
          </button>
          <button class="btn btn-ghost w-full" onclick="SettingsView.logout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="btn-text">Log Out</span>
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="card">
        <div style="text-align:center;color:var(--text-dim);font-size:var(--text-xs);">
          <div style="font-weight:var(--weight-semibold);margin-bottom:4px;">FieldPulse v1.0.0</div>
          <div>Offline-first field service management</div>
        </div>
      </div>
    `;
  },

  async updateSetting(key, value) {
    await DB.setSetting(key, value);
    if (key === 'syncInterval') {
      SyncEngine.startAutoSync(value * 1000);
    }
    Toast.success('Setting Updated', `${key} has been updated`);
  },

  async clearData() {
    if (!confirm('Are you sure? This will delete all local data including unsynced items.')) return;
    await DB.clear(DB.STORES.SUBMISSIONS);
    await DB.clear(DB.STORES.PHOTOS);
    await DB.clear(DB.STORES.SIGNATURES);
    await DB.clear(DB.STORES.ROUTES);
    await DB.clear(DB.STORES.ROUTE_POINTS);
    await DB.clear(DB.STORES.SYNC_QUEUE);
    Toast.success('Data Cleared', 'All local data has been removed');
    this.render();
  },

  logout() {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    location.reload();
  },

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};
