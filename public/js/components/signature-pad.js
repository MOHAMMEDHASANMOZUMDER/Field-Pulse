/**
 * Signature Pad Component
 * Canvas-based signature capture with smooth bezier curves
 */
const SignaturePad = {
  canvas: null,
  ctx: null,
  drawing: false,
  points: [],
  isEmpty: true,
  container: null,

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.canvas = this.container.querySelector('.signature-pad-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    this._bindEvents();
    this.clear();
  },

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 200 * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = '200px';
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#e8ecf1';
    this.ctx.lineWidth = 2.5;
  },

  _bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', e => this._startDraw(e));
    this.canvas.addEventListener('mousemove', e => this._draw(e));
    this.canvas.addEventListener('mouseup', () => this._endDraw());
    this.canvas.addEventListener('mouseleave', () => this._endDraw());

    // Touch events
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this._startDraw(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      this._draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this._endDraw());
  },

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  },

  _startDraw(e) {
    this.drawing = true;
    this.isEmpty = false;
    this.points = [this._getPos(e)];
    this.container.classList.add('active');
    const placeholder = this.container.querySelector('.signature-pad-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  },

  _draw(e) {
    if (!this.drawing) return;
    const pos = this._getPos(e);
    this.points.push(pos);

    if (this.points.length >= 3) {
      const l = this.points.length;
      const p0 = this.points[l - 3];
      const p1 = this.points[l - 2];
      const p2 = this.points[l - 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      this.ctx.stroke();
    }
  },

  _endDraw() {
    if (!this.drawing) return;
    this.drawing = false;
    this.points = [];
    this.container.classList.remove('active');
  },

  clear() {
    if (!this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    this.isEmpty = true;
    this.points = [];
    const placeholder = this.container.querySelector('.signature-pad-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
  },

  toDataURL(type = 'image/png') {
    if (this.isEmpty) return null;
    return this.canvas.toDataURL(type);
  },

  isBlank() {
    return this.isEmpty;
  }
};
