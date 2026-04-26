/**
 * Capture View — Standalone photo and signature capture
 */
const CaptureView = {
  async render() {
    const photos = await DB.getAll(DB.STORES.PHOTOS);
    const signatures = await DB.getAll(DB.STORES.SIGNATURES);
    const standalone = photos.filter(p => !p.submissionId);
    const standaloneSigs = signatures.filter(s => !s.submissionId);

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="tabs">
        <button class="tab active" data-tab="photo" onclick="CaptureView.switchTab('photo')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Photos
        </button>
        <button class="tab" data-tab="signature" onclick="CaptureView.switchTab('signature')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          Signatures
        </button>
      </div>

      <div id="tabPhoto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
          <p class="text-secondary" style="font-size:var(--text-sm);">${standalone.length} standalone photo(s)</p>
          <button class="btn btn-primary" onclick="CaptureView.capturePhoto()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span class="btn-text">Take Photo</span>
          </button>
        </div>

        ${standalone.length > 0 ? `
          <div class="photo-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">
            ${standalone.sort((a, b) => b.createdAt - a.createdAt).map(p => `
              <div class="card" style="padding:var(--space-sm);overflow:hidden;">
                <img src="${p.dataUrl}" alt="Photo" style="width:100%;height:120px;object-fit:cover;border-radius:var(--radius-md);margin-bottom:var(--space-sm);">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span class="badge ${p.syncStatus === 'synced' ? 'badge-synced' : 'badge-pending'} badge-dot">${p.syncStatus === 'synced' ? 'Synced' : 'Pending'}</span>
                  <span style="font-size:var(--text-xs);color:var(--text-dim);">${new Date(p.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
            <div class="empty-state-title">No photos yet</div>
            <div class="empty-state-text">Capture photos to attach to submissions or save standalone</div>
          </div>
        `}
      </div>

      <div id="tabSignature" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
          <p class="text-secondary" style="font-size:var(--text-sm);">${standaloneSigs.length} standalone signature(s)</p>
        </div>
        <div class="card" style="margin-bottom:var(--space-lg);">
          <div class="card-header">
            <div class="card-title">Collect Signature</div>
          </div>
          <div class="signature-pad-container" id="captureSigPad">
            <canvas class="signature-pad-canvas"></canvas>
            <div class="signature-pad-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              <span>Draw signature here</span>
            </div>
            <div class="signature-pad-actions">
              <button class="btn btn-ghost btn-sm" onclick="SignaturePad.clear()">Clear</button>
              <button class="btn btn-primary btn-sm" onclick="CaptureView.saveSignature()">
                <span class="btn-text">Save Signature</span>
              </button>
            </div>
          </div>
        </div>

        ${standaloneSigs.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:var(--space-md);">
            ${standaloneSigs.sort((a, b) => b.createdAt - a.createdAt).map(s => `
              <div class="card" style="padding:var(--space-md);">
                <img src="${s.dataUrl}" alt="Signature" style="width:100%;max-height:100px;object-fit:contain;background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-sm);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-sm);">
                  <span class="badge ${s.syncStatus === 'synced' ? 'badge-synced' : 'badge-pending'} badge-dot">${s.syncStatus === 'synced' ? 'Synced' : 'Pending'}</span>
                  <span style="font-size:var(--text-xs);color:var(--text-dim);">${new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    setTimeout(() => SignaturePad.init('captureSigPad'), 100);
  },

  switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('tabPhoto').style.display = tab === 'photo' ? '' : 'none';
    document.getElementById('tabSignature').style.display = tab === 'signature' ? '' : 'none';
    if (tab === 'signature') setTimeout(() => SignaturePad.init('captureSigPad'), 50);
  },

  async capturePhoto() {
    try {
      let dataUrl;
      try {
        dataUrl = await PhotoCapture.captureFromCamera();
      } catch {
        dataUrl = await PhotoCapture.captureFromFile();
      }

      let position = null;
      try { position = await GPS.getCurrentPosition(); } catch {}

      const photo = {
        id: UUID.generate(),
        submissionId: null,
        dataUrl,
        latitude: position?.latitude || null,
        longitude: position?.longitude || null,
        syncStatus: 'pending',
        createdAt: Date.now(),
      };

      await DB.add(DB.STORES.PHOTOS, photo);
      await SyncEngine.queueOperation('photo', photo);
      Toast.success('Photo Saved', 'Photo captured and queued for sync');
      this.render();
    } catch (e) {
      if (e.message !== 'Cancelled') Toast.error('Error', 'Failed to capture photo');
    }
  },

  async saveSignature() {
    if (SignaturePad.isBlank()) {
      Toast.warning('Empty', 'Please draw a signature first');
      return;
    }

    const sig = {
      id: UUID.generate(),
      submissionId: null,
      dataUrl: SignaturePad.toDataURL(),
      syncStatus: 'pending',
      createdAt: Date.now(),
    };

    await DB.add(DB.STORES.SIGNATURES, sig);
    await SyncEngine.queueOperation('signature', sig);
    Toast.success('Signature Saved', 'Signature captured and queued for sync');
    SignaturePad.clear();
    this.render();
  }
};
