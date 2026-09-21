/* ==========================================================================
   Storage Management System - Physical Warehouse & Inventory Locator
   ========================================================================== */

class WarehouseController {
  constructor() {
    this.selectedBin = null;
  }

  init() {
    this.render();
  }

  render() {
    const container = document.getElementById('warehouse-rack-grid');
    if (!container) return;

    let html = '';
    state.data.warehouseRacks.forEach(rack => {
      let shelvesHTML = '';

      for (let s = 1; s <= rack.capacityShelves; s++) {
        let binsHTML = '';
        for (let b = 1; b <= rack.binsPerShelf; b++) {
          const binKey = `s${s}-b${b}`;
          const isOccupied = rack.occupiedBins.includes(binKey);
          const item = rack.itemMapping[binKey];

          binsHTML += `
            <div class="bin-slot ${isOccupied ? 'occupied' : ''}" 
                 onclick="warehouse.selectBin('${rack.id}', '${binKey}')"
                 title="${isOccupied && item ? `${item.name} (${item.qty} units)` : 'Empty Shelf Slot S' + s + '-B' + b}">
              ${s}${b}
            </div>
          `;
        }

        shelvesHTML += `
          <div class="shelf-row">
            <span style="font-weight: 600;">Shelf ${s}</span>
            <div class="shelf-bins">
              ${binsHTML}
            </div>
          </div>
        `;
      }

      html += `
        <div class="rack-card">
          <div class="rack-header">
            <div>
              <div class="rack-title"><i class="fa-solid fa-boxes-stacked text-warning" style="margin-right: 0.4rem;"></i> ${rack.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${rack.zone}</div>
            </div>
            <span class="tag-pill">${rack.occupiedBins.length} / ${rack.capacityShelves * rack.binsPerShelf} Slots</span>
          </div>

          <div class="shelves-container">
            ${shelvesHTML}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  selectBin(rackId, binKey) {
    const rack = state.data.warehouseRacks.find(r => r.id === rackId);
    if (!rack) return;

    const item = rack.itemMapping[binKey];
    const isOccupied = rack.occupiedBins.includes(binKey);

    const detailContainer = document.getElementById('warehouse-bin-details');
    if (detailContainer) {
      detailContainer.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--accent-primary);">
              <i class="fa-solid fa-location-dot"></i> Location Details: ${rack.name} - Slot ${binKey.toUpperCase()}
            </h4>
            <button class="btn btn-primary btn-sm" onclick="warehouse.openStockModal('${rackId}', '${binKey}')">
              <i class="fa-solid fa-pen-to-square"></i> ${isOccupied ? 'Update Stock' : 'Stock Inventory'}
            </button>
          </div>
          ${isOccupied && item ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; font-size: 0.88rem; color: var(--text-secondary);">
              <div><strong>SKU:</strong> ${item.sku}</div>
              <div><strong>Item Name:</strong> ${item.name}</div>
              <div><strong>Quantity:</strong> ${item.qty} units</div>
              <div><strong>Status:</strong> <span class="tag-pill">Stocked</span></div>
            </div>
          ` : `
            <p style="font-size: 0.88rem; color: var(--text-muted);">This bin slot is currently empty and available for incoming storage inventory allocation.</p>
          `}
        </div>
      `;
    }
  }

  openStockModal(rackId, binKey) {
    const rack = state.data.warehouseRacks.find(r => r.id === rackId);
    if (!rack) return;

    const item = rack.itemMapping ? rack.itemMapping[binKey] : null;

    document.getElementById('input-bin-rack-id').value = rackId;
    document.getElementById('input-bin-key').value = binKey;
    document.getElementById('modal-stock-title').textContent = `Stock Bin Slot ${binKey.toUpperCase()} (${rack.name})`;

    document.getElementById('input-bin-sku').value = item ? item.sku : '';
    document.getElementById('input-bin-name').value = item ? item.name : '';
    document.getElementById('input-bin-qty').value = item ? item.qty : '';

    app.showModal('modal-stock-bin');
  }
}

const warehouse = new WarehouseController();
