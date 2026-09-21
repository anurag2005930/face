/* ==========================================================================
   AURA-Sense: Main Application Controller
   ========================================================================== */

class EmotionApp {
  constructor() {
    this.video = document.getElementById("webcamVideo");
    this.canvas = document.getElementById("overlayCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.cameraStandby = document.getElementById("cameraStandby");
    
    this.isStreaming = false;
    this.mediaStream = null;
    this.ws = null;
    this.sendLoopTimer = null;
    this.targetFps = 15;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.currentFps = 0;

    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");

    this.audioContext = null;
    this.lastDominantEmotion = null;

    this.snapshots = [];
    this.latestSummary = null;
    this.selectedDeviceId = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.initCharts();
    this.initWebSocket();
    this.checkServerHealth();
    this.enumerateCameras();

    // Auto-initialize laptop camera on page load
    setTimeout(() => {
      this.startCamera(true);
    }, 400);
  }

  bindEvents() {
    // Mode tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.mode));
    });

    // Camera buttons
    document.getElementById("btnToggleCamera").addEventListener("click", () => this.toggleCamera());
    document.getElementById("btnStartCameraCenter").addEventListener("click", () => this.toggleCamera());
    document.getElementById("btnSnapshot").addEventListener("click", () => this.captureSnapshot());
    document.getElementById("btnClearSnapshots").addEventListener("click", () => this.clearSnapshots());

    // Analytics actions
    document.getElementById("btnResetSession").addEventListener("click", () => this.resetSession());
    document.getElementById("btnExportReport").addEventListener("click", () => this.exportReport());

