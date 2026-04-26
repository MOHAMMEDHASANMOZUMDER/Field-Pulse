/**
 * GPS Utility
 * Wraps the Geolocation API with accuracy monitoring and caching
 */
const GPS = {
  lastPosition: null,
  watchId: null,
  listeners: [],

  async getCurrentPosition(options = {}) {
    const defaultOpts = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    };
    const opts = { ...defaultOpts, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.lastPosition = this._formatPosition(pos);
          resolve(this.lastPosition);
        },
        err => {
          if (this.lastPosition) {
            resolve({ ...this.lastPosition, cached: true });
          } else {
            reject(err);
          }
        },
        opts
      );
    });
  },

  startWatching(callback) {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.lastPosition = this._formatPosition(pos);
        callback(this.lastPosition);
      },
      err => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  },

  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  _formatPosition(pos) {
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      timestamp: pos.timestamp,
      cached: false,
    };
  },

  getAccuracyLevel(accuracy) {
    if (accuracy <= 10) return 'excellent';
    if (accuracy <= 50) return 'good';
    return 'poor';
  },

  formatCoords(lat, lng) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  },

  getLastKnown() {
    return this.lastPosition;
  }
};
