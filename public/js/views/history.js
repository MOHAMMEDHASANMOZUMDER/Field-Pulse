/**
 * History View — All submissions and sync log
 */
const HistoryView = {
  filter: 'all',

  async render() {
    const submissions = await DB.getAll(DB.STORES.SUBMISSIONS);
    const sorted = submissions.sort((a, b) => b.createdAt - a.createdAt);
    const filtered = this.filter === 'all' ? sorted : sorted.filter(s => s.syncStatus === this.filter);

    const counts = {
      all: sorted.length,
      synced: sorted.filter(s => s.syncStatus === 'synced').length,
      pending: sorted.filter(s => s.syncStatus === 'pending').length,
      failed: sorted.filter(s => s.syncStatus === 'failed').length,
    };

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);flex-wrap:wrap;gap:var(--space-md);">
        <div class="tabs" style="border-bottom:none;margin-bottom:0;">
          <button class="tab ${this.filter === 'all' ? 'active' : ''}" onclick="HistoryView.setFilter('all')">All (${counts.all})</button>
          <button class="tab ${this.filter === 'synced' ? 'active' : ''}" onclick="HistoryView.setFilter('synced')">Synced (${counts.synced})</button>
          <button class="tab ${this.filter === 'pending' ? 'active' : ''}" onclick="HistoryView.setFilter('pending')">Pending (${counts.pending})</button>
          <button class="tab ${this.filter === 'failed' ? 'active' : ''}" onclick="HistoryView.setFilter('failed')">Failed (${counts.failed})</button>
        </div>
        ${counts.failed > 0 ? `<button class="btn btn-sm btn-secondary" onclick="HistoryView.retryAll()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 21 12"/></svg>
          <span class="btn-text">Retry Failed</span>
        </button>` : ''}
      </div>

      ${filtered.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
          ${filtered.map(s => {
            const badge = s.syncStatus === 'synced'
              ? '<span class="badge badge-synced badge-dot">Synced</span>'
              : s.syncStatus === 'failed'
              ? '<span class="badge badge-failed badge-dot">Failed</span>'
              : '<span class="badge badge-pending badge-dot badge-pulse">Pending</span>';

            const typeIcon = {
              delivery: '📦', inspection: '🔍', repair: '🔧',
              survey: '📋', installation: '⚙️', sales: '💼', other: '📄'
            };

            return `<div class="card card-interactive" onclick="HistoryView.viewDetail('${s.id}')">
              <div style="display:flex;align-items:center;gap:var(--space-md);">
                <div class="list-item-icon" style="background:rgba(var(--accent-primary-rgb),0.1);font-size:20px;border-radius:var(--radius-md);">
                  ${typeIcon[s.serviceType] || '📄'}
                </div>
                <div class="list-item-content">
                  <div class="list-item-title">${s.customerName || 'Untitled'}</div>
                  <div class="list-item-subtitle">${(s.serviceType || 'general').replace(/-/g, ' ')} • ${new Date(s.createdAt).toLocaleDateString()} ${new Date(s.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <div class="list-item-meta">${badge}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div class="empty-state-title">No submissions found</div>
          <div class="empty-state-text">${this.filter !== 'all' ? 'Try changing the filter' : 'Create your first submission to see it here'}</div>
        </div>
      `}
    `;
  },

  setFilter(filter) {
    this.filter = filter;
    this.render();
  },

  async retryAll() {
    await SyncEngine.retryFailed();
    Toast.info('Retrying', 'Attempting to sync failed items...');
    setTimeout(() => this.render(), 2000);
  },

  async viewDetail(id) {
    const submission = await DB.get(DB.STORES.SUBMISSIONS, id);
    if (!submission) return;

    const photos = await DB.getByIndex(DB.STORES.PHOTOS, 'submissionId', id);
    const sigs = await DB.getByIndex(DB.STORES.SIGNATURES, 'submissionId', id);

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    const badge = submission.syncStatus === 'synced'
      ? '<span class="badge badge-synced badge-dot">Synced</span>'
      : submission.syncStatus === 'failed'
      ? '<span class="badge badge-failed badge-dot">Failed</span>'
      : '<span class="badge badge-pending badge-dot badge-pulse">Pending</span>';

    backdrop.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div class="modal-header">
          <h3 class="modal-title">${submission.customerName || 'Submission'}</h3>
          <button class="toast-close" onclick="this.closest('.modal-backdrop').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-md);">
            ${badge}
            <span style="font-size:var(--text-xs);color:var(--text-dim);">${new Date(submission.createdAt).toLocaleString()}</span>
          </div>
          <div class="divider"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
            <div><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:2px;">Phone</div><div style="font-size:var(--text-sm);">${submission.phone || '—'}</div></div>
            <div><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:2px;">Type</div><div style="font-size:var(--text-sm);">${(submission.serviceType || '—').replace(/-/g,' ')}</div></div>
            <div><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:2px;">Status</div><div style="font-size:var(--text-sm);">${submission.status || '—'}</div></div>
            <div><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:2px;">Location</div><div style="font-size:var(--text-sm);">${submission.latitude ? GPS.formatCoords(submission.latitude, submission.longitude) : '—'}</div></div>
          </div>
          ${submission.address ? `<div style="margin-top:var(--space-md);"><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:2px;">Address</div><div style="font-size:var(--text-sm);">${submission.address}</div></div>` : ''}
          ${submission.notes ? `<div style="margin-top:var(--space-md);"><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:2px;">Notes</div><div style="font-size:var(--text-sm);color:var(--text-secondary);">${submission.notes}</div></div>` : ''}
          ${photos.length > 0 ? `<div class="divider"></div><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:var(--space-sm);">Photos (${photos.length})</div><div class="photo-grid">${photos.map(p => `<img src="${p.dataUrl}" class="photo-thumb" alt="Photo">`).join('')}</div>` : ''}
          ${sigs.length > 0 ? `<div class="divider"></div><div style="font-size:var(--text-xs);color:var(--text-dim);margin-bottom:var(--space-sm);">Signature</div><img src="${sigs[0].dataUrl}" alt="Signature" style="max-height:80px;background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-sm);">` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
  }
};
