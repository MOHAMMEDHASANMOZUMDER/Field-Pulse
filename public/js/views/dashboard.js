/**
 * Dashboard View
 */
const DashboardView = {
  async render() {
    const stats = await DB.getSyncStats();
    const submissions = await DB.getAll(DB.STORES.SUBMISSIONS);
    const routes = await DB.getAll(DB.STORES.ROUTES);
    const photos = await DB.getAll(DB.STORES.PHOTOS);

    const totalSubmissions = submissions.length;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaySubmissions = submissions.filter(s => s.createdAt >= todayStart.getTime()).length;
    const activeRoutes = routes.filter(r => r.status === 'recording').length;

    const syncPercent = stats.total > 0 ? Math.round(((stats.synced) / stats.total) * 100) : 100;
    const gaugeClass = syncPercent >= 80 ? 'gauge-fill-success' : syncPercent >= 50 ? 'gauge-fill-warning' : 'gauge-fill-danger';
    const circumference = 2 * Math.PI * 45;
    const dashoffset = circumference - (syncPercent / 100) * circumference;

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <!-- Quick Actions -->
      <div class="quick-actions-grid" style="margin-bottom:var(--space-xl);">
        <div class="quick-action qa-submit card-interactive" onclick="Router.navigate('submissions')">
          <div class="quick-action-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <span class="quick-action-label">New Submission</span>
          <span class="quick-action-desc">Create form entry</span>
        </div>
        <div class="quick-action qa-route card-interactive" onclick="Router.navigate('routes')">
          <div class="quick-action-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
          </div>
          <span class="quick-action-label">Track Route</span>
          <span class="quick-action-desc">Start GPS tracking</span>
        </div>
        <div class="quick-action qa-capture card-interactive" onclick="Router.navigate('capture')">
          <div class="quick-action-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span class="quick-action-label">Capture</span>
          <span class="quick-action-desc">Photo & signature</span>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row" style="margin-bottom:var(--space-xl);">
        <div class="card">
          <div class="stat-icon" style="background:rgba(var(--accent-primary-rgb),0.1);color:var(--accent-primary);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="stat-card">
            <span class="stat-value">${totalSubmissions}</span>
            <span class="stat-label">Total Submissions</span>
          </div>
        </div>
        <div class="card">
          <div class="stat-icon" style="background:rgba(var(--accent-info-rgb),0.1);color:var(--accent-info);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="stat-card">
            <span class="stat-value">${todaySubmissions}</span>
            <span class="stat-label">Today</span>
          </div>
        </div>
        <div class="card">
          <div class="stat-icon" style="background:rgba(var(--accent-success-rgb),0.1);color:var(--accent-success);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div class="stat-card">
            <span class="stat-value">${photos.length}</span>
            <span class="stat-label">Photos</span>
          </div>
        </div>
        <div class="card">
          <div class="stat-icon" style="background:rgba(var(--accent-danger-rgb),0.1);color:var(--accent-danger);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
          </div>
          <div class="stat-card">
            <span class="stat-value">${routes.length}</span>
            <span class="stat-label">Routes</span>
          </div>
        </div>
      </div>

      <!-- Sync Gauge + Activity Feed -->
      <div class="dashboard-grid">
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div class="card-subtitle" style="margin-bottom:var(--space-lg);">Sync Status</div>
          <div class="gauge-container">
            <svg class="gauge-svg" viewBox="0 0 100 100">
              <circle class="gauge-bg" cx="50" cy="50" r="45"/>
              <circle class="gauge-fill ${gaugeClass}" cx="50" cy="50" r="45"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashoffset}"/>
            </svg>
            <div class="gauge-label">
              <div class="gauge-value">${syncPercent}%</div>
              <div class="gauge-text">Synced</div>
            </div>
          </div>
          <div style="display:flex;gap:var(--space-lg);margin-top:var(--space-lg);">
            <div class="text-center">
              <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--accent-success);">${stats.synced || 0}</div>
              <div style="font-size:var(--text-xs);color:var(--text-dim);">Synced</div>
            </div>
            <div class="text-center">
              <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--accent-primary);">${stats.pending || 0}</div>
              <div style="font-size:var(--text-xs);color:var(--text-dim);">Pending</div>
            </div>
            <div class="text-center">
              <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--accent-danger);">${stats.failed || 0}</div>
              <div style="font-size:var(--text-xs);color:var(--text-dim);">Failed</div>
            </div>
          </div>
        </div>

        <div class="card dashboard-wide">
          <div class="card-header">
            <div>
              <div class="card-title">Recent Activity</div>
              <div class="card-subtitle">Latest field operations</div>
            </div>
          </div>
          <div class="activity-feed" id="activityFeed">
            ${await this._renderActivityFeed(submissions, routes, photos)}
          </div>
        </div>
      </div>
    `;
  },

  async _renderActivityFeed(submissions, routes, photos) {
    const items = [
      ...submissions.map(s => ({
        type: 'submission',
        title: `Form submitted: ${s.customerName || 'Untitled'}`,
        time: s.createdAt,
        status: s.syncStatus,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        color: 'var(--accent-primary)'
      })),
      ...photos.map(p => ({
        type: 'photo',
        title: 'Photo captured',
        time: p.createdAt,
        status: p.syncStatus,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
        color: 'var(--accent-success)'
      })),
      ...routes.map(r => ({
        type: 'route',
        title: `Route ${r.status === 'recording' ? 'started' : 'completed'}`,
        time: r.startTime,
        status: r.syncStatus,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>',
        color: 'var(--accent-info)'
      }))
    ].sort((a, b) => b.time - a.time).slice(0, 8);

    if (items.length === 0) {
      return `<div class="empty-state" style="padding:var(--space-xl);">
        <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div class="empty-state-title">No activity yet</div>
        <div class="empty-state-text">Start by creating a submission or tracking a route</div>
      </div>`;
    }

    return items.map(item => {
      const badge = item.status === 'synced'
        ? '<span class="badge badge-synced badge-dot">Synced</span>'
        : item.status === 'failed'
        ? '<span class="badge badge-failed badge-dot">Failed</span>'
        : '<span class="badge badge-pending badge-dot badge-pulse">Pending</span>';

      return `<div class="activity-item">
        <div class="activity-dot" style="background:${item.color}22;color:${item.color};">${item.icon}</div>
        <div class="activity-content">
          <div class="activity-text">${item.title}</div>
          <div class="activity-time">${this._timeAgo(item.time)}</div>
        </div>
        <div class="list-item-meta">${badge}</div>
      </div>`;
    }).join('');
  },

  _timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
};