    // Upload Dropzone
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) {
        this.handleImageUpload(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) {
        this.handleImageUpload(e.target.files[0]);
      }
    });

    // Camera device select
    const cameraSelect = document.getElementById("cameraSelect");
    if (cameraSelect) {
      cameraSelect.addEventListener("change", async () => {
        this.selectedDeviceId = cameraSelect.value;
        if (this.isStreaming) {
          this.stopCamera();
          await this.startCamera();
        }
      });
    }

    // Window resize handler for canvas alignment
    window.addEventListener("resize", () => this.syncCanvasSize());
  }

  initCharts() {
    if (window.emotionCharts) {
      window.emotionCharts.initTimelineChart("timelineChart");
      window.emotionCharts.initDistributionChart("pieDistributionChart");
    }
  }

  switchTab(mode) {
    document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
    document.querySelectorAll(".view-panel").forEach((p) => p.classList.toggle("active", p.id === `view-${mode}`));

    if (mode === "analytics") {
      this.refreshAnalyticsView();
    }
  }

  /* --------------------------------------------------------------------------
     WebSocket Communication & Server Status
     -------------------------------------------------------------------------- */
  initWebSocket() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.host || "localhost:8000";
    const wsUrl = `${protocol}//${host}/ws/stream`;

    this.updateServerStatus("connecting", `Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.updateServerStatus("online", "AI Backend Connected (Ready)");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleInferenceResult(data);
        } catch (err) {
          console.error("Failed to parse server message:", err);
        }
      };

      this.ws.onclose = () => {
        this.updateServerStatus("offline", "Server Disconnected. Retrying...");
        setTimeout(() => this.initWebSocket(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket error:", err);
        this.updateServerStatus("offline", "AI Server Offline (Check Port 8000)");
      };
    } catch (e) {
      this.updateServerStatus("offline", "Connection Failed");
    }
  }

  async checkServerHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        this.updateServerStatus("online", "AI Backend Connected (Ready)");
      }
    } catch (e) {
      // Handled by WebSocket status
    }
  }

  updateServerStatus(status, text) {
    const pill = document.getElementById("serverStatusPill");
    const statusText = document.getElementById("serverStatusText");
    if (!pill || !statusText) return;

    pill.classList.remove("online", "offline");
    if (status === "online") pill.classList.add("online");
    if (status === "offline") pill.classList.add("offline");
    statusText.innerText = text;
  }

  /* --------------------------------------------------------------------------
     Webcam Control & Capture Loop
     -------------------------------------------------------------------------- */
  async toggleCamera() {
    if (this.isStreaming) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  async enumerateCameras() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const select = document.getElementById("cameraSelect");
      if (!select) return;

      if (videoDevices.length > 0) {
        select.innerHTML = "";
        videoDevices.forEach((device, idx) => {
          const opt = document.createElement("option");
          opt.value = device.deviceId;
          // Clean display name for laptop camera
          let label = device.label || `Laptop Camera ${idx + 1}`;
          opt.text = label;
          if (this.selectedDeviceId === device.deviceId) {
            opt.selected = true;
          }
          select.appendChild(opt);
        });

        if (!this.selectedDeviceId) {
          this.selectedDeviceId = videoDevices[0].deviceId;
        }
      }
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  }

  async startCamera(isAutoStart = false) {
    if (this.isStreaming) return;

    let constraints;
    if (this.selectedDeviceId) {
      constraints = {
        video: {
          deviceId: { exact: this.selectedDeviceId },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
    } else {
      constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      };
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (errConstraint) {
        console.warn("Primary constraint failed, falling back to general video constraint...", errConstraint);
        // Fallback: standard laptop webcam access without strict resolution/deviceId
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      this.mediaStream = stream;
      this.video.srcObject = stream;
      this.isStreaming = true;

      // Re-enumerate to get actual camera labels once permission is granted
      await this.enumerateCameras();

      this.video.onloadedmetadata = () => {
        this.video.play();
        this.syncCanvasSize();
        this.cameraStandby.style.display = "none";
        document.getElementById("btnSnapshot").disabled = false;
        
        const btnToggle = document.getElementById("btnToggleCamera");
        btnToggle.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Camera';
        btnToggle.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";

        this.startCaptureLoop();
      };
    } catch (err) {
      console.error("Camera access error:", err);
      if (!isAutoStart) {
        alert(
          "Laptop Camera Access Error: " + err.message + 
          "\n\nPlease ensure:\n1. You click 'Allow' on your browser's camera permission prompt.\n2. Your laptop camera shutter is open.\n3. No other application (like Zoom, MS Teams, or Skype) is currently holding the laptop camera lock."
        );
      }
    }
  }

  stopCamera() {
    this.isStreaming = false;
    clearInterval(this.sendLoopTimer);

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.video.srcObject = null;
    this.cameraStandby.style.display = "flex";
    document.getElementById("btnSnapshot").disabled = true;

    const btnToggle = document.getElementById("btnToggleCamera");
    btnToggle.innerHTML = '<i class="fa-solid fa-video"></i> Start Camera';
    btnToggle.style.background = "";

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById("fpsCounter").innerHTML = '<i class="fa-solid fa-bolt"></i> 0 FPS';
    document.getElementById("faceCountBadge").innerHTML = '<i class="fa-solid fa-user"></i> 0 Faces';
  }

  syncCanvasSize() {
    if (!this.video.videoWidth) return;
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.offscreenCanvas.width = 480; // Optimized dimension for fast network transmission
    this.offscreenCanvas.height = Math.round(480 * (this.video.videoHeight / this.video.videoWidth));
  }

  startCaptureLoop() {
    const interval = Math.round(1000 / this.targetFps);
    this.sendLoopTimer = setInterval(() => {
      if (!this.isStreaming || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.sendCurrentFrame();
    }, interval);
  }

  sendCurrentFrame() {
    if (!this.video.videoWidth) return;

    // Draw current video frame to offscreen canvas
    this.offscreenCtx.drawImage(
      this.video,
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );

    // Compress to JPEG base64
    const base64Data = this.offscreenCanvas.toDataURL("image/jpeg", 0.65);
    this.ws.send(base64Data);

    // Track FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      document.getElementById("fpsCounter").innerHTML = `<i class="fa-solid fa-bolt"></i> ${this.currentFps} FPS`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  /* --------------------------------------------------------------------------
     HUD Rendering & UI Updates
     -------------------------------------------------------------------------- */
  handleInferenceResult(data) {
    const { faces, frame_entry, summary } = data;
    this.latestSummary = summary;

    // 1. Draw HUD on overlay canvas
    this.drawHud(faces || []);

    // 2. Update Face Count
    document.getElementById("faceCountBadge").innerHTML = `<i class="fa-solid fa-user"></i> ${(faces || []).length} Faces`;

    // 3. Update Dominant Emotion Hero & Progress Bars
    if (faces && faces.length > 0) {
      // Select primary face
      const primaryFace = faces.reduce((prev, curr) =>
        curr.bbox.width * curr.bbox.height > prev.bbox.width * prev.bbox.height ? curr : prev
      );

      this.updateDominantHero(primaryFace);
      this.updateEmotionBars(primaryFace.probabilities);

      // Play audio chime if emotion shifted
      if (primaryFace.dominant_emotion !== this.lastDominantEmotion) {
        this.playEmotionChime(primaryFace.dominant_emotion);
        this.lastDominantEmotion = primaryFace.dominant_emotion;
      }
    } else {
      this.resetDominantHero();
    }

    // 4. Update Timeline Chart
    if (frame_entry && window.emotionCharts) {
      window.emotionCharts.addTimelinePoint(
        frame_entry.timestamp,
        frame_entry.probabilities || {}
      );
    }

    // 5. Update Sentiment & Engagement KPIs
    if (summary) {
      const sentVal = document.getElementById("sentimentIndexVal");
      const sentLabel = document.getElementById("sentimentLabelVal");
      const engVal = document.getElementById("engagementScoreVal");

      if (sentVal) {
        const score = summary.sentiment_index;
        sentVal.innerText = (score > 0 ? "+" : "") + score.toFixed(1);
        sentVal.style.color = score > 15 ? "#10b981" : (score < -15 ? "#ef4444" : "#f8fafc");
      }
      if (sentLabel) sentLabel.innerText = summary.sentiment_label;
      if (engVal) engVal.innerText = summary.engagement_score + "%";
    }
  }

  drawHud(faces) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!faces || faces.length === 0) return;

    // Calculate scale factor between offscreen sent size and full display canvas
    const scaleX = this.canvas.width / this.offscreenCanvas.width;
    const scaleY = this.canvas.height / this.offscreenCanvas.height;
    const showLandmarks = document.getElementById("chkShowLandmarks").checked;

    faces.forEach((face) => {
      // Video is mirrored via CSS scaleX(-1), so we mirror the X coordinate on the canvas
      let rawX = face.bbox.x * scaleX;
      let rawY = face.bbox.y * scaleY;
      let w = face.bbox.width * scaleX;
      let h = face.bbox.height * scaleY;

      // Mirror X calculation
      const x = this.canvas.width - rawX - w;
      const y = rawY;
      const color = face.color || "#06b6d4";

      // 1. Cyber Corner Brackets
      const bracketLen = Math.min(24, w * 0.25);
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = color;

      // Top-Left
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + bracketLen);
      this.ctx.lineTo(x, y);
      this.ctx.lineTo(x + bracketLen, y);
      this.ctx.stroke();

      // Top-Right
      this.ctx.beginPath();
      this.ctx.moveTo(x + w - bracketLen, y);
      this.ctx.lineTo(x + w, y);
      this.ctx.lineTo(x + w, y + bracketLen);
      this.ctx.stroke();

      // Bottom-Left
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + h - bracketLen);
      this.ctx.lineTo(x, y + h);
      this.ctx.lineTo(x + bracketLen, y + h);
      this.ctx.stroke();

      // Bottom-Right
      this.ctx.beginPath();
      this.ctx.moveTo(x + w - bracketLen, y + h);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.lineTo(x + w, y + h - bracketLen);
      this.ctx.stroke();

      // Subtle translucent box fill
      this.ctx.fillStyle = `${color}15`;
      this.ctx.fillRect(x, y, w, h);

      // 2. Emotion HUD Tag Badge above face
      const tagText = `${face.emoji} ${face.dominant_emotion} (${face.confidence}%)`;
      this.ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      const textWidth = this.ctx.measureText(tagText).width;
      const tagHeight = 26;
      const tagX = Math.max(8, x + (w - textWidth - 20) / 2);
      const tagY = Math.max(tagHeight + 4, y - 10);

      // Badge pill background
      this.ctx.fillStyle = "rgba(11, 16, 29, 0.9)";
      this.ctx.beginPath();
      this.ctx.roundRect(tagX, tagY - tagHeight + 6, textWidth + 20, tagHeight, 6);
      this.ctx.fill();

      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = color;
      this.ctx.stroke();

      // Badge text
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText(tagText, tagX + 10, tagY - 6);

      // 3. Optional Landmarks (Eyes & Smile)
      if (showLandmarks && face.landmarks) {
        // Eyes
        this.ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
        this.ctx.lineWidth = 2;
        face.landmarks.eyes.forEach(([ex, ey, ew, eh]) => {
          const eyeCenterX = this.canvas.width - (ex + ew / 2) * scaleX;
          const eyeCenterY = (ey + eh / 2) * scaleY;
          const radius = (ew * scaleX) / 2.2;
          this.ctx.beginPath();
          this.ctx.arc(eyeCenterX, eyeCenterY, Math.max(4, radius), 0, Math.PI * 2);
          this.ctx.stroke();
        });

        // Smile
        this.ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        face.landmarks.smiles.forEach(([sx, sy, sw, sh]) => {
          const smX = this.canvas.width - (sx + sw) * scaleX;
          const smY = sy * scaleY;
          this.ctx.strokeRect(smX, smY, sw * scaleX, sh * scaleY);
        });
      }
    });
  }

  updateDominantHero(face) {
    document.getElementById("dominantEmoji").innerText = face.emoji;
    document.getElementById("dominantName").innerText = face.dominant_emotion;
    document.getElementById("dominantConfidence").innerText = `${face.confidence}% Confidence`;

    const heroCard = document.getElementById("dominantHero");
    heroCard.style.borderColor = face.color;
  }

  resetDominantHero() {
    document.getElementById("dominantEmoji").innerText = "😐";
    document.getElementById("dominantName").innerText = "Searching for face...";
    document.getElementById("dominantConfidence").innerText = "0.0% Confidence";
    document.getElementById("dominantHero").style.borderColor = "var(--border-subtle)";
  }

  updateEmotionBars(probabilities) {
    if (!probabilities) return;

    for (const [emotion, pct] of Object.entries(probabilities)) {
      const bar = document.getElementById(`bar-${emotion}`);
      const val = document.getElementById(`val-${emotion}`);
      if (bar) bar.style.width = `${pct}%`;
      if (val) val.innerText = `${pct.toFixed(1)}%`;
    }
  }

  /* --------------------------------------------------------------------------
     Audio Chime Synthesizer
     -------------------------------------------------------------------------- */
  playEmotionChime(emotion) {
    if (!document.getElementById("chkAudioFeedback").checked) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      const freqMap = {
        Happy: 659.25,   // E5
        Surprise: 783.99,// G5
        Neutral: 440.0,  // A4
        Sad: 329.63,     // E4
        Angry: 220.0,    // A3
        Fear: 369.99,    // F#4
        Disgust: 293.66  // D4
      };

      osc.type = "sine";
      osc.frequency.setValueAtTime(freqMap[emotion] || 440, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  /* --------------------------------------------------------------------------
     Snapshots
     -------------------------------------------------------------------------- */
  captureSnapshot() {
    if (!this.isStreaming || !this.video.videoWidth) return;

    // Create merged canvas
    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = this.canvas.width;
    snapCanvas.height = this.canvas.height;
    const snapCtx = snapCanvas.getContext("2d");

    // Draw video mirrored
    snapCtx.save();
    snapCtx.translate(snapCanvas.width, 0);
    snapCtx.scale(-1, 1);
    snapCtx.drawImage(this.video, 0, 0, snapCanvas.width, snapCanvas.height);
    snapCtx.restore();

    // Draw overlay HUD
    snapCtx.drawImage(this.canvas, 0, 0);

    const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.9);
    const dominant = document.getElementById("dominantName").innerText;
    const time = new Date().toLocaleTimeString();

    this.snapshots.unshift({ dataUrl, dominant, time });
    this.renderSnapshots();
  }

  renderSnapshots() {
    const section = document.getElementById("snapshotsSection");
    const grid = document.getElementById("snapshotsGrid");
    if (!section || !grid) return;

    section.style.display = this.snapshots.length > 0 ? "block" : "none";
    grid.innerHTML = "";

    this.snapshots.slice(0, 8).forEach((snap, idx) => {
      const item = document.createElement("div");
      item.className = "snapshot-item";
      item.innerHTML = `
        <img src="${snap.dataUrl}" alt="Snapshot" />
        <div class="snapshot-tag">${snap.dominant} • ${snap.time}</div>
      `;
      item.title = "Click to download snapshot";
      item.onclick = () => {
        const a = document.createElement("a");
        a.href = snap.dataUrl;
        a.download = `emotion_snapshot_${idx + 1}.jpg`;
        a.click();
      };
      grid.appendChild(item);
    });
  }

  clearSnapshots() {
    this.snapshots = [];
    this.renderSnapshots();
  }

  /* --------------------------------------------------------------------------
     Image Upload Inspection
     -------------------------------------------------------------------------- */
  async handleImageUpload(file) {
    if (!file) return;

    const preview = document.getElementById("uploadedPreview");
    const canvas = document.getElementById("uploadOverlayCanvas");
    const resultContainer = document.getElementById("uploadResultContainer");
    const summaryMeta = document.getElementById("uploadFaceSummary");
    const barsContainer = document.getElementById("uploadEmotionBars");

    // Display image preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      preview.src = e.target.result;
      resultContainer.style.display = "grid";

      // Upload to FastAPI backend
      const formData = new FormData();
      formData.append("file", file);

      try {
        summaryMeta.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing facial emotions...`;
        const res = await fetch("/api/detect", { method: "POST", body: formData });
        const result = await res.json();

        if (result.success) {
          this.renderUploadResults(result, preview, canvas, summaryMeta, barsContainer);
        } else {
          summaryMeta.innerHTML = `<span style="color:#ef4444">Error: ${result.error || "Analysis failed"}</span>`;
        }
      } catch (err) {
        summaryMeta.innerHTML = `<span style="color:#ef4444">Network error: ${err.message}</span>`;
      }
    };
    reader.readAsDataURL(file);
  }

  renderUploadResults(result, imgEl, canvas, summaryEl, barsEl) {
    const { faces, faces_detected } = result;
    summaryEl.innerHTML = `<strong>${faces_detected} Face(s) Detected</strong> in high-resolution image`;

    // Wait for image dimensions
    imgEl.onload = () => {
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      faces.forEach((face) => {
        const { x, y, width, height } = face.bbox;
        ctx.strokeStyle = face.color || "#06b6d4";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        // Label tag
        const tagText = `${face.emoji} ${face.dominant_emotion} (${face.confidence}%)`;
        ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = "rgba(11, 16, 29, 0.9)";
        ctx.fillRect(x, Math.max(0, y - 36), ctx.measureText(tagText).width + 20, 36);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(tagText, x + 10, Math.max(26, y - 10));
      });
    };
    if (imgEl.complete) imgEl.onload();

    // Render bars for primary face
    if (faces.length > 0) {
      const primary = faces[0];
      barsEl.innerHTML = "";
      for (const [emo, pct] of Object.entries(primary.probabilities)) {
        barsEl.innerHTML += `
          <div class="emotion-bar-row">
            <div class="emo-label-col">
              <span class="emo-emoji">${primary.dominant_emotion === emo ? primary.emoji : "•"}</span>
              <span class="emo-name">${emo}</span>
            </div>
            <div class="emo-progress-track">
              <div class="emo-progress-fill emo-${emo.toLowerCase()}" style="width: ${pct}%"></div>
            </div>
            <div class="emo-percent-col">${pct.toFixed(1)}%</div>
          </div>
        `;
      }
    }
  }

  /* --------------------------------------------------------------------------
     Deep Analytics & Data Export
     -------------------------------------------------------------------------- */
  async refreshAnalyticsView() {
    try {
      const res = await fetch("/api/analytics");
      const summary = await res.json();
      this.latestSummary = summary;

      document.getElementById("statDuration").innerText = `${summary.session_duration_sec}s`;
      document.getElementById("statFrames").innerText = summary.frames_analyzed;
      document.getElementById("statDominant").innerText = summary.overall_dominant_emotion;
      document.getElementById("statSentiment").innerText = `${summary.sentiment_index > 0 ? "+" : ""}${summary.sentiment_index} (${summary.sentiment_label})`;

      // Update doughnut chart
      if (window.emotionCharts) {
        window.emotionCharts.updateDistribution(summary.emotion_distribution);
      }

      // Populate metrics table
      const tbody = document.getElementById("metricsTableBody");
      tbody.innerHTML = "";

      const valenceMap = {
        Happy: "Positive Valence",
        Surprise: "Positive/Arousal Valence",
        Neutral: "Neutral Valence",
        Sad: "Negative Valence",
        Angry: "Negative Valence",
        Fear: "Negative Valence",
        Disgust: "Negative Valence"
      };

      for (const [emo, share] of Object.entries(summary.emotion_distribution || {})) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${emo}</strong></td>
          <td>${Math.round((share / 100) * summary.faces_detected)} frames</td>
          <td><span style="font-family:'JetBrains Mono'">${share}%</span></td>
          <td style="color:var(--text-muted)">${valenceMap[emo] || "Standard"}</td>
        `;
        tbody.appendChild(tr);
      }
    } catch (e) {
      console.warn("Could not fetch analytics:", e);
    }
  }

  async resetSession() {
    try {
      await fetch("/api/analytics/reset", { method: "POST" });
      if (window.emotionCharts) window.emotionCharts.reset();
      this.snapshots = [];
      this.renderSnapshots();
      this.refreshAnalyticsView();
      alert("Session analytics reset successfully.");
    } catch (e) {
      console.error(e);
    }
  }

  exportReport() {
    if (!this.latestSummary) {
      alert("No session data accumulated yet. Run camera first!");
      return;
    }

    const report = {
      title: "Facial Emotion Recognition Session Report",
      generated_at: new Date().toISOString(),
      summary: this.latestSummary,
      snapshots_captured: this.snapshots.length
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emotion_detection_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.emotionApp = new EmotionApp();
});
