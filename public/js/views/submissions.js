/**
 * Submissions View — Step-by-step form wizard
 */
const SubmissionsView = {
  currentStep: 0,
  formData: {},
  photos: [],
  signatureData: null,

  steps: [
    { id: 'info', label: 'Info', title: 'Customer Information' },
    { id: 'details', label: 'Details', title: 'Service Details' },
    { id: 'media', label: 'Media', title: 'Photos & Signature' },
    { id: 'review', label: 'Review', title: 'Review & Submit' },
  ],

  async render() {
    this.currentStep = 0;
    this.formData = {};
    this.photos = [];
    this.signatureData = null;

    // Try GPS
    try {
      const pos = await GPS.getCurrentPosition();
      this.formData.latitude = pos.latitude;
      this.formData.longitude = pos.longitude;
      this.formData.gpsAccuracy = pos.accuracy;
    } catch (e) { /* GPS not available */ }

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="form-wizard">
        <div class="form-wizard-steps" style="margin-bottom:var(--space-2xl);">
          <div class="progress-steps" id="progressSteps">
            ${this.steps.map((s, i) => `
              <div class="progress-step ${i === 0 ? 'active' : ''}" data-step="${i}">
                <div class="progress-step-number">${i + 1}</div>
                <span class="progress-step-label">${s.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="margin-top:var(--space-md);">
          <h3 style="margin-bottom:var(--space-lg);" id="stepTitle">${this.steps[0].title}</h3>
          <div id="stepContent"></div>
        </div>
        <div class="form-wizard-footer">
          <button class="btn btn-secondary" id="prevBtn" style="visibility:hidden;" onclick="SubmissionsView.prevStep()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            <span class="btn-text">Back</span>
          </button>
          <button class="btn btn-primary" id="nextBtn" onclick="SubmissionsView.nextStep()">
            <span class="btn-text">Continue</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    `;

    this.renderStep();
  },

  renderStep() {
    const stepContent = document.getElementById('stepContent');
    const stepTitle = document.getElementById('stepTitle');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    stepTitle.textContent = this.steps[this.currentStep].title;
    prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';

    if (this.currentStep === this.steps.length - 1) {
      nextBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span class="btn-text">Submit</span>`;
      nextBtn.className = 'btn btn-success';
    } else {
      nextBtn.innerHTML = `<span class="btn-text">Continue</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
      nextBtn.className = 'btn btn-primary';
    }

    // Update progress steps
    document.querySelectorAll('.progress-step').forEach((el, i) => {
      el.className = 'progress-step';
      if (i < this.currentStep) el.classList.add('completed');
      else if (i === this.currentStep) el.classList.add('active');
    });

    switch (this.currentStep) {
      case 0: this._renderInfoStep(stepContent); break;
      case 1: this._renderDetailsStep(stepContent); break;
      case 2: this._renderMediaStep(stepContent); break;
      case 3: this._renderReviewStep(stepContent); break;
    }
  },

  _renderInfoStep(el) {
    const gpsInfo = this.formData.latitude
      ? `<div class="gps-accuracy"><div class="gps-accuracy-dot ${GPS.getAccuracyLevel(this.formData.gpsAccuracy || 999)}"></div>${GPS.formatCoords(this.formData.latitude, this.formData.longitude)} (±${Math.round(this.formData.gpsAccuracy || 0)}m)</div>`
      : '<div class="form-help-text">GPS not available</div>';

    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Customer Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="fCustomerName" placeholder="Enter customer name" value="${this.formData.customerName || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Phone Number</label>
        <input type="tel" class="form-input" id="fPhone" placeholder="+1 (555) 000-0000" value="${this.formData.phone || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input type="text" class="form-input" id="fAddress" placeholder="Enter address" value="${this.formData.address || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">GPS Location</label>
        ${gpsInfo}
      </div>
    `;
  },

  _renderDetailsStep(el) {
    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Service Type <span class="required">*</span></label>
        <select class="form-select" id="fServiceType">
          <option value="">Select type...</option>
          <option value="delivery" ${this.formData.serviceType === 'delivery' ? 'selected' : ''}>Delivery</option>
          <option value="inspection" ${this.formData.serviceType === 'inspection' ? 'selected' : ''}>Inspection</option>
          <option value="repair" ${this.formData.serviceType === 'repair' ? 'selected' : ''}>Repair</option>
          <option value="survey" ${this.formData.serviceType === 'survey' ? 'selected' : ''}>Survey</option>
          <option value="installation" ${this.formData.serviceType === 'installation' ? 'selected' : ''}>Installation</option>
          <option value="sales" ${this.formData.serviceType === 'sales' ? 'selected' : ''}>Sales Visit</option>
          <option value="other" ${this.formData.serviceType === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="fStatus">
          <option value="completed" ${this.formData.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="in-progress" ${this.formData.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="pending" ${this.formData.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="cancelled" ${this.formData.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="fNotes" placeholder="Enter any notes or observations...">${this.formData.notes || ''}</textarea>
      </div>
    `;
  },

  _renderMediaStep(el) {
    const photoThumbs = this.photos.map((p, i) => `
      <div style="position:relative;">
        <img src="${p}" class="photo-thumb" alt="Photo ${i + 1}">
        <button class="btn btn-icon btn-sm" style="position:absolute;top:-6px;right:-6px;background:var(--accent-danger);color:#fff;width:22px;height:22px;border-radius:50%;" onclick="SubmissionsView.removePhoto(${i})">&times;</button>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Photos</label>
        <div class="photo-grid" style="margin-bottom:var(--space-md);">${photoThumbs}</div>
        <button class="btn btn-secondary" onclick="SubmissionsView.addPhoto()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span class="btn-text">Add Photo</span>
        </button>
      </div>
      <div class="form-group">
        <label class="form-label">Signature</label>
        <div class="signature-pad-container" id="sigPadContainer">
          <canvas class="signature-pad-canvas"></canvas>
          <div class="signature-pad-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            <span>Draw signature here</span>
          </div>
          <div class="signature-pad-actions">
            <button class="btn btn-ghost btn-sm" onclick="SignaturePad.clear()">Clear</button>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => SignaturePad.init('sigPadContainer'), 50);
  },

  _renderReviewStep(el) {
    const badge = !navigator.onLine
      ? '<span class="badge badge-pending badge-dot badge-pulse" style="margin-left:8px;">Will sync later</span>'
      : '<span class="badge badge-synced badge-dot" style="margin-left:8px;">Will sync now</span>';

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-md);">
        <div class="list-item" style="background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-md);">
          <div class="list-item-content">
            <div class="list-item-title">Customer</div>
            <div class="list-item-subtitle">${this.formData.customerName || '—'}</div>
          </div>
        </div>
        <div class="list-item" style="background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-md);">
          <div class="list-item-content">
            <div class="list-item-title">Contact</div>
            <div class="list-item-subtitle">${this.formData.phone || '—'} • ${this.formData.address || '—'}</div>
          </div>
        </div>
        <div class="list-item" style="background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-md);">
          <div class="list-item-content">
            <div class="list-item-title">Service</div>
            <div class="list-item-subtitle">${(this.formData.serviceType || '—').replace(/-/g, ' ')} — ${this.formData.status || 'completed'}</div>
          </div>
        </div>
        <div class="list-item" style="background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-md);">
          <div class="list-item-content">
            <div class="list-item-title">Media</div>
            <div class="list-item-subtitle">${this.photos.length} photo(s), ${this.signatureData ? 'Signature captured' : 'No signature'}</div>
          </div>
        </div>
        ${this.formData.notes ? `<div class="list-item" style="background:var(--bg-input);border-radius:var(--radius-md);padding:var(--space-md);">
          <div class="list-item-content">
            <div class="list-item-title">Notes</div>
            <div class="list-item-subtitle">${this.formData.notes}</div>
          </div>
        </div>` : ''}
        <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-sm);">
          ${badge}
        </div>
      </div>
    `;
  },

  _saveCurrentStep() {
    switch (this.currentStep) {
      case 0:
        this.formData.customerName = document.getElementById('fCustomerName')?.value?.trim() || '';
        this.formData.phone = document.getElementById('fPhone')?.value?.trim() || '';
        this.formData.address = document.getElementById('fAddress')?.value?.trim() || '';
        break;
      case 1:
        this.formData.serviceType = document.getElementById('fServiceType')?.value || '';
        this.formData.status = document.getElementById('fStatus')?.value || 'completed';
        this.formData.notes = document.getElementById('fNotes')?.value?.trim() || '';
        break;
      case 2:
        if (!SignaturePad.isBlank()) {
          this.signatureData = SignaturePad.toDataURL();
        }
        break;
    }
  },

  nextStep() {
    this._saveCurrentStep();

    if (this.currentStep === 0 && !this.formData.customerName) {
      Toast.warning('Required', 'Customer name is required');
      document.getElementById('fCustomerName')?.classList.add('form-input-error');
      return;
    }

    if (this.currentStep === this.steps.length - 1) {
      this.submit();
      return;
    }

    this.currentStep++;
    this.renderStep();
  },

  prevStep() {
    this._saveCurrentStep();
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  async addPhoto() {
    try {
      const dataUrl = await PhotoCapture.captureFromCamera();
      this.photos.push(dataUrl);
      this._renderMediaStep(document.getElementById('stepContent'));
      setTimeout(() => SignaturePad.init('sigPadContainer'), 50);
    } catch (e) {
      if (e.message !== 'Cancelled') {
        try {
          const dataUrl = await PhotoCapture.captureFromFile();
          this.photos.push(dataUrl);
          this._renderMediaStep(document.getElementById('stepContent'));
          setTimeout(() => SignaturePad.init('sigPadContainer'), 50);
        } catch { /* User cancelled */ }
      }
    }
  },

  removePhoto(index) {
    this.photos.splice(index, 1);
    this._renderMediaStep(document.getElementById('stepContent'));
    setTimeout(() => SignaturePad.init('sigPadContainer'), 50);
  },

  async submit() {
    const submissionId = UUID.generate();
    const now = Date.now();

    const submission = {
      id: submissionId,
      ...this.formData,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    await DB.add(DB.STORES.SUBMISSIONS, submission);
    await SyncEngine.queueOperation('submission', submission);

    // Save photos
    for (let i = 0; i < this.photos.length; i++) {
      const photo = {
        id: UUID.generate(),
        submissionId,
        dataUrl: this.photos[i],
        syncStatus: 'pending',
        createdAt: now,
      };
      await DB.add(DB.STORES.PHOTOS, photo);
      await SyncEngine.queueOperation('photo', photo);
    }

    // Save signature
    if (this.signatureData) {
      const sig = {
        id: UUID.generate(),
        submissionId,
        dataUrl: this.signatureData,
        syncStatus: 'pending',
        createdAt: now,
      };
      await DB.add(DB.STORES.SIGNATURES, sig);
      await SyncEngine.queueOperation('signature', sig);
    }

    Toast.success('Submission Saved', navigator.onLine ? 'Syncing now...' : 'Will sync when online');
    Router.navigate('dashboard');
  }
};
