/* ==========================================================================
   Storage Management System - Server Storage Nodes & Datacenter Pools
   ========================================================================== */

class ServerVolumesController {
  constructor() {
    this.telemetryInterval = null;
  }

  init() {
    this.render();
    this.startLiveTelemetry();
  }

  startLiveTelemetry() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    // Simulate live fluctuation in IOPS and node metrics
    this.telemetryInterval = setInterval(() => {
      state.data.serverNodes.forEach(node => {
        if (node.status === 'online') {
          const deltaRead = Math.floor((Math.random() - 0.5) * 4000);
          const deltaWrite = Math.floor((Math.random() - 0.5) * 3000);
          node.readIops = Math.max(1000, node.readIops + deltaRead);
          node.writeIops = Math.max(800, node.writeIops + deltaWrite);
        }
      });
      // If server volumes view is active, update numbers
      const activeView = document.getElementById('view-server-nodes');
      if (activeView && activeView.classList.contains('active')) {
        this.updateLiveMetricUI();
      }
    }, 2500);
  }

  render() {
    const container = document.getElementById('server-nodes-grid');
    if (!container) return;

    const badge = document.querySelector('.nav-item[data-view="server-nodes"] .badge');
    if (badge) {
      badge.textContent = `${state.data.serverNodes.length} Pools`;
    }

    let html = '';
    state.data.serverNodes.forEach(node => {
      const usedFormatted = formatBytes(node.usedBytes);
      const totalFormatted = formatBytes(node.totalCapacityBytes);
      const percentUsed = Math.round((node.usedBytes / node.totalCapacityBytes) * 100);

      html += `
        <div class="node-card">
          <div class="node-header">
            <div class="node-title">
              <i class="fa-solid fa-server text-accent" style="font-size: 1.2rem;"></i>
              <div>
                <div>${node.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">${node.type}</div>
              </div>
            </div>
            <div class="status-badge ${node.status}">
              <span class="dot"></span> ${node.status.toUpperCase()}
            </div>
          </div>

          <div class="node-metrics">
            <div class="metric-item">
              <div class="metric-label">READ IOPS</div>
              <div class="metric-val text-accent" id="read-iops-${node.id}">${node.readIops.toLocaleString()}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">WRITE IOPS</div>
              <div class="metric-val text-info" id="write-iops-${node.id}">${node.writeIops.toLocaleString()}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">POOL TEMP</div>
              <div class="metric-val">${node.temperature}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">HEALTH SMART</div>
              <div class="metric-val text-success">${node.healthPercent}%</div>
            </div>
          </div>

          <div style="margin-bottom: 0.5rem; font-size: 0.82rem; display: flex; justify-content: space-between;">
            <span>Capacity Allocation</span>
            <span style="font-weight: 600;">${usedFormatted} / ${totalFormatted} (${percentUsed}%)</span>
          </div>

          <div class="progress-bar-bg" style="height: 8px;">
            <div class="progress-bar-fill" style="width: ${percentUsed}%; background: ${percentUsed > 85 ? 'var(--danger)' : 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))'}"></div>
          </div>

          <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="serverVolumes.scrubVolume('${node.id}')"><i class="fa-solid fa-stethoscope"></i> Scrub Pool</button>
            <button class="btn btn-secondary btn-sm" onclick="serverVolumes.showDetails('${node.id}')"><i class="fa-solid fa-gear"></i> Provision</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  updateLiveMetricUI() {
    state.data.serverNodes.forEach(node => {
      const readEl = document.getElementById(`read-iops-${node.id}`);
      const writeEl = document.getElementById(`write-iops-${node.id}`);
      if (readEl) readEl.textContent = node.readIops.toLocaleString();
      if (writeEl) writeEl.textContent = node.writeIops.toLocaleString();
    });
  }

  scrubVolume(nodeId) {
    const node = state.data.serverNodes.find(n => n.id === nodeId);
    if (node) {
      app.showToast(`Started SMART scrub diagnostic on ${node.name}...`, 'info');
      setTimeout(() => {
        app.showToast(`Scrub complete on ${node.name}. 0 block errors detected.`, 'success');
        state.addActivity('volume', `Manual pool scrub completed on ${node.name}`);
      }, 2000);
    }
  }

  showDetails(nodeId) {
    const node = state.data.serverNodes.find(n => n.id === nodeId);
    if (node) {
      alert(`Storage Volume Pool: ${node.name}\nType: ${node.type}\nCapacity: ${formatBytes(node.usedBytes)} used of ${formatBytes(node.totalCapacityBytes)}\nHealth: ${node.healthPercent}% SMART Status Clean.`);
    }
  }
}

const serverVolumes = new ServerVolumesController();
