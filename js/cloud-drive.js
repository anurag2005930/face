/* ==========================================================================
   Storage Management System - Cloud Drive & Asset Vault View
   ========================================================================== */

class CloudDriveController {
  constructor() {
    this.viewMode = 'grid'; // 'grid' or 'table'
    this.currentFilter = 'all'; // 'all', 'document', 'image', 'video', 'code', 'archive', 'starred', 'trash'
    this.searchQuery = '';
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // View Toggle Buttons
    const gridBtn = document.getElementById('view-grid-btn');
    const tableBtn = document.getElementById('view-table-btn');
    if (gridBtn && tableBtn) {
      gridBtn.addEventListener('click', () => {
        this.viewMode = 'grid';
        gridBtn.classList.add('active');
        tableBtn.classList.remove('active');
        this.render();
      });
      tableBtn.addEventListener('click', () => {
        this.viewMode = 'table';
        tableBtn.classList.add('active');
        gridBtn.classList.remove('active');
        this.render();
      });
    }

    // Filter Dropdown
    const filterSelect = document.getElementById('file-filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.render();
      });
    }

    // New Folder Button
    const newFolderBtn = document.getElementById('btn-new-folder');
    if (newFolderBtn) {
      newFolderBtn.addEventListener('click', () => {
        app.showModal('modal-create-folder');
      });
    }

    // Upload File Button
    const uploadBtn = document.getElementById('btn-upload-file');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        app.showModal('modal-upload-file');
      });
    }
  }

  render() {
    this.renderBreadcrumbs();
    this.renderFilesAndFolders();
    app.updateSidebarMeter();
  }

  renderBreadcrumbs() {
    const container = document.getElementById('drive-breadcrumbs');
    if (!container) return;

    if (this.currentFilter === 'trash') {
      container.innerHTML = `
        <span class="breadcrumb-item"><i class="fa-solid fa-trash-can"></i> Trash Bin</span>
      `;
      return;
    }

    if (this.currentFilter === 'starred') {
      container.innerHTML = `
        <span class="breadcrumb-item"><i class="fa-solid fa-star text-warning"></i> Starred Items</span>
      `;
      return;
    }

    const hierarchy = state.getFolderHierarchy(state.data.currentFolderId);
    let html = '';
    hierarchy.forEach((fld, idx) => {
      const isLast = idx === hierarchy.length - 1;
      if (isLast) {
        html += `<span class="breadcrumb-item font-semibold text-primary">${fld.name}</span>`;
      } else {
        html += `
          <span class="breadcrumb-item" onclick="cloudDrive.navigateToFolder('${fld.id}')">${fld.name}</span>
          <span class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></span>
        `;
      }
    });
    container.innerHTML = html;
  }

  navigateToFolder(folderId) {
    state.data.currentFolderId = folderId;
    this.currentFilter = 'all';
    const filterSelect = document.getElementById('file-filter-select');
    if (filterSelect) filterSelect.value = 'all';
    this.render();
  }

  renderFilesAndFolders() {
    const gridContainer = document.getElementById('files-grid-view');
    const tableContainer = document.getElementById('files-table-view');
    const emptyState = document.getElementById('files-empty-state');

    if (!gridContainer || !tableContainer) return;

    const isTrashView = this.currentFilter === 'trash';
    const isStarredView = this.currentFilter === 'starred';

    // Fetch folders
    let folders = [];
    if (!isTrashView && !isStarredView && this.currentFilter === 'all' && !this.searchQuery) {
      folders = state.getFolders(state.data.currentFolderId);
    }

    // Fetch files
    let files = [];
    if (isTrashView) {
      files = state.getFiles(null, false, true);
    } else if (isStarredView) {
      files = state.getFiles(null, true, false);
    } else if (this.currentFilter !== 'all') {
      files = state.getFiles(null, false, false).filter(f => f.type === this.currentFilter);
    } else {
      files = state.getFiles(state.data.currentFolderId, false, false);
    }

    // Global Search Filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(q) || (f.tag && f.tag.toLowerCase().includes(q)));
      folders = folders.filter(f => f.name.toLowerCase().includes(q));
    }

    const totalItems = folders.length + files.length;

    if (totalItems === 0) {
      gridContainer.style.display = 'none';
      tableContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    if (this.viewMode === 'grid') {
      gridContainer.style.display = 'grid';
      tableContainer.style.display = 'none';
      gridContainer.innerHTML = this.buildGridHTML(folders, files, isTrashView);
    } else {
      gridContainer.style.display = 'none';
      tableContainer.style.display = 'block';
      tableContainer.innerHTML = this.buildTableHTML(folders, files, isTrashView);
    }
  }

  buildGridHTML(folders, files, isTrash) {
    let html = '';

    // Folders
    folders.forEach(f => {
      html += `
        <div class="file-card" onclick="cloudDrive.navigateToFolder('${f.id}')">
          <div class="file-card-header">
            <i class="fa-solid fa-folder file-icon folder"></i>
            <div class="file-card-actions" onclick="event.stopPropagation()">
              <button class="action-icon-btn" title="Folder Settings"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </div>
          </div>
          <div class="file-name">${f.name}</div>
          <div class="file-meta">
            <span>Folder</span>
            <span>${f.createdAt}</span>
          </div>
        </div>
      `;
    });

    // Files
    files.forEach(f => {
      const iconClass = this.getFileIconClass(f.type);
      const formattedSize = formatBytes(f.sizeBytes);
      html += `
        <div class="file-card" onclick="cloudDrive.openFilePreview('${f.id}')">
          <div class="file-card-header">
            <i class="${iconClass} file-icon ${f.type}"></i>
            <div class="file-card-actions" onclick="event.stopPropagation()">
              ${!isTrash ? `
                <button class="action-icon-btn ${f.starred ? 'starred' : ''}" onclick="cloudDrive.toggleStar('${f.id}')" title="Star">
                  <i class="fa-${f.starred ? 'solid' : 'regular'} fa-star"></i>
                </button>
                <button class="action-icon-btn" onclick="cloudDrive.openShareModal('${f.id}')" title="Share">
                  <i class="fa-solid fa-share-nodes"></i>
                </button>
                <button class="action-icon-btn" onclick="cloudDrive.trashFile('${f.id}')" title="Trash">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : `
                <button class="action-icon-btn text-success" onclick="cloudDrive.restoreFile('${f.id}')" title="Restore">
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button class="action-icon-btn text-danger" onclick="cloudDrive.deletePermanently('${f.id}')" title="Delete Forever">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              `}
            </div>
          </div>
          <div class="file-name" title="${f.name}">${f.name}</div>
          <div class="file-meta">
            <span>${formattedSize}</span>
            ${f.tag ? `<span class="tag-pill">${f.tag}</span>` : `<span>${f.updatedAt}</span>`}
          </div>
        </div>
      `;
    });

    return html;
  }

  buildTableHTML(folders, files, isTrash) {
    let rowsHTML = '';

    folders.forEach(f => {
      rowsHTML += `
        <tr onclick="cloudDrive.navigateToFolder('${f.id}')">
          <td>
            <div class="table-file-name">
              <i class="fa-solid fa-folder file-icon folder" style="font-size: 1.1rem;"></i>
              <span>${f.name}</span>
            </div>
          </td>
          <td>Folder</td>
          <td>--</td>
          <td>${f.createdAt}</td>
          <td>--</td>
        </tr>
      `;
    });

    files.forEach(f => {
      const iconClass = this.getFileIconClass(f.type);
      const formattedSize = formatBytes(f.sizeBytes);
      rowsHTML += `
        <tr onclick="cloudDrive.openFilePreview('${f.id}')">
          <td>
            <div class="table-file-name">
              <i class="${iconClass} file-icon ${f.type}" style="font-size: 1.1rem;"></i>
              <span>${f.name}</span>
            </div>
          </td>
          <td class="text-capitalize">${f.type}</td>
          <td>${formattedSize}</td>
          <td>${f.updatedAt}</td>
          <td onclick="event.stopPropagation()">
            ${!isTrash ? `
              <button class="action-icon-btn ${f.starred ? 'starred' : ''}" onclick="cloudDrive.toggleStar('${f.id}')"><i class="fa-${f.starred ? 'solid' : 'regular'} fa-star"></i></button>
              <button class="action-icon-btn" onclick="cloudDrive.openShareModal('${f.id}')"><i class="fa-solid fa-share-nodes"></i></button>
              <button class="action-icon-btn" onclick="cloudDrive.trashFile('${f.id}')"><i class="fa-solid fa-trash"></i></button>
            ` : `
              <button class="action-icon-btn text-success" onclick="cloudDrive.restoreFile('${f.id}')"><i class="fa-solid fa-rotate-left"></i></button>
              <button class="action-icon-btn text-danger" onclick="cloudDrive.deletePermanently('${f.id}')"><i class="fa-solid fa-xmark"></i></button>
            `}
          </td>
        </tr>
      `;
    });

    return `
      <div class="files-table-wrapper">
        <table class="files-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  getFileIconClass(type) {
    switch (type) {
      case 'image': return 'fa-solid fa-file-image';
      case 'video': return 'fa-solid fa-file-video';
      case 'document': return 'fa-solid fa-file-pdf';
      case 'code': return 'fa-solid fa-file-code';
      case 'archive': return 'fa-solid fa-file-zipper';
      default: return 'fa-solid fa-file';
    }
  }

  toggleStar(fileId) {
    state.toggleStar(fileId);
    this.render();
    app.showToast('Item star updated');
  }

  trashFile(fileId) {
    state.trashFile(fileId);
    this.render();
    app.showToast('Item moved to Trash', 'warning');
  }

  restoreFile(fileId) {
    state.restoreFile(fileId);
    this.render();
    app.showToast('Item restored successfully', 'success');
  }

  deletePermanently(fileId) {
    if (confirm('Are you sure you want to permanently delete this file? This action cannot be undone.')) {
      state.deletePermanently(fileId);
      this.render();
      app.showToast('Item permanently deleted', 'danger');
    }
  }

  openFilePreview(fileId) {
    const file = state.data.files.find(f => f.id === fileId);
    if (!file) return;

    const modalTitle = document.getElementById('modal-preview-title');
    const mediaContainer = document.getElementById('modal-preview-media');
    const detailsContainer = document.getElementById('modal-preview-details');
    const saveBtn = document.getElementById('btn-save-preview-content');

    if (modalTitle) modalTitle.textContent = file.name;
    if (saveBtn) saveBtn.style.display = 'none';

    const fileSrc = file.url || (file.content && file.content.startsWith('data:') ? file.content : null);

    if (mediaContainer) {
      if (file.type === 'image' && fileSrc) {
        mediaContainer.innerHTML = `<img src="${fileSrc}" alt="${file.name}" style="max-width:100%; max-height:350px; object-fit:contain;" />`;
      } else if (file.type === 'video' && fileSrc) {
        mediaContainer.innerHTML = `<video controls src="${fileSrc}" style="max-width:100%; max-height:350px;"></video>`;
      } else if ((file.type === 'document' || file.name.endsWith('.pdf')) && fileSrc && fileSrc.startsWith('data:application/pdf')) {
        mediaContainer.innerHTML = `<iframe src="${fileSrc}" style="width:100%; height:340px; border:none; border-radius:8px;"></iframe>`;
      } else if (file.content || file.type === 'code' || file.type === 'document') {
        const textVal = file.content || '';
        mediaContainer.innerHTML = `
          <div style="width:100%; padding:0.5rem;">
            <textarea id="preview-editor-textarea" class="form-textarea" style="font-family: monospace; font-size: 0.85rem; min-height: 220px; background: #0b0f19; color: #10b981; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem;" placeholder="File text content...">${app.escapeHtml(textVal)}</textarea>
          </div>
        `;
        if (saveBtn) {
          saveBtn.style.display = 'inline-flex';
          saveBtn.onclick = () => {
            const textarea = document.getElementById('preview-editor-textarea');
            if (textarea) {
              const updatedVal = textarea.value;
              state.updateFileContent(file.id, updatedVal);
              this.render();
              app.updateSidebarMeter();
              app.showToast(`Saved changes to '${file.name}'!`, 'success');
            }
          };
        }
      } else {
        mediaContainer.innerHTML = `
          <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
            <i class="${this.getFileIconClass(file.type)}" style="font-size: 4rem; margin-bottom: 1rem; color: var(--accent-primary);"></i>
            <p style="font-size:0.9rem; font-weight:600;">Binary File Asset</p>
            <p style="font-size:0.78rem; margin-top:0.35rem;">Size: ${formatBytes(file.sizeBytes)}</p>
          </div>
        `;
      }
    }

    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-secondary); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <div><strong>File Size:</strong> ${formatBytes(file.sizeBytes)}</div>
          <div><strong>Type:</strong> ${file.type.toUpperCase()}</div>
          <div><strong>Last Modified:</strong> ${file.updatedAt}</div>
          <div><strong>Tag:</strong> ${file.tag || 'None'}</div>
        </div>
      `;
    }

    app.showModal('modal-file-preview');
  }

  openShareModal(fileId) {
    const file = state.data.files.find(f => f.id === fileId);
    if (!file) return;

    const linkInput = document.getElementById('share-link-input');
    if (linkInput) {
      linkInput.value = `https://storage.cloud-vault.io/share/${file.id}?token=x9f8a73b`;
    }
    app.showModal('modal-share-file');
  }
}

function detectFileCategory(fileName, mimeType = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp'].includes(ext) || mimeType.startsWith('image/')) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext) || mimeType.startsWith('video/')) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac'].includes(ext) || mimeType.startsWith('audio/')) return 'audio';
  if (['js', 'html', 'css', 'json', 'yaml', 'yml', 'ts', 'py', 'java', 'c', 'cpp', 'sh', 'sql', 'md'].includes(ext)) return 'code';
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return 'archive';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'csv', 'xlsx'].includes(ext) || mimeType.startsWith('text/')) return 'document';
  return 'document';
}

const cloudDrive = new CloudDriveController();
