/**
 * Photo Capture Component
 * Camera access, preview, compression, and file input fallback
 */
const PhotoCapture = {
  stream: null,

  async captureFromCamera() {
    return new Promise((resolve, reject) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title">Capture Photo</h3>
            <button class="toast-close" id="photoCancelBtn">&times;</button>
          </div>
          <div class="modal-body" style="padding:0;">
            <video id="cameraPreview" autoplay playsinline style="width:100%;display:block;background:#000;min-height:300px;"></video>
            <canvas id="captureCanvas" style="display:none;"></canvas>
            <div id="photoResult" style="display:none;">
              <img id="photoPreview" style="width:100%;display:block;" alt="captured photo">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="photoRetakeBtn" style="display:none;">Retake</button>
            <button class="btn btn-primary" id="photoCaptureBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              <span class="btn-text">Capture</span>
            </button>
            <button class="btn btn-success" id="photoAcceptBtn" style="display:none;">
              <span class="btn-text">Use Photo</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
      const video = document.getElementById('cameraPreview');
      const canvas = document.getElementById('captureCanvas');
      let captured = null;

      const cleanup = () => {
        if (this.stream) {
          this.stream.getTracks().forEach(t => t.stop());
          this.stream = null;
        }
        backdrop.remove();
      };

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      }).then(stream => {
        this.stream = stream;
        video.srcObject = stream;
      }).catch(() => {
        cleanup();
        this.captureFromFile().then(resolve).catch(reject);
      });

      document.getElementById('photoCancelBtn').onclick = () => { cleanup(); reject(new Error('Cancelled')); };

      document.getElementById('photoCaptureBtn').onclick = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        captured = this._compressCanvas(canvas, 0.85);
        document.getElementById('photoPreview').src = captured;
        video.style.display = 'none';
        document.getElementById('photoResult').style.display = 'block';
        document.getElementById('photoCaptureBtn').style.display = 'none';
        document.getElementById('photoRetakeBtn').style.display = '';
        document.getElementById('photoAcceptBtn').style.display = '';
      };

      document.getElementById('photoRetakeBtn').onclick = () => {
        video.style.display = 'block';
        document.getElementById('photoResult').style.display = 'none';
        document.getElementById('photoCaptureBtn').style.display = '';
        document.getElementById('photoRetakeBtn').style.display = 'none';
        document.getElementById('photoAcceptBtn').style.display = 'none';
        captured = null;
      };

      document.getElementById('photoAcceptBtn').onclick = () => {
        cleanup();
        resolve(captured);
      };
    });
  },

  captureFromFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) { reject(new Error('No file selected')); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1280;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = (h / w) * maxDim; w = maxDim; }
              else { w = (w / h) * maxDim; h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(this._compressCanvas(canvas, 0.85));
          };
          img.src = ev.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },

  _compressCanvas(canvas, quality) {
    return canvas.toDataURL('image/jpeg', quality);
  }
};
