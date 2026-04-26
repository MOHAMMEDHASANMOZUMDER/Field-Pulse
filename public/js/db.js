/**
 * IndexedDB Database Wrapper
 * Provides CRUD and query helpers for offline-first data storage
 */
const DB = {
  name: 'FieldPulseDB',
  version: 1,
  db: null,

  STORES: {
    SUBMISSIONS: 'submissions',
    PHOTOS: 'photos',
    SIGNATURES: 'signatures',
    ROUTES: 'routes',
    ROUTE_POINTS: 'routePoints',
    SYNC_QUEUE: 'syncQueue',
    SETTINGS: 'settings',
  },

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Submissions store
        if (!db.objectStoreNames.contains(this.STORES.SUBMISSIONS)) {
          const sub = db.createObjectStore(this.STORES.SUBMISSIONS, { keyPath: 'id' });
          sub.createIndex('syncStatus', 'syncStatus', { unique: false });
          sub.createIndex('createdAt', 'createdAt', { unique: false });
          sub.createIndex('type', 'type', { unique: false });
        }

        // Photos store
        if (!db.objectStoreNames.contains(this.STORES.PHOTOS)) {
          const photos = db.createObjectStore(this.STORES.PHOTOS, { keyPath: 'id' });
          photos.createIndex('submissionId', 'submissionId', { unique: false });
          photos.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Signatures store
        if (!db.objectStoreNames.contains(this.STORES.SIGNATURES)) {
          const sigs = db.createObjectStore(this.STORES.SIGNATURES, { keyPath: 'id' });
          sigs.createIndex('submissionId', 'submissionId', { unique: false });
          sigs.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Routes store
        if (!db.objectStoreNames.contains(this.STORES.ROUTES)) {
          const routes = db.createObjectStore(this.STORES.ROUTES, { keyPath: 'id' });
          routes.createIndex('syncStatus', 'syncStatus', { unique: false });
          routes.createIndex('startTime', 'startTime', { unique: false });
        }

        // Route points store
        if (!db.objectStoreNames.contains(this.STORES.ROUTE_POINTS)) {
          const points = db.createObjectStore(this.STORES.ROUTE_POINTS, { keyPath: 'id' });
          points.createIndex('routeId', 'routeId', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(this.STORES.SYNC_QUEUE)) {
          const sync = db.createObjectStore(this.STORES.SYNC_QUEUE, { keyPath: 'id' });
          sync.createIndex('status', 'status', { unique: false });
          sync.createIndex('createdAt', 'createdAt', { unique: false });
          sync.createIndex('type', 'type', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
          db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  },

  async add(storeName, data) {
    return this._transaction(storeName, 'readwrite', store => {
      return store.add(data);
    });
  },

  async put(storeName, data) {
    return this._transaction(storeName, 'readwrite', store => {
      return store.put(data);
    });
  },

  async get(storeName, id) {
    return this._transaction(storeName, 'readonly', store => {
      return store.get(id);
    });
  },

  async getAll(storeName) {
    return this._transaction(storeName, 'readonly', store => {
      return store.getAll();
    });
  },

  async delete(storeName, id) {
    return this._transaction(storeName, 'readwrite', store => {
      return store.delete(id);
    });
  },

  async clear(storeName) {
    return this._transaction(storeName, 'readwrite', store => {
      return store.clear();
    });
  },

  async getByIndex(storeName, indexName, value) {
    return this._transaction(storeName, 'readonly', store => {
      const index = store.index(indexName);
      return index.getAll(value);
    });
  },

  async countByIndex(storeName, indexName, value) {
    return this._transaction(storeName, 'readonly', store => {
      const index = store.index(indexName);
      return index.count(value);
    });
  },

  async count(storeName) {
    return this._transaction(storeName, 'readonly', store => {
      return store.count();
    });
  },

  _transaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Helper: Get pending sync items count
  async getPendingCount() {
    const pending = await this.countByIndex(this.STORES.SYNC_QUEUE, 'status', 'pending');
    const failed = await this.countByIndex(this.STORES.SYNC_QUEUE, 'status', 'failed');
    return pending + failed;
  },

  // Helper: Get sync stats
  async getSyncStats() {
    const queue = await this.getAll(this.STORES.SYNC_QUEUE);
    return {
      total: queue.length,
      pending: queue.filter(q => q.status === 'pending').length,
      syncing: queue.filter(q => q.status === 'syncing').length,
      failed: queue.filter(q => q.status === 'failed').length,
      synced: queue.filter(q => q.status === 'synced').length,
    };
  },

  // Helper: Estimate storage usage
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return {
        usage: est.usage || 0,
        quota: est.quota || 0,
        percent: est.quota ? ((est.usage / est.quota) * 100).toFixed(1) : 0,
      };
    }
    return { usage: 0, quota: 0, percent: 0 };
  },

  // Setting helpers
  async getSetting(key, defaultValue = null) {
    try {
      const result = await this.get(this.STORES.SETTINGS, key);
      return result ? result.value : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async setSetting(key, value) {
    return this.put(this.STORES.SETTINGS, { key, value });
  },
};
