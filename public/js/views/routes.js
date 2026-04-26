/**
 * Routes View — GPS route tracking with canvas visualization
 */
const RoutesView = {
  activeRoute: null,
  watchCallbackId: null,

  async render() {
    const routes = await DB.getAll(DB.STORES.ROUTES);
    const active = routes.find(r => r.status === 'recording');
    this.activeRoute = active || null;

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-xl);">
        <div class="card-header">
          <div>
            <div class="card-title">${this.activeRoute ? 'Recording Route' : 'Route Tracker'}</div>
            <div class="card-subtitle">${this.activeRoute ? 'GPS tracking active' : 'Start recording your route'}</div>
          </div>
          ${this.activeRoute
            ? `<button class="btn btn-danger" onclick="RoutesView.stopRoute()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                <span class="btn-text">Stop</span>
              </button>`
            : `<button class="btn btn-primary" onclick="RoutesView.startRoute()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
                <span class="btn-text">Start Route</span>
              </button>`
          }
        </div>

        <div class="route-canvas-container">
          <canvas class="route-canvas" id="routeCanvas"></canvas>
          ${this.activeRoute ? `
            <div class="route-canvas-overlay">
              <div class="badge badge-pending badge-dot badge-pulse">Recording</div>
              <div style="display:flex;gap:var(--space-md);" id="routeStats">
                <span style="font-size:var(--text-xs);color:var(--text-secondary);">Points: <strong id="pointCount">0</strong></span>
                <span style="font-size:var(--text-xs);color:var(--text-secondary);">Dist: <strong id="routeDistance">0km</strong></span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Route History</div>
            <div class="card-subtitle">${routes.filter(r => r.status !== 'recording').length} completed routes</div>
          </div>
        </div>

        ${routes.filter(r => r.status !== 'recording').length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
            ${routes.filter(r => r.status !== 'recording').sort((a, b) => b.startTime - a.startTime).map(r => {
              const duration = r.endTime ? Math.round((r.endTime - r.startTime) / 60000) : 0;
              return `<div class="list-item">
                <div class="list-item-icon" style="background:rgba(var(--accent-info-rgb),0.1);color:var(--accent-info);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
                </div>
                <div class="list-item-content">
                  <div class="list-item-title">${new Date(r.startTime).toLocaleDateString()} Route</div>
                  <div class="list-item-subtitle">${r.pointCount || 0} points • ${duration}min • ${(r.distance || 0).toFixed(1)}km</div>
                </div>
                <div class="list-item-meta">
                  <span class="badge ${r.syncStatus === 'synced' ? 'badge-synced' : 'badge-pending'} badge-dot">${r.syncStatus === 'synced' ? 'Synced' : 'Pending'}</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg></div>
            <div class="empty-state-title">No routes recorded</div>
            <div class="empty-state-text">Start tracking to record your GPS path</div>
          </div>
        `}
      </div>
    `;

    if (this.activeRoute) this._startCanvasUpdates();
    else this._drawEmptyCanvas();
  },

  async startRoute() {
    try {
      const pos = await GPS.getCurrentPosition();
      const route = {
        id: UUID.generate(),
        status: 'recording',
        startTime: Date.now(),
        endTime: null,
        pointCount: 1,
        distance: 0,
        syncStatus: 'pending',
        createdAt: Date.now(),
      };

      await DB.add(DB.STORES.ROUTES, route);

      const point = {
        id: UUID.generate(),
        routeId: route.id,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        timestamp: Date.now(),
      };
      await DB.add(DB.STORES.ROUTE_POINTS, point);

      this.activeRoute = route;

      GPS.startWatching(async (newPos) => {
        const pt = {
          id: UUID.generate(),
          routeId: route.id,
          latitude: newPos.latitude,
          longitude: newPos.longitude,
          accuracy: newPos.accuracy,
          timestamp: Date.now(),
        };
        await DB.add(DB.STORES.ROUTE_POINTS, pt);
        route.pointCount = (route.pointCount || 0) + 1;
        await DB.put(DB.STORES.ROUTES, route);
        this._updateCanvas();
      });

      Toast.success('Route Started', 'GPS tracking is active');
      this.render();
    } catch (e) {
      Toast.error('GPS Error', 'Unable to access GPS. Check permissions.');
    }
  },

  async stopRoute() {
    if (!this.activeRoute) return;
    GPS.stopWatching();

    const points = await DB.getByIndex(DB.STORES.ROUTE_POINTS, 'routeId', this.activeRoute.id);
    const distance = this._calculateDistance(points);

    this.activeRoute.status = 'completed';
    this.activeRoute.endTime = Date.now();
    this.activeRoute.distance = distance;
    this.activeRoute.pointCount = points.length;
    await DB.put(DB.STORES.ROUTES, this.activeRoute);

    await SyncEngine.queueOperation('route', {
      ...this.activeRoute,
      points: points.map(p => ({ lat: p.latitude, lng: p.longitude, ts: p.timestamp }))
    });

    Toast.success('Route Completed', `${points.length} points, ${distance.toFixed(1)}km`);
    this.activeRoute = null;
    this.render();
  },

  _calculateDistance(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this._haversine(
        points[i - 1].latitude, points[i - 1].longitude,
        points[i].latitude, points[i].longitude
      );
    }
    return total;
  },

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  _drawEmptyCanvas() {
    const canvas = document.getElementById('routeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#15202b';
    ctx.fillRect(0, 0, canvas.offsetWidth, 300);
    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.offsetWidth; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke();
    }
    for (let y = 0; y < 300; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.offsetWidth, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Start tracking to see your route here', canvas.offsetWidth / 2, 155);
  },

  async _updateCanvas() {
    if (!this.activeRoute) return;
    const points = await DB.getByIndex(DB.STORES.ROUTE_POINTS, 'routeId', this.activeRoute.id);
    this._drawRoute(points);
    const countEl = document.getElementById('pointCount');
    const distEl = document.getElementById('routeDistance');
    if (countEl) countEl.textContent = points.length;
    if (distEl) distEl.textContent = this._calculateDistance(points).toFixed(1) + 'km';
  },

  async _startCanvasUpdates() {
    if (!this.activeRoute) return;
    const points = await DB.getByIndex(DB.STORES.ROUTE_POINTS, 'routeId', this.activeRoute.id);
    this._drawRoute(points);
    const countEl = document.getElementById('pointCount');
    const distEl = document.getElementById('routeDistance');
    if (countEl) countEl.textContent = points.length;
    if (distEl) distEl.textContent = this._calculateDistance(points).toFixed(1) + 'km';
  },

  _drawRoute(points) {
    const canvas = document.getElementById('routeCanvas');
    if (!canvas || points.length === 0) { this._drawEmptyCanvas(); return; }
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth, h = 300;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#15202b';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    if (points.length < 2) return;

    // Project points
    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 40;
    const rangeX = maxLng - minLng || 0.001;
    const rangeY = maxLat - minLat || 0.001;

    const projected = points.map(p => ({
      x: pad + ((p.longitude - minLng) / rangeX) * (w - 2 * pad),
      y: pad + ((maxLat - p.latitude) / rangeY) * (h - 2 * pad),
    }));

    // Draw path
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      ctx.lineTo(projected[i].x, projected[i].y);
    }
    ctx.strokeStyle = '#5b9cf5';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(91,156,245,0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Start dot
    ctx.beginPath();
    ctx.arc(projected[0].x, projected[0].y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#2dd4a8';
    ctx.fill();

    // End dot
    const last = projected[projected.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e8a838';
    ctx.fill();
  }
};
