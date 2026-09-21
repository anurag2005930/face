/* ==========================================================================
   Payment Directory Management System - Controller & UI Engine
   ========================================================================== */

class PaymentDirectoryController {
  constructor() {
    this.currentSubTab = 'catalog'; // 'catalog', 'gateways', 'scheduled', 'ledger', 'analytics'
    this.viewMode = 'grid'; // 'grid' or 'table'
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.statusFilter = 'all';

    // Chart instances
    this.outflowChart = null;
    this.gatewayChart = null;
    this.trendChart = null;
  }

  init() {
    this.bindSubTabNavigation();
    this.bindFiltersAndControls();
    this.bindModalForms();
    this.bindExportButtons();

    this.render();
    console.log('Payment Directory Management System initialized.');
  }

  bindSubTabNavigation() {
    const subTabButtons = document.querySelectorAll('.payment-subtab-btn');
    subTabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-subtab');
        if (tab) {
          this.switchSubTab(tab);
        }
      });
    });
  }

  switchSubTab(tabName) {
    this.currentSubTab = tabName;

    // Update active subtab button
    document.querySelectorAll('.payment-subtab-btn').forEach(btn => {
      if (btn.getAttribute('data-subtab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update active subtab container
    document.querySelectorAll('.payment-subtab-content').forEach(container => {
      container.classList.remove('active');
    });

    const targetContainer = document.getElementById(`payment-tab-${tabName}`);
    if (targetContainer) {
      targetContainer.classList.add('active');
    }

    if (tabName === 'analytics') {
      setTimeout(() => this.renderAnalyticsCharts(), 100);
    }
  }

  bindFiltersAndControls() {
    const searchInput = document.getElementById('payment-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderCatalog();
      });
    }

    const catSelect = document.getElementById('payment-category-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.renderCatalog();
      });
    }

    const statusSelect = document.getElementById('payment-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.renderCatalog();
      });
    }

    // Grid / Table View Switcher
    const gridBtn = document.getElementById('btn-view-grid');
    const tableBtn = document.getElementById('btn-view-table');

    if (gridBtn && tableBtn) {
      gridBtn.addEventListener('click', () => {
        this.viewMode = 'grid';
        gridBtn.classList.add('active');
        tableBtn.classList.remove('active');
        this.renderCatalog();
      });

      tableBtn.addEventListener('click', () => {
        this.viewMode = 'table';
        tableBtn.classList.add('active');
        gridBtn.classList.remove('active');
        this.renderCatalog();
      });
    }
  }

  bindModalForms() {
    // Add Payee Form
    const addPayeeForm = document.getElementById('form-add-payee');
    if (addPayeeForm) {
      addPayeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payeeData = {
          name: document.getElementById('payee-input-name').value.trim(),
          company: document.getElementById('payee-input-company').value.trim() || 'Independent',
          email: document.getElementById('payee-input-email').value.trim(),
          phone: document.getElementById('payee-input-phone').value.trim(),
          category: document.getElementById('payee-select-category').value,
          status: document.getElementById('payee-select-status').value,
          preferredMethod: document.getElementById('payee-input-method').value.trim(),
          currency: document.getElementById('payee-select-currency').value,
          accountDetails: {
            accountName: document.getElementById('payee-input-acc-name').value.trim(),
            accountNumber: document.getElementById('payee-input-acc-num').value.trim(),
            routingNumber: document.getElementById('payee-input-routing').value.trim(),
            bankName: document.getElementById('payee-input-bank').value.trim(),
            swift: document.getElementById('payee-input-swift').value.trim(),
            iban: document.getElementById('payee-input-iban').value.trim(),
            upiId: document.getElementById('payee-input-upi').value.trim(),
            taxId: document.getElementById('payee-input-taxid').value.trim()
          },
          payoutLimit: parseFloat(document.getElementById('payee-input-limit').value) || 50000,
          riskLevel: document.getElementById('payee-select-risk').value,
          avatar: document.getElementById('payee-input-avatar').value.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          notes: document.getElementById('payee-input-notes').value.trim()
        };

        state.addPayee(payeeData);
        app.closeModal('modal-add-payee');
        addPayeeForm.reset();
        this.render();
      });
    }

    // Send Payment Form
    const sendPaymentForm = document.getElementById('form-send-payment');
    if (sendPaymentForm) {
      sendPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payeeId = document.getElementById('payout-input-payee-id').value;
        const payee = state.data.paymentDirectory.find(p => p.id === payeeId);
        
        if (!payee) return;

        const amount = parseFloat(document.getElementById('payout-input-amount').value);
        const currency = document.getElementById('payout-select-currency').value;
        const gatewayId = document.getElementById('payout-select-gateway').value;
        const gateway = state.data.paymentGateways.find(g => g.id === gatewayId);
        const notes = document.getElementById('payout-input-notes').value.trim();

        if (!amount || amount <= 0) {
          alert('Please enter a valid disbursement amount.');
          return;
        }

        const txObj = {
          payeeId: payee.id,
          payeeName: payee.name,
          amount: amount,
          currency: currency,
          gatewayId: gatewayId,
          method: gateway ? gateway.name : payee.preferredMethod,
          category: payee.category,
          status: 'Completed',
          notes: notes || `Disbursement to ${payee.name}`
        };

        state.recordPayoutTransaction(txObj);
        app.closeModal('modal-send-payment');
        sendPaymentForm.reset();
        this.render();
      });
    }
  }

  bindExportButtons() {
    const exportBtn = document.getElementById('btn-export-payment-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportDirectoryCSV();
      });
    }
  }

  render() {
    this.renderMetricsHeader();
    this.renderCatalog();
    this.renderGateways();
    this.renderScheduledPayouts();
    this.renderLedger();
  }

  renderMetricsHeader() {
    const metrics = state.getPaymentMetrics();

    const elTotalPayees = document.getElementById('metric-total-payees');
    const elActivePayees = document.getElementById('metric-active-payees');
    const elOutflow = document.getElementById('metric-total-outflow');
    const elPending = document.getElementById('metric-pending-payouts');
    const elGatewayBal = document.getElementById('metric-gateway-balance');

    if (elTotalPayees) elTotalPayees.textContent = metrics.totalPayees;
    if (elActivePayees) elActivePayees.textContent = `${metrics.activePayees} Verified`;
    if (elOutflow) elOutflow.textContent = `₹${(metrics.totalOutflowINR || 0).toLocaleString('en-IN')}`;
    if (elPending) elPending.textContent = metrics.pendingTransactions;
    if (elGatewayBal) elGatewayBal.textContent = `₹${(metrics.totalGatewayBalanceINR || 0).toLocaleString('en-IN')}`;
  }

  renderCatalog() {
    const catalogContainer = document.getElementById('payment-catalog-container');
    if (!catalogContainer) return;

    const payees = state.getPaymentDirectory(this.searchQuery, this.categoryFilter, this.statusFilter);

    if (payees.length === 0) {
      catalogContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-address-book" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3>No Payees Found</h3>
          <p>No payment recipients match your search or filter criteria.</p>
          <button class="btn btn-primary" onclick="app.openModal('modal-add-payee')" style="margin-top: 1rem;">
            <i class="fa-solid fa-plus"></i> Add First Payee
          </button>
        </div>
      `;
      return;
    }

    if (this.viewMode === 'grid') {
      catalogContainer.className = 'payment-grid';
      catalogContainer.innerHTML = payees.map(p => this.createPayeeCardHTML(p)).join('');
    } else {
      catalogContainer.className = 'payment-table-wrapper';
      catalogContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Beneficiary / Entity</th>
              <th>Category</th>
              <th>Status</th>
              <th>Preferred Method</th>
              <th>Default Currency</th>
              <th>Total Disbursed</th>
              <th>Last Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${payees.map(p => this.createPayeeTableRowHTML(p)).join('')}
          </tbody>
        </table>
      `;
    }
  }

  createPayeeCardHTML(p) {
    const categoryBadgeClass = this.getCategoryBadgeClass(p.category);
    const statusBadgeClass = this.getStatusBadgeClass(p.status);
    const formattedAmount = `${this.getCurrencySymbol(p.currency)}${(p.totalDisbursed || 0).toLocaleString()}`;

    return `
      <div class="payee-card" data-payee-id="${p.id}">
        <div class="payee-card-header">
          <div class="payee-avatar-wrapper">
            <img src="${p.avatar}" alt="${p.name}" class="payee-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'" />
            <span class="status-dot ${p.status.toLowerCase()}"></span>
          </div>
          <div class="payee-main-info">
            <div class="payee-name" onclick="paymentDirectory.openPayeeDetailsModal('${p.id}')">${p.name}</div>
            <div class="payee-company">${p.company}</div>
          </div>
          <div class="payee-actions-dropdown">
            <button class="btn-icon" onclick="paymentDirectory.openPayeeDetailsModal('${p.id}')" title="View Full Ledger">
              <i class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <div class="payee-card-badges">
          <span class="badge ${categoryBadgeClass}"><i class="${this.getCategoryIcon(p.category)}"></i> ${p.category}</span>
          <span class="badge ${statusBadgeClass}">${p.status}</span>
          <span class="badge badge-outline"><i class="fa-solid fa-shield"></i> Risk: ${p.riskLevel || 'Low'}</span>
        </div>

        <div class="payee-card-details">
          <div class="payee-detail-row">
            <span class="detail-label"><i class="fa-solid fa-money-bill-transfer"></i> Method:</span>
            <span class="detail-value">${p.preferredMethod}</span>
          </div>
          <div class="payee-detail-row">
            <span class="detail-label"><i class="fa-solid fa-building"></i> Account/IBAN:</span>
            <span class="detail-value code-font">${p.accountDetails ? (p.accountDetails.iban || p.accountDetails.accountNumber || p.accountDetails.upiId || 'N/A') : 'N/A'}</span>
          </div>
          <div class="payee-detail-row">
            <span class="detail-label"><i class="fa-solid fa-vault"></i> Total Disbursed:</span>
            <span class="detail-value highlight">${formattedAmount}</span>
          </div>
        </div>

        <div class="payee-card-footer">
          <button class="btn btn-primary btn-sm btn-full" onclick="paymentDirectory.openSendPaymentModal('${p.id}')">
            <i class="fa-solid fa-paper-plane"></i> Send Payout
          </button>
          <button class="btn btn-secondary btn-sm" onclick="paymentDirectory.togglePayeeStatus('${p.id}')" title="Toggle Active / Suspended">
            <i class="fa-solid ${p.status === 'Active' ? 'fa-ban' : 'fa-check'}"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="paymentDirectory.deletePayee('${p.id}')" title="Delete Payee">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }

  createPayeeTableRowHTML(p) {
    const categoryBadgeClass = this.getCategoryBadgeClass(p.category);
    const statusBadgeClass = this.getStatusBadgeClass(p.status);
    const formattedAmount = `${this.getCurrencySymbol(p.currency)}${(p.totalDisbursed || 0).toLocaleString()}`;

    return `
      <tr>
        <td>
          <div class="table-user-cell" onclick="paymentDirectory.openPayeeDetailsModal('${p.id}')">
            <img src="${p.avatar}" class="table-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'" />
            <div>
              <div class="table-title">${p.name}</div>
              <div class="table-subtitle">${p.company} &bull; ${p.email}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${categoryBadgeClass}"><i class="${this.getCategoryIcon(p.category)}"></i> ${p.category}</span></td>
        <td><span class="badge ${statusBadgeClass}">${p.status}</span></td>
        <td>${p.preferredMethod}</td>
        <td><strong>${p.currency}</strong></td>
        <td class="highlight">${formattedAmount}</td>
        <td>${p.lastPaymentDate || 'Never'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-primary btn-sm" onclick="paymentDirectory.openSendPaymentModal('${p.id}')">
              <i class="fa-solid fa-paper-plane"></i> Pay
            </button>
            <button class="btn btn-secondary btn-sm" onclick="paymentDirectory.openPayeeDetailsModal('${p.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="paymentDirectory.togglePayeeStatus('${p.id}')">
              <i class="fa-solid ${p.status === 'Active' ? 'fa-ban' : 'fa-check'}"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  renderGateways() {
    const gatewayContainer = document.getElementById('payment-gateways-container');
    if (!gatewayContainer) return;

    const gateways = state.data.paymentGateways || [];

    gatewayContainer.innerHTML = gateways.map(g => `
      <div class="gateway-card">
        <div class="gateway-header">
          <div class="gateway-icon"><i class="${g.icon || 'fa-solid fa-wallet'}"></i></div>
          <div>
            <div class="gateway-title">${g.name}</div>
            <div class="gateway-type">${g.type} &bull; ${g.currency}</div>
          </div>
          <span class="badge badge-success">Online</span>
        </div>

        <div class="gateway-balance-box">
          <div class="balance-label">Available Disbursement Balance</div>
          <div class="balance-amount">${this.getCurrencySymbol(g.currency)}${g.balance.toLocaleString()}</div>
        </div>

        <div class="gateway-meta-grid">
          <div>
            <span class="meta-label">Tx Fee Rate:</span>
            <span class="meta-value">${g.feePercent}%</span>
          </div>
          <div>
            <span class="meta-label">Daily Outflow Limit:</span>
            <span class="meta-value">${this.getCurrencySymbol(g.currency)}${g.dailyLimit.toLocaleString()}</span>
          </div>
        </div>

        <div class="gateway-footer">
          <button class="btn btn-secondary btn-sm btn-full" onclick="alert('Gateway settings updated.')">
            <i class="fa-solid fa-sliders"></i> Configure Routing Rules
          </button>
        </div>
      </div>
    `).join('');
  }

  renderScheduledPayouts() {
    const scheduledContainer = document.getElementById('payment-scheduled-container');
    if (!scheduledContainer) return;

    const scheduled = state.data.scheduledPayouts || [];

    if (scheduled.length === 0) {
      scheduledContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-calendar-check" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3>No Scheduled Payouts</h3>
          <p>You have no automated recurring payouts configured.</p>
        </div>
      `;
      return;
    }

    scheduledContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Beneficiary</th>
            <th>Recurring Amount</th>
            <th>Frequency</th>
            <th>Next Run Date</th>
            <th>Payment Gateway</th>
            <th>Auto-Approve</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${scheduled.map(s => `
            <tr>
              <td><strong>${s.payeeName}</strong></td>
              <td class="highlight">${this.getCurrencySymbol(s.currency)}${s.amount.toLocaleString()} ${s.currency}</td>
              <td><span class="badge badge-info"><i class="fa-solid fa-clock-rotate-left"></i> ${s.frequency}</span></td>
              <td>${s.nextRun}</td>
              <td>${s.gateway || 'Default Gateway'}</td>
              <td>
                <span class="badge ${s.autoApprove ? 'badge-success' : 'badge-warning'}">
                  ${s.autoApprove ? 'Enabled' : 'Manual Review'}
                </span>
              </td>
              <td><span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}">${s.status}</span></td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-primary btn-sm" onclick="paymentDirectory.triggerScheduledPayoutNow('${s.id}')">
                    <i class="fa-solid fa-bolt"></i> Execute Now
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="paymentDirectory.toggleScheduledPayout('${s.id}')">
                    <i class="fa-solid ${s.status === 'Active' ? 'fa-pause' : 'fa-play'}"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderLedger() {
    const ledgerContainer = document.getElementById('payment-ledger-container');
    if (!ledgerContainer) return;

    const txs = state.data.paymentTransactions || [];

    if (txs.length === 0) {
      ledgerContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-file-invoice-dollar" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3>No Transactions Recorded</h3>
          <p>No payout history available in the ledger.</p>
        </div>
      `;
      return;
    }

    ledgerContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Tx Ref & Date</th>
            <th>Beneficiary</th>
            <th>Category</th>
            <th>Disbursement Amount</th>
            <th>Payment Method</th>
            <th>Status</th>
            <th>Notes / Invoice</th>
          </tr>
        </thead>
        <tbody>
          ${txs.map(t => `
            <tr>
              <td>
                <div class="table-title code-font">${t.txHash}</div>
                <div class="table-subtitle">${t.date}</div>
              </td>
              <td><strong>${t.payeeName}</strong></td>
              <td><span class="badge ${this.getCategoryBadgeClass(t.category)}">${t.category}</span></td>
              <td class="highlight">${this.getCurrencySymbol(t.currency)}${t.amount.toLocaleString()} ${t.currency}</td>
              <td>${t.method}</td>
              <td><span class="badge ${this.getStatusBadgeClass(t.status)}">${t.status}</span></td>
              <td><span class="text-muted">${t.notes || '-'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderAnalyticsCharts() {
    const ctxOutflow = document.getElementById('chart-payment-outflow');
    const ctxGateway = document.getElementById('chart-payment-gateways');
    const ctxTrend = document.getElementById('chart-payment-trends');

    if (!ctxOutflow || !ctxGateway || !ctxTrend) return;

    // Outflow by Category Doughnut
    if (this.outflowChart) this.outflowChart.destroy();
    this.outflowChart = new Chart(ctxOutflow, {
      type: 'doughnut',
      data: {
        labels: ['Vendor', 'Payroll', 'Contractor', 'Subscription', 'Utility', 'Tax', 'Merchant'],
        datasets: [{
          data: [3275000, 284000, 782000, 1120000, 320000, 2100000, 1450000],
          backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#3b82f6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });

    // Gateway Balance Distribution Pie
    if (this.gatewayChart) this.gatewayChart.destroy();
    this.gatewayChart = new Chart(ctxGateway, {
      type: 'pie',
      data: {
        labels: ['HDFC Bank Wire', 'ICICI Treasury', 'Razorpay Gateway', 'UPI FastPay', 'Crypto Vault'],
        datasets: [{
          data: [4852000, 2400000, 1824000, 4200000, 1450000],
          backgroundColor: ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#06b6d4'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });

    // Monthly Trend Bar Chart
    if (this.trendChart) this.trendChart.destroy();
    this.trendChart = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep (MTD)'],
        datasets: [{
          label: 'Disbursement Outflow (₹ INR)',
          data: [1200000, 1450000, 1800000, 2100000, 2450000, 2900000],
          backgroundColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#9ca3af', font: { family: 'Inter' } } }
        },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
          y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  openSendPaymentModal(payeeId) {
    const payee = state.data.paymentDirectory.find(p => p.id === payeeId);
    if (!payee) return;

    document.getElementById('payout-input-payee-id').value = payee.id;
    document.getElementById('payout-payee-name-display').textContent = payee.name;
    document.getElementById('payout-payee-method-display').textContent = payee.preferredMethod;
    document.getElementById('payout-select-currency').value = payee.currency;

    // Populate gateway dropdown
    const gatewaySelect = document.getElementById('payout-select-gateway');
    if (gatewaySelect) {
      const gateways = state.data.paymentGateways || [];
      gatewaySelect.innerHTML = gateways.map(g => `
        <option value="${g.id}">${g.name} (${g.currency} Balance: ${this.getCurrencySymbol(g.currency)}${g.balance.toLocaleString()})</option>
      `).join('');
    }

    app.openModal('modal-send-payment');
  }

  openPayeeDetailsModal(payeeId) {
    const payee = state.data.paymentDirectory.find(p => p.id === payeeId);
    if (!payee) return;

    const modalBody = document.getElementById('payee-details-modal-body');
    if (!modalBody) return;

    const acc = payee.accountDetails || {};
    const payeeTxs = (state.data.paymentTransactions || []).filter(t => t.payeeId === payee.id);

    modalBody.innerHTML = `
      <div class="payee-profile-header">
        <img src="${payee.avatar}" class="profile-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'" />
        <div>
          <h2>${payee.name}</h2>
          <div class="text-muted">${payee.company} &bull; ${payee.email} &bull; ${payee.phone}</div>
          <div style="margin-top: 0.5rem;">
            <span class="badge ${this.getCategoryBadgeClass(payee.category)}">${payee.category}</span>
            <span class="badge ${this.getStatusBadgeClass(payee.status)}">${payee.status}</span>
            <span class="badge badge-outline">Tax ID: ${acc.taxId || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="modal-grid-2col" style="margin-top: 1.5rem;">
        <div class="profile-box">
          <h4><i class="fa-solid fa-building-columns"></i> Banking & Payment Routing</h4>
          <ul class="profile-info-list">
            <li><span>Bank Name:</span> <strong>${acc.bankName || 'N/A'}</strong></li>
            <li><span>Account Number:</span> <strong class="code-font">${acc.accountNumber || 'N/A'}</strong></li>
            <li><span>IBAN:</span> <strong class="code-font">${acc.iban || 'N/A'}</strong></li>
            <li><span>SWIFT / BIC:</span> <strong class="code-font">${acc.swift || 'N/A'}</strong></li>
            <li><span>Routing / IFSC:</span> <strong class="code-font">${acc.routingNumber || 'N/A'}</strong></li>
            <li><span>UPI ID:</span> <strong class="code-font">${acc.upiId || 'N/A'}</strong></li>
          </ul>
        </div>

        <div class="profile-box text-center">
          <h4><i class="fa-solid fa-qrcode"></i> Instant Pay QR Code</h4>
          <div class="qr-code-placeholder" style="margin: 1rem auto; padding: 1rem; background: #fff; border-radius: 12px; display: inline-block;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent('upi://pay?pa=' + (acc.upiId || 'payee@bank') + '&pn=' + payee.name)}" alt="Payment QR Code" />
          </div>
          <div class="text-muted" style="font-size: 0.85rem;">Scan with any banking / UPI app to trigger payout</div>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h4><i class="fa-solid fa-clock-rotate-left"></i> Disbursement Ledger History</h4>
        ${payeeTxs.length === 0 ? '<p class="text-muted">No disbursement transactions recorded yet.</p>' : `
          <table class="data-table" style="margin-top: 0.75rem;">
            <thead>
              <tr>
                <th>Date & Tx Ref</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${payeeTxs.map(t => `
                <tr>
                  <td>${t.date} <br><span class="code-font text-muted">${t.txHash}</span></td>
                  <td class="highlight">${this.getCurrencySymbol(t.currency)}${t.amount.toLocaleString()}</td>
                  <td>${t.method}</td>
                  <td><span class="badge ${this.getStatusBadgeClass(t.status)}">${t.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    app.openModal('modal-payee-details');
  }

  togglePayeeStatus(payeeId) {
    state.togglePayeeStatus(payeeId);
    this.render();
  }

  deletePayee(payeeId) {
    if (confirm('Are you sure you want to delete this payee from the Payment Directory?')) {
      state.deletePayee(payeeId);
      this.render();
    }
  }

  toggleScheduledPayout(payoutId) {
    state.toggleScheduledPayout(payoutId);
    this.renderScheduledPayouts();
  }

  triggerScheduledPayoutNow(payoutId) {
    const sp = state.data.scheduledPayouts.find(s => s.id === payoutId);
    if (!sp) return;

    state.recordPayoutTransaction({
      payeeId: sp.payeeId,
      payeeName: sp.payeeName,
      amount: sp.amount,
      currency: sp.currency,
      method: sp.gateway || 'Scheduled Auto-Payout',
      category: 'Scheduled',
      status: 'Completed',
      notes: `Manual trigger of scheduled ${sp.frequency} payout`
    });

    alert(`Successfully executed payout of ${sp.currency} ${sp.amount} to ${sp.payeeName}.`);
    this.render();
  }

  exportDirectoryCSV() {
    const payees = state.data.paymentDirectory || [];
    if (payees.length === 0) return;

    let csvContent = 'ID,Name,Company,Email,Phone,Category,Status,Currency,TotalDisbursed,TaxID,IBAN\n';
    payees.forEach(p => {
      const acc = p.accountDetails || {};
      csvContent += `"${p.id}","${p.name}","${p.company}","${p.email}","${p.phone}","${p.category}","${p.status}","${p.currency}",${p.totalDisbursed || 0},"${acc.taxId || ''}","${acc.iban || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_directory_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Helper Utilities
  getCategoryBadgeClass(category) {
    switch (category) {
      case 'Vendor': return 'badge-indigo';
      case 'Payroll': return 'badge-success';
      case 'Contractor': return 'badge-warning';
      case 'Subscription': return 'badge-cyan';
      case 'Utility': return 'badge-rose';
      case 'Tax': return 'badge-purple';
      default: return 'badge-info';
    }
  }

  getCategoryIcon(category) {
    switch (category) {
      case 'Vendor': return 'fa-solid fa-store';
      case 'Payroll': return 'fa-solid fa-user-tie';
      case 'Contractor': return 'fa-solid fa-briefcase';
      case 'Subscription': return 'fa-solid fa-repeat';
      case 'Utility': return 'fa-solid fa-bolt';
      case 'Tax': return 'fa-solid fa-building-columns';
      default: return 'fa-solid fa-tag';
    }
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'Active':
      case 'Verified':
      case 'Completed': return 'badge-success';
      case 'Pending':
      case 'Pending Approval':
      case 'Processing': return 'badge-warning';
      case 'Suspended':
      case 'Failed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getCurrencySymbol(currency) {
    switch (currency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'INR':
      default: return '₹';
    }
  }
}

const paymentDirectory = new PaymentDirectoryController();
