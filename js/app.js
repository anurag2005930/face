/* ==========================================================================
   Storage Management System - Main App Controller
   ========================================================================== */

class AppController {
  constructor() {
    this.currentView = 'payment-directory'; // 'payment-directory', 'drive', 'server-nodes', 'warehouse', 'analytics', 'activities'
  }

  init() {
    this.applyTheme(state.data.theme);
    this.bindNavigation();
    this.bindGlobalSearch();
    this.bindModals();
    this.bindFileUploadAndDragDrop();
    this.bindFormSubmissions();
    this.bindBackupImport();
    this.bindThemeToggle();

    // Initialize View Controllers
    if (typeof paymentDirectory !== 'undefined') paymentDirectory.init();
    cloudDrive.init();
    serverVolumes.init();
    warehouse.init();
    analytics.init();
    if (typeof speedTest !== 'undefined') speedTest.init();

    this.renderActivityLog();
    this.updateSidebarMeter();

    console.log('Payment Directory & Enterprise Portal initialized successfully.');
  }

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = item.getAttribute('data-view');
        if (viewName) {
          this.switchView(viewName);
        }
      });
    });
  }

  bindGlobalSearch() {
    const globalSearchInput = document.getElementById('global-search-input');
    if (globalSearchInput) {
      globalSearchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (typeof paymentDirectory !== 'undefined') {
          paymentDirectory.searchQuery = val;
          paymentDirectory.renderCatalog();
        }
      });
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update Nav Active state
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update Views visibility
    document.querySelectorAll('.view-container').forEach(el => {
      el.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    if (viewName === 'speed-test' && typeof speedTest !== 'undefined') {
      speedTest.resizeCanvas();
    }
    if (viewName === 'payment-directory' && typeof paymentDirectory !== 'undefined') {
      paymentDirectory.render();
    }
  }

  bindFileUploadAndDragDrop() {
    const realInput = document.getElementById('real-file-input');
    const dropzone = document.getElementById('upload-dropzone');
    const statusEl = document.getElementById('upload-file-status');
    const nameInput = document.getElementById('input-upload-name');
    const typeSelect = document.getElementById('select-upload-type');
    const contentInput = document.getElementById('input-upload-content');

    this.selectedRealFiles = [];

    if (dropzone && realInput) {
      dropzone.addEventListener('click', () => {
        realInput.click();
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.background = 'rgba(99, 102, 241, 0.35)';
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.style.background = '';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.background = '';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.processSelectedFiles(e.dataTransfer.files);
        }
      });

      realInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.processSelectedFiles(e.target.files);
        }
      });
    }
  }

  processSelectedFiles(fileList) {
    this.selectedRealFiles = Array.from(fileList);
    const statusEl = document.getElementById('upload-file-status');
    const nameInput = document.getElementById('input-upload-name');
    const typeSelect = document.getElementById('select-upload-type');
    const contentInput = document.getElementById('input-upload-content');

    if (this.selectedRealFiles.length === 1) {
      const file = this.selectedRealFiles[0];
      if (nameInput) nameInput.value = file.name;
      const detectedCat = detectFileCategory(file.name, file.type);
      if (typeSelect) typeSelect.value = detectedCat;

      if (statusEl) {
        statusEl.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
      }

      // Read file content or data URL
      const reader = new FileReader();
      if (['code', 'document'].includes(detectedCat) && !file.name.endsWith('.pdf')) {
        reader.onload = (e) => {
          if (contentInput) contentInput.value = e.target.result;
          this.selectedRealFiles[0].parsedContent = e.target.result;
        };
        reader.readAsText(file);
      } else {
        reader.onload = (e) => {
          this.selectedRealFiles[0].parsedUrl = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    } else if (this.selectedRealFiles.length > 1) {
      if (statusEl) {
        statusEl.textContent = `Selected ${this.selectedRealFiles.length} files for batch upload`;
      }
      if (nameInput) nameInput.value = `Batch Upload (${this.selectedRealFiles.length} items)`;
    }
  }

  bindFormSubmissions() {
    // New Folder Form
    const folderForm = document.getElementById('form-create-folder');
    if (folderForm) {
      folderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('input-folder-name');
        if (nameInput && nameInput.value.trim()) {
          state.addFolder(nameInput.value.trim(), state.data.currentFolderId);
          nameInput.value = '';
          this.closeModal('modal-create-folder');
          cloudDrive.render();
          this.showToast('New folder created', 'success');
        }
      });
    }

    // Real Upload File Form
    const uploadForm = document.getElementById('form-upload-file');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('input-upload-name');
        const typeSelect = document.getElementById('select-upload-type');
        const tagInput = document.getElementById('input-upload-tag');
        const contentInput = document.getElementById('input-upload-content');

        const fileType = typeSelect ? typeSelect.value : 'document';
        const fileTag = tagInput ? tagInput.value.trim() : '';

        if (this.selectedRealFiles && this.selectedRealFiles.length > 0) {
          // Process real user files
          let uploadedCount = 0;
          for (const rawFile of this.selectedRealFiles) {
            const cat = detectFileCategory(rawFile.name, rawFile.type);
            const isText = ['code', 'document'].includes(cat) && !rawFile.name.endsWith('.pdf');

            let contentData = rawFile.parsedContent || null;
            let urlData = rawFile.parsedUrl || null;

            if (!contentData && !urlData) {
              // Synchronous read promise fallback
              await new Promise((resolve) => {
                const reader = new FileReader();
                if (isText) {
                  reader.onload = (evt) => { contentData = evt.target.result; resolve(); };
                  reader.readAsText(rawFile);
                } else {
                  reader.onload = (evt) => { urlData = evt.target.result; resolve(); };
                  reader.readAsDataURL(rawFile);
                }
              });
            }

            const newFileObj = {
              id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              name: rawFile.name,
              folderId: state.data.currentFolderId,
              type: cat,
              sizeBytes: rawFile.size,
              updatedAt: new Date().toISOString().split('T')[0],
              starred: false,
              trashed: false,
              tag: fileTag,
              content: contentData || (contentInput ? contentInput.value : ''),
              url: urlData || null
            };

            state.addFile(newFileObj);
            uploadedCount++;
          }

          this.selectedRealFiles = [];
          const statusEl = document.getElementById('upload-file-status');
          if (statusEl) statusEl.textContent = '';
          if (nameInput) nameInput.value = '';
          if (contentInput) contentInput.value = '';
          if (tagInput) tagInput.value = '';

          this.closeModal('modal-upload-file');
          cloudDrive.render();
          this.updateSidebarMeter();
          this.showToast(`Uploaded ${uploadedCount} file(s) successfully!`, 'success');
        } else if (nameInput && nameInput.value.trim()) {
          // Manual custom file entry
          const manualFile = {
            id: 'file_' + Date.now(),
            name: nameInput.value.trim(),
            folderId: state.data.currentFolderId,
            type: fileType,
            sizeBytes: contentInput && contentInput.value ? new Blob([contentInput.value]).size : 1024,
            updatedAt: new Date().toISOString().split('T')[0],
            starred: false,
            trashed: false,
            tag: fileTag,
            content: contentInput ? contentInput.value : ''
          };

          state.addFile(manualFile);
          nameInput.value = '';
          if (contentInput) contentInput.value = '';
          if (tagInput) tagInput.value = '';

          this.closeModal('modal-upload-file');
          cloudDrive.render();
          this.updateSidebarMeter();
          this.showToast(`File '${manualFile.name}' saved to storage`, 'success');
        }
      });
    }

    // Datacenter Volume Provisioning Form
    const volForm = document.getElementById('form-provision-volume');
    if (volForm) {
      volForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('input-vol-name');
        const typeSelect = document.getElementById('select-vol-type');
        const capacityInput = document.getElementById('input-vol-capacity');
        const readInput = document.getElementById('input-vol-read');
        const writeInput = document.getElementById('input-vol-write');

        if (nameInput && capacityInput) {
          const capTb = parseFloat(capacityInput.value) || 10;
          const newVol = {
            id: 'node_' + Date.now(),
            name: nameInput.value.trim(),
            type: typeSelect ? typeSelect.value : 'NVMe RAID 10',
            totalCapacityBytes: capTb * 1000000000000, // TB in bytes
            usedBytes: 0,
            status: 'online',
            readIops: parseInt(readInput.value) || 50000,
            writeIops: parseInt(writeInput.value) || 40000,
            temperature: '36°C',
            healthPercent: 100
          };

          state.addServerVolume(newVol);
          nameInput.value = '';
          capacityInput.value = '';

          this.closeModal('modal-provision-volume');
          serverVolumes.render();
          this.showToast(`Storage pool '${newVol.name}' provisioned!`, 'success');
        }
      });
    }

    // Warehouse Bin Stock Form
    const stockForm = document.getElementById('form-stock-bin');
    if (stockForm) {
      stockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rackId = document.getElementById('input-bin-rack-id').value;
        const binKey = document.getElementById('input-bin-key').value;
        const sku = document.getElementById('input-bin-sku').value.trim();
        const name = document.getElementById('input-bin-name').value.trim();
        const qty = parseInt(document.getElementById('input-bin-qty').value) || 1;

        if (rackId && binKey && sku && name) {
          state.updateWarehouseBin(rackId, binKey, { sku, name, qty });
          this.closeModal('modal-stock-bin');
          warehouse.render();
          warehouse.selectBin(rackId, binKey);
          this.showToast(`Updated bin slot ${binKey.toUpperCase()} stock`, 'success');
        }
      });
    }

    // Clear Bin Stock Button
    const clearBinBtn = document.getElementById('btn-clear-bin');
    if (clearBinBtn) {
      clearBinBtn.addEventListener('click', () => {
        const rackId = document.getElementById('input-bin-rack-id').value;
        const binKey = document.getElementById('input-bin-key').value;
        if (rackId && binKey) {
          state.updateWarehouseBin(rackId, binKey, null);
          this.closeModal('modal-stock-bin');
          warehouse.render();
          warehouse.selectBin(rackId, binKey);
          this.showToast(`Cleared bin slot ${binKey.toUpperCase()}`, 'warning');
        }
      });
    }
  }

  bindBackupImport() {
    const backupInput = document.getElementById('backup-file-input');
    if (backupInput) {
      backupInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const success = state.importState(evt.target.result);
            if (success) {
              cloudDrive.render();
              serverVolumes.render();
              warehouse.render();
              analytics.render();
              this.updateSidebarMeter();
              this.renderActivityLog();
              this.showToast('Restored system storage backup successfully!', 'success');
            } else {
              this.showToast('Invalid backup file format.', 'danger');
            }
          };
          reader.readAsText(e.target.files[0]);
        }
      });
    }
  }

  updateSidebarMeter() {
    const usedBytes = state.getTotalBytesUsed();
    const limitBytes = state.data.storageLimitBytes;
    const percent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

    const fillEl = document.getElementById('sidebar-meter-fill');
    const textEl = document.getElementById('sidebar-meter-text');

    if (fillEl) fillEl.style.width = `${percent}%`;
    if (textEl) textEl.textContent = `${formatBytes(usedBytes)} / ${formatBytes(limitBytes)} (${percent}%)`;
  }

  renderActivityLog() {
    const container = document.getElementById('activity-log-list');
    if (!container) return;

    let html = '';
    state.data.activities.forEach(act => {
      let icon = 'fa-solid fa-info-circle text-info';
      if (act.type === 'upload') icon = 'fa-solid fa-cloud-arrow-up text-accent';
      if (act.type === 'volume') icon = 'fa-solid fa-server text-success';
      if (act.type === 'trash') icon = 'fa-solid fa-trash text-warning';
      if (act.type === 'warehouse') icon = 'fa-solid fa-boxes-stacked text-primary';
      if (act.type === 'speedtest') icon = 'fa-solid fa-gauge-high text-accent';

      html += `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <i class="${icon}" style="font-size: 1.25rem;"></i>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">${act.desc}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${act.user}</div>
            </div>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">${act.timestamp}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  bindThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const newTheme = state.data.theme === 'dark' ? 'light' : 'dark';
        state.data.theme = newTheme;
        state.saveState();
        this.applyTheme(newTheme);
      });
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'danger') icon = 'fa-circle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

const app = new AppController();

// Global init on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
