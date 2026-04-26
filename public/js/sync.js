/**
 * Sync Engine — Outbox Pattern
 * Queues mutations locally, drains when online, handles retries
 */
const SyncEngine = {
  syncing: false,
  syncInterval: null,
  retryDelay: 5000,
  maxRetries: 5,
  API_BASE: '/api',

  init() {
    this.startAutoSync();
    ConnectionIndicator.onChange(online => {
      if (online) this.triggerSync();
    });
  },

  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncing) this.triggerSync();
    }, intervalMs);
  },

  async queueOperation(type, data) {
    const op = {
      id: UUID.generate(),
      type,
      data,
      status: 'pending',
      retries: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await DB.add(DB.STORES.SYNC_QUEUE, op);
    this._updateBadges();
    if (navigator.onLine) this.triggerSync();
    return op.id;
  },

  async triggerSync() {
    if (this.syncing || !navigator.onLine) return;
    this.syncing = true;
    ConnectionIndicator.setSyncing(true);

    try {
      const pending = await DB.getByIndex(DB.STORES.SYNC_QUEUE, 'status', 'pending');
      const failed = await DB.getByIndex(DB.STORES.SYNC_QUEUE, 'status', 'failed');
      const queue = [...pending, ...failed]
        .filter(op => op.retries < this.maxRetries)
        .sort((a, b) => a.createdAt - b.createdAt);

      let synced = 0;
      for (const op of queue) {
        try {
          op.status = 'syncing';
          op.updatedAt = Date.now();
          await DB.put(DB.STORES.SYNC_QUEUE, op);
          await this._processOperation(op);
          op.status = 'synced';
          op.updatedAt = Date.now();
          await DB.put(DB.STORES.SYNC_QUEUE, op);
          synced++;
        } catch (err) {
          console.warn('Sync failed for op:', op.id, err);
          op.status = 'failed';
          op.retries++;
          op.lastError = err.message;
          op.updatedAt = Date.now();
          await DB.put(DB.STORES.SYNC_QUEUE, op);
        }
      }

      if (synced > 0) {
        Toast.success('Sync Complete', `${synced} item${synced > 1 ? 's' : ''} synced successfully`);
      }

      // Clean up old synced items (keep last 50)
      const allSynced = await DB.getByIndex(DB.STORES.SYNC_QUEUE, 'status', 'synced');
      if (allSynced.length > 50) {
        const toDelete = allSynced.sort((a, b) => a.updatedAt - b.updatedAt).slice(0, allSynced.length - 50);
        for (const d of toDelete) await DB.delete(DB.STORES.SYNC_QUEUE, d.id);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      this.syncing = false;
      ConnectionIndicator.setSyncing(false);
      this._updateBadges();
    }
  },

  async _processOperation(op) {
    const token = localStorage.getItem('fp_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    switch (op.type) {
      case 'submission': {
        const res = await fetch(`${this.API_BASE}/submissions`, {
          method: 'POST', headers, body: JSON.stringify(op.data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Update local record sync status
        const sub = await DB.get(DB.STORES.SUBMISSIONS, op.data.id);
        if (sub) { sub.syncStatus = 'synced'; await DB.put(DB.STORES.SUBMISSIONS, sub); }
        break;
      }
      case 'photo': {
        const res = await fetch(`${this.API_BASE}/photos`, {
          method: 'POST', headers, body: JSON.stringify(op.data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const photo = await DB.get(DB.STORES.PHOTOS, op.data.id);
        if (photo) { photo.syncStatus = 'synced'; await DB.put(DB.STORES.PHOTOS, photo); }
        break;
      }
      case 'signature': {
        const res = await fetch(`${this.API_BASE}/signatures`, {
          method: 'POST', headers, body: JSON.stringify(op.data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const sig = await DB.get(DB.STORES.SIGNATURES, op.data.id);
        if (sig) { sig.syncStatus = 'synced'; await DB.put(DB.STORES.SIGNATURES, sig); }
        break;
      }
      case 'route': {
        const res = await fetch(`${this.API_BASE}/routes`, {
          method: 'POST', headers, body: JSON.stringify(op.data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const route = await DB.get(DB.STORES.ROUTES, op.data.id);
        if (route) { route.syncStatus = 'synced'; await DB.put(DB.STORES.ROUTES, route); }
        break;
      }
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  },

  async _updateBadges() {
    const count = await DB.getPendingCount();
    const badge = document.getElementById('pendingBadge');
    if (badge) {
      if (count > 0) { badge.textContent = count; badge.style.display = ''; }
      else { badge.style.display = 'none'; }
    }
  },

  async retryFailed() {
    const failed = await DB.getByIndex(DB.STORES.SYNC_QUEUE, 'status', 'failed');
    for (const op of failed) {
      op.status = 'pending';
      op.retries = 0;
      await DB.put(DB.STORES.SYNC_QUEUE, op);
    }
    this.triggerSync();
  },

  getToken() {
    return localStorage.getItem('fp_token');
  }
};
