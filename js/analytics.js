/* ==========================================================================
   Storage Management System - Analytics & Quota Charts
   ========================================================================== */

class AnalyticsController {
  constructor() {
    this.doughnutChart = null;
    this.growthChart = null;
  }

  init() {
    this.render();
  }

  render() {
    const usedStorageEl = document.getElementById('analytics-used-storage');
    if (usedStorageEl) {
      usedStorageEl.textContent = formatBytes(state.getTotalBytesUsed());
    }
    this.renderStorageBreakdownChart();
    this.renderGrowthChart();
    this.renderLargestFilesTable();
  }

  renderStorageBreakdownChart() {
    const ctx = document.getElementById('chart-storage-breakdown');
    if (!ctx) return;

    const breakdown = state.getStorageBreakdown();

    if (this.doughnutChart) this.doughnutChart.destroy();

    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Documents', 'Images', 'Videos', 'Code', 'Archives', 'Other'],
        datasets: [{
          data: [
            breakdown.document,
            breakdown.image,
            breakdown.video,
            breakdown.code,
            breakdown.archive,
            breakdown.other
          ],
          backgroundColor: [
            '#3b82f6', // Documents
            '#ec4899', // Images
            '#8b5cf6', // Videos
            '#10b981', // Code
            '#f97316', // Archives
            '#6b7280'  // Other
          ],
          borderWidth: 2,
          borderColor: '#111827'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const val = context.raw || 0;
                return `${label}: ${formatBytes(val)}`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  renderGrowthChart() {
    const ctx = document.getElementById('chart-storage-growth');
    if (!ctx) return;

    if (this.growthChart) this.growthChart.destroy();

    this.growthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [{
          label: 'Storage Consumption (GB)',
          data: [120, 190, 300, 480, 520, 750, 980, 1420],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  renderLargestFilesTable() {
    const container = document.getElementById('analytics-largest-files');
    if (!container) return;

    const files = [...state.data.files]
      .filter(f => !f.trashed)
      .sort((a, b) => b.sizeBytes - a.sizeBytes)
      .slice(0, 5);

    let rowsHTML = '';
    files.forEach(f => {
      rowsHTML += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${f.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${f.type.toUpperCase()}</div>
          </td>
          <td style="font-weight: 600; color: var(--accent-primary);">${formatBytes(f.sizeBytes)}</td>
          <td>${f.updatedAt}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="cloudDrive.openFilePreview('${f.id}')"><i class="fa-solid fa-eye"></i> View</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="files-table-wrapper">
        <table class="files-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Modified</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }
}

const analytics = new AnalyticsController();
