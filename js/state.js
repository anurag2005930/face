/* ==========================================================================
   Storage Management System - Central State & Data Persistence
   ========================================================================== */

const STORAGE_KEY = 'storage_mgmt_system_v1';

// Initial Demo Seed Data
const DEFAULT_STATE = {
  theme: 'dark',
  currentFolderId: 'root',
  storageLimitBytes: 2000000000000, // 2 TB in bytes

  folders: [
    { id: 'root', name: 'Root', parentId: null, createdAt: '2026-08-01' },
    { id: 'docs', name: 'Documents', parentId: 'root', createdAt: '2026-08-02' },
    { id: 'media', name: 'Media Assets', parentId: 'root', createdAt: '2026-08-03' },
    { id: 'projects', name: 'Software Projects', parentId: 'root', createdAt: '2026-08-04' },
    { id: 'backups', name: 'System Backups', parentId: 'root', createdAt: '2026-08-05' },
    { id: 'photos', name: 'Photos 2026', parentId: 'media', createdAt: '2026-08-06' }
  ],

  files: [
    {
      id: 'f1',
      name: 'Q3_Financial_Report.pdf',
      folderId: 'docs',
      type: 'document',
      sizeBytes: 4250000, // 4.25 MB
      updatedAt: '2026-08-09',
      starred: true,
      trashed: false,
      tag: 'Finance',
      content: 'CONFIDENTIAL: Q3 Financial Overview showing 34% growth in cloud storage services.'
    },
    {
      id: 'f2',
      name: 'Architecture_Diagram.png',
      folderId: 'projects',
      type: 'image',
      sizeBytes: 8500000, // 8.5 MB
      updatedAt: '2026-08-08',
      starred: false,
      trashed: false,
      tag: 'DevOps',
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'f3',
      name: 'Datacenter_Cluster_Demo.mp4',
      folderId: 'media',
      type: 'video',
      sizeBytes: 450000000, // 450 MB
      updatedAt: '2026-08-07',
      starred: true,
      trashed: false,
      tag: 'Demo',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    },
    {
      id: 'f4',
      name: 'kubernetes-cluster-config.yaml',
      folderId: 'projects',
      type: 'code',
      sizeBytes: 12400, // 12.4 KB
      updatedAt: '2026-08-10',
      starred: false,
      trashed: false,
      tag: 'Kubernetes',
      content: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: storage-node-cluster\nspec:\n  replicas: 5\n  selector:\n    matchLabels:\n      app: storage-node`
    },
    {
      id: 'f5',
      name: 'Full_Database_Dump_v4.2.tar.gz',
      folderId: 'backups',
      type: 'archive',
      sizeBytes: 12500000000, // 12.5 GB
      updatedAt: '2026-08-05',
      starred: false,
      trashed: false,
      tag: 'Backup',
      content: 'Compressed PostgreSQL Database Backup (Contains 4.8 million rows).'
    },
    {
      id: 'f6',
      name: 'Old_Server_Logs.log',
      folderId: 'root',
      type: 'document',
      sizeBytes: 250000,
      updatedAt: '2026-08-01',
      starred: false,
      trashed: true,
      tag: 'Log',
      content: '2026-08-01 10:00:00 [INFO] Storage node initialized.'
    }
  ],

  // Server & Volume Storage Pools
  serverNodes: [
    {
      id: 'node-nvme-01',
      name: 'US-East Fast NVMe Pool',
      type: 'NVMe RAID 10',
      totalCapacityBytes: 10000000000000, // 10 TB
      usedBytes: 4200000000000, // 4.2 TB
      status: 'online',
      readIops: 124000,
      writeIops: 98000,
      temperature: '38°C',
      healthPercent: 99
    },
    {
      id: 'node-hdd-02',
      name: 'EU-Central Cold Storage',
      type: 'HDD RAID 6',
      totalCapacityBytes: 50000000000000, // 50 TB
      usedBytes: 38500000000000, // 38.5 TB
      status: 'online',
      readIops: 4200,
      writeIops: 2800,
      temperature: '42°C',
      healthPercent: 94
    },
    {
      id: 'node-san-03',
      name: 'APAC Enterprise SAN Pool',
      type: 'Fiber Channel SAN',
      totalCapacityBytes: 25000000000000, // 25 TB
      usedBytes: 21800000000000, // 21.8 TB
      status: 'warning',
      readIops: 45000,
      writeIops: 32000,
      temperature: '49°C',
      healthPercent: 82
    }
  ],

  // Physical Warehouse Storage Racks
  warehouseRacks: [
    {
      id: 'rack-a1',
      zone: 'Zone A - High Density',
      name: 'Rack A-101',
      capacityShelves: 4,
      binsPerShelf: 4,
      occupiedBins: ['s1-b1', 's1-b2', 's2-b4', 's3-b1', 's3-b2', 's4-b3'],
      itemMapping: {
        's1-b1': { sku: 'SKU-NVME-2TB', name: 'Samsung Enterprise 2TB NVMe SSD', qty: 24 },
        's2-b4': { sku: 'SKU-SFP-10G', name: '10GbE SFP+ Transceivers', qty: 50 }
      }
    },
    {
      id: 'rack-b2',
      zone: 'Zone B - Blade Servers',
      name: 'Rack B-204',
      capacityShelves: 4,
      binsPerShelf: 4,
      occupiedBins: ['s1-b3', 's2-b1', 's2-b2', 's2-b3', 's3-b3', 's4-b1', 's4-b2', 's4-b4'],
      itemMapping: {
        's1-b3': { sku: 'SKU-RAM-64GB', name: 'ECC DDR5 64GB Server RAM', qty: 32 }
      }
    },
    {
      id: 'rack-c3',
      zone: 'Zone C - Tape & Archive',
      name: 'Rack C-309',
      capacityShelves: 4,
      binsPerShelf: 4,
      occupiedBins: ['s1-b1', 's1-b4', 's3-b2'],
      itemMapping: {
        's1-b1': { sku: 'SKU-LTO8-TAPE', name: 'LTO-8 12TB Tape Cartridges', qty: 100 }
      }
    }
  ],

  // Activity Audit Log
  activities: [
    { id: 'act-1', timestamp: '2026-08-10 14:32', type: 'upload', user: 'Admin User', desc: 'Uploaded kubernetes-cluster-config.yaml to Projects' },
    { id: 'act-2', timestamp: '2026-08-10 12:15', type: 'volume', user: 'System', desc: 'Auto-scrub completed on US-East Fast NVMe Pool (0 errors)' },
    { id: 'act-3', timestamp: '2026-08-09 18:45', type: 'security', user: 'Admin User', desc: 'Generated shared read-only link for Q3_Financial_Report.pdf' },
    { id: 'act-4', timestamp: '2026-08-10 09:20', type: 'warehouse', user: 'Warehouse Mgr', desc: 'Restocked 24x Samsung Enterprise 2TB NVMe SSD in Rack A-101 Bin S1-B1' }
  ],

  // Internet Speed Test Logs
  speedTestLogs: [
    {
      id: 'st_1',
      timestamp: '2026-08-18 16:45',
      server: 'Cloudflare Edge (Auto)',
      pingMs: 14,
      jitterMs: 2,
      downloadMbps: 485.6,
      uploadMbps: 142.3,
      grade: 'A+',
      isp: 'Cloudflare High Speed Fiber'
    },
    {
      id: 'st_2',
      timestamp: '2026-08-17 11:20',
      server: 'US-East Fast NVMe SAN',
      pingMs: 28,
      jitterMs: 5,
      downloadMbps: 320.4,
      uploadMbps: 98.5,
      grade: 'A',
      isp: 'Datacenter Direct Connect'
    }
  ],

  // Payment Directory Management Data
  paymentDirectory: [
    {
      id: 'pay_1',
      name: 'Acme Cloud Infrastructure Corp',
      company: 'Acme Cloud Inc.',
      email: 'finance@acmecloud.com',
      phone: '+91 98200 12345',
      category: 'Vendor', // Vendor, Payroll, Contractor, Subscription, Utility, Tax, Merchant
      status: 'Active', // Active, Verified, Pending, Suspended
      preferredMethod: 'Bank Transfer (NEFT/RTGS)',
      currency: 'INR',
      accountDetails: {
        accountName: 'Acme Cloud Infrastructure Corp',
        accountNumber: '987654321044',
        routingNumber: 'HDFC0000240',
        bankName: 'HDFC Bank Mumbai',
        swift: 'HDFCINBBXXX',
        iban: 'IN98HDFC0000240987654321',
        upiId: 'acmecloud@icici',
        taxId: '27AAACA9876B1Z2'
      },
      payoutLimit: 2500000,
      riskLevel: 'Low',
      totalDisbursed: 1425000,
      lastPaymentDate: '2026-09-02',
      avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&q=80',
      notes: 'Primary datacenter bandwidth and bare-metal server vendor.'
    },
    {
      id: 'pay_2',
      name: 'Sarah Connor',
      company: 'StorageVault Engineering',
      email: 'sarah.c@storagevault.io',
      phone: '+91 98765 43210',
      category: 'Payroll',
      status: 'Active',
      preferredMethod: 'IMPS Direct Transfer',
      currency: 'INR',
      accountDetails: {
        accountName: 'Sarah Connor',
        accountNumber: '445566778899',
        routingNumber: 'ICIC0001204',
        bankName: 'ICICI Bank Bangalore',
        swift: 'ICICINBBXXX',
        iban: 'IN44ICIC0001204445566778',
        upiId: 'sarah@okaxis',
        taxId: 'PAN-ABCPS4412F'
      },
      payoutLimit: 150000,
      riskLevel: 'Low',
      totalDisbursed: 284000,
      lastPaymentDate: '2026-08-31',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      notes: 'Lead DevOps Architect - Full-time Payroll Employee.'
    },
    {
      id: 'pay_3',
      name: 'DevTech Global Solutions',
      company: 'DevTech Solutions Ltd.',
      email: 'payouts@devtechglobal.in',
      phone: '+91 22 7946 0912',
      category: 'Contractor',
      status: 'Active',
      preferredMethod: 'UPI / NEFT Instant',
      currency: 'INR',
      accountDetails: {
        accountName: 'DevTech Global Solutions Ltd',
        accountNumber: '900281740921',
        routingNumber: 'SBIN0004502',
        bankName: 'State Bank of India',
        swift: 'SBININBBXXX',
        iban: 'IN89SBIN0004502900281740',
        upiId: 'devtech@icici',
        taxId: '27AABCD3094E1Z9'
      },
      payoutLimit: 500000,
      riskLevel: 'Low',
      totalDisbursed: 642000,
      lastPaymentDate: '2026-09-01',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80',
      notes: 'External security testing and code audit contractors.'
    },
    {
      id: 'pay_4',
      name: 'Razorpay / Stripe Gateway',
      company: 'Razorpay Software Pvt Ltd',
      email: 'disbursements@razorpay.com',
      phone: '+91 80 6789 1234',
      category: 'Merchant',
      status: 'Verified',
      preferredMethod: 'Razorpay Direct Route',
      currency: 'INR',
      accountDetails: {
        accountName: 'Razorpay Merchant Payouts',
        accountNumber: 'STR-8839201900',
        routingNumber: 'UTIB0000840',
        bankName: 'Axis Bank',
        swift: 'AXISINBBXXX',
        iban: 'IN88AXIS000084088392019',
        upiId: 'razorpay@payout',
        taxId: '29AAACR3829F1Z4'
      },
      payoutLimit: 1000000,
      riskLevel: 'Low',
      totalDisbursed: 891000,
      lastPaymentDate: '2026-08-25',
      avatar: 'https://images.unsplash.com/photo-1556742049-0a67daf64f42?auto=format&fit=crop&w=150&q=80',
      notes: 'Customer card processing and payout gateway fee account.'
    },
    {
      id: 'pay_5',
      name: 'Tokyo Data Center K.K.',
      company: 'Tokyo DC Japan Inc.',
      email: 'billing@tokyodc.jp',
      phone: '+81 3 5555 0143',
      category: 'Vendor',
      status: 'Active',
      preferredMethod: 'SWIFT Wire Transfer',
      currency: 'INR',
      accountDetails: {
        accountName: 'Tokyo Data Center K.K.',
        accountNumber: 'JP-9948201',
        routingNumber: 'BOTK0005',
        bankName: 'MUFG Bank Tokyo',
        swift: 'BOTKJPJTXXX',
        iban: 'JP99BOTK00059948201',
        upiId: 'tokyodc@mufg',
        taxId: 'JP-401000109281'
      },
      payoutLimit: 5000000,
      riskLevel: 'Medium',
      totalDisbursed: 1850000,
      lastPaymentDate: '2026-08-20',
      avatar: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=150&q=80',
      notes: 'Asia-Pacific regional storage server housing node.'
    },
    {
      id: 'pay_6',
      name: 'AWS Web Hosting Services',
      company: 'Amazon Web Services India',
      email: 'billing-aws@amazon.in',
      phone: '+91 1800 280 4331',
      category: 'Subscription',
      status: 'Active',
      preferredMethod: 'Corporate Card / Auto-Debit',
      currency: 'INR',
      accountDetails: {
        accountName: 'AWS Billing India Account',
        accountNumber: 'AWS-48102948',
        routingNumber: 'CITI0000003',
        bankName: 'Citibank N.A.',
        swift: 'CITIINBXXXX',
        iban: 'IN12CITI000000348102948',
        upiId: 'aws@pay',
        taxId: '07AAACA9118D1Z0'
      },
      payoutLimit: 750000,
      riskLevel: 'Low',
      totalDisbursed: 1120000,
      lastPaymentDate: '2026-08-28',
      avatar: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=150&q=80',
      notes: 'S3 Object Storage and Route53 DNS automated subscription.'
    },
    {
      id: 'pay_7',
      name: 'Alex Mercer',
      company: 'Apex Cyber Consulting',
      email: 'alex.mercer@apexcyber.in',
      phone: '+91 97700 90007',
      category: 'Contractor',
      status: 'Pending',
      preferredMethod: 'UPI / NEFT',
      currency: 'INR',
      accountDetails: {
        accountName: 'Alex Mercer',
        accountNumber: '5544332211',
        routingNumber: 'KKBK0000958',
        bankName: 'Kotak Mahindra Bank',
        swift: 'KKBKINBBXXX',
        iban: 'IN29KKBK000095855443322',
        upiId: 'alex@okbizaxis',
        taxId: 'PAN-GBM883920P'
      },
      payoutLimit: 200000,
      riskLevel: 'Medium',
      totalDisbursed: 140000,
      lastPaymentDate: '2026-07-15',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      notes: 'Penetration testing consultant. Pending compliance re-verification.'
    },
    {
      id: 'pay_8',
      name: 'CyberDyne Security Systems',
      company: 'CyberDyne Corp India',
      email: 'accounts@cyberdyne.in',
      phone: '+91 22 3049 2000',
      category: 'Utility',
      status: 'Active',
      preferredMethod: 'UPI / RTGS Wire',
      currency: 'INR',
      accountDetails: {
        accountName: 'CyberDyne Security Systems',
        accountNumber: '918029384910',
        routingNumber: 'YESB0000102',
        bankName: 'Yes Bank Mumbai',
        swift: 'YESBINBBXXX',
        iban: 'IN91YESB00001029180293',
        upiId: 'cyberdyne@yesbank',
        taxId: '27AAACC8820E1Z1'
      },
      payoutLimit: 400000,
      riskLevel: 'Low',
      totalDisbursed: 320000,
      lastPaymentDate: '2026-09-04',
      avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=150&q=80',
      notes: 'Datacenter physical security monitoring & automated threat protection.'
    },
    {
      id: 'pay_9',
      name: 'Income Tax Dept / GST Authority',
      company: 'Govt of India Tax Dept',
      email: 'tax-collect@incometax.gov.in',
      phone: '+91 1800 180 1961',
      category: 'Tax',
      status: 'Verified',
      preferredMethod: 'Challan Direct / NEFT',
      currency: 'INR',
      accountDetails: {
        accountName: 'Income Tax Department India',
        accountNumber: 'TREAS-00019284',
        routingNumber: 'SBIN0000691',
        bankName: 'Reserve Bank of India',
        swift: 'RBISINBBXXX',
        iban: 'IN09RBIS000069100019284',
        upiId: 'tax@rbi',
        taxId: 'GOV-IN-TDS01'
      },
      payoutLimit: 5000000,
      riskLevel: 'Low',
      totalDisbursed: 2100000,
      lastPaymentDate: '2026-08-15',
      avatar: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=150&q=80',
      notes: 'Quarterly corporate tax withholding and GST filings.'
    },
    {
      id: 'pay_10',
      name: 'QuickPay India Tech Vendors',
      company: 'QuickPay Digital Services',
      email: 'vendor-ops@quickpay.in',
      phone: '+91 22 4910 8800',
      category: 'Merchant',
      status: 'Active',
      preferredMethod: 'UPI Instant / IMPS',
      currency: 'INR',
      accountDetails: {
        accountName: 'QuickPay Tech Private Ltd',
        accountNumber: '920010048291002',
        routingNumber: 'HDFC0000240',
        bankName: 'HDFC Bank Mumbai',
        swift: 'HDFCINBBXXX',
        iban: 'IN92HDFC000024092001004829',
        upiId: 'quickpayvendor@hdfcbank',
        taxId: '27AAACQ4829A1Z2'
      },
      payoutLimit: 500000,
      riskLevel: 'Low',
      totalDisbursed: 1450000,
      lastPaymentDate: '2026-09-03',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      notes: 'Instant UPI payout channel for regional contractor pool.'
    }
  ],

  paymentGateways: [
    {
      id: 'gw_1',
      name: 'Corporate HDFC Bank Wire / NEFT',
      type: 'Bank Wire',
      currency: 'INR',
      balance: 4852000,
      feePercent: 0.1,
      dailyLimit: 10000000,
      status: 'Active',
      icon: 'fa-solid fa-building-columns'
    },
    {
      id: 'gw_2',
      name: 'ICICI Corporate Treasury Account',
      type: 'IMPS / RTGS Direct',
      currency: 'INR',
      balance: 2400000,
      feePercent: 0.05,
      dailyLimit: 5000000,
      status: 'Active',
      icon: 'fa-solid fa-building'
    },
    {
      id: 'gw_3',
      name: 'Razorpay Merchant Processor',
      type: 'Payment Gateway',
      currency: 'INR',
      balance: 1824000,
      feePercent: 1.5,
      dailyLimit: 2500000,
      status: 'Active',
      icon: 'fa-brands fa-stripe'
    },
    {
      id: 'gw_4',
      name: 'Instant UPI / IMPS FastPay',
      type: 'UPI / Instant',
      currency: 'INR',
      balance: 4200000,
      feePercent: 0.0,
      dailyLimit: 10000000,
      status: 'Active',
      icon: 'fa-solid fa-qrcode'
    },
    {
      id: 'gw_5',
      name: 'Corporate Crypto USDT Vault',
      type: 'Crypto TRC20',
      currency: 'INR',
      balance: 1450000,
      feePercent: 0.2,
      dailyLimit: 5000000,
      status: 'Active',
      icon: 'fa-brands fa-bitcoin'
    }
  ],

  paymentTransactions: [
    {
      id: 'tx_101',
      payeeId: 'pay_1',
      payeeName: 'Acme Cloud Infrastructure Corp',
      amount: 245000,
      currency: 'INR',
      method: 'Bank Wire (NEFT)',
      category: 'Vendor',
      status: 'Completed',
      date: '2026-09-02 14:30',
      txHash: 'TX-984021-INR',
      notes: 'Invoice #INV-8821 for September Bare-Metal Cluster'
    },
    {
      id: 'tx_102',
      payeeId: 'pay_3',
      payeeName: 'DevTech Global Solutions',
      amount: 128000,
      currency: 'INR',
      method: 'UPI Instant Wire',
      category: 'Contractor',
      status: 'Completed',
      date: '2026-09-01 09:15',
      txHash: 'TX-984022-UPI',
      notes: 'Security Audit & Code Penetration Test Sprint #4'
    },
    {
      id: 'tx_103',
      payeeId: 'pay_2',
      payeeName: 'Sarah Connor',
      amount: 62000,
      currency: 'INR',
      method: 'IMPS Direct Transfer',
      category: 'Payroll',
      status: 'Completed',
      date: '2026-08-31 18:00',
      txHash: 'TX-984023-PAYROLL',
      notes: 'End of August Salary & Performance Allowance'
    },
    {
      id: 'tx_104',
      payeeId: 'pay_6',
      payeeName: 'AWS Web Hosting Services',
      amount: 184500,
      currency: 'INR',
      method: 'Corporate Credit Card',
      category: 'Subscription',
      status: 'Completed',
      date: '2026-08-28 12:00',
      txHash: 'TX-984024-CC',
      notes: 'Monthly S3 Bucket & CloudFront CDN Bandwidth Billing'
    },
    {
      id: 'tx_105',
      payeeId: 'pay_8',
      payeeName: 'CyberDyne Security Systems',
      amount: 85000,
      currency: 'INR',
      method: 'UPI / RTGS',
      category: 'Utility',
      status: 'Processing',
      date: '2026-09-04 16:45',
      txHash: 'TX-984025-RTGS',
      notes: 'Datacenter Automated Defense Retainer Payout'
    },
    {
      id: 'tx_106',
      payeeId: 'pay_10',
      payeeName: 'QuickPay India Tech Vendors',
      amount: 120000,
      currency: 'INR',
      method: 'UPI Instant',
      category: 'Merchant',
      status: 'Completed',
      date: '2026-09-03 10:20',
      txHash: 'TX-984026-UPI',
      notes: 'Disbursement to regional contractor pool'
    },
    {
      id: 'tx_107',
      payeeId: 'pay_5',
      payeeName: 'Tokyo Data Center K.K.',
      amount: 1850000,
      currency: 'INR',
      method: 'SWIFT Wire Transfer',
      category: 'Vendor',
      status: 'Pending Approval',
      date: '2026-09-05 08:00',
      txHash: 'TX-984027-SWIFT',
      notes: 'Q3 Rack Server Space Lease Payment'
    }
  ],

  scheduledPayouts: [
    {
      id: 'sp_1',
      payeeId: 'pay_6',
      payeeName: 'AWS Web Hosting Services',
      amount: 184500,
      currency: 'INR',
      frequency: 'Monthly (1st)',
      nextRun: '2026-10-01',
      autoApprove: true,
      status: 'Active',
      gateway: 'Corporate Credit Card'
    },
    {
      id: 'sp_2',
      payeeId: 'pay_2',
      payeeName: 'Sarah Connor',
      amount: 62000,
      currency: 'INR',
      frequency: 'Bi-Weekly',
      nextRun: '2026-09-15',
      autoApprove: true,
      status: 'Active',
      gateway: 'Corporate HDFC Bank Wire / NEFT'
    },
    {
      id: 'sp_3',
      payeeId: 'pay_1',
      payeeName: 'Acme Cloud Infrastructure Corp',
      amount: 245000,
      currency: 'INR',
      frequency: 'Monthly (5th)',
      nextRun: '2026-10-05',
      autoApprove: false,
      status: 'Active',
      gateway: 'Corporate HDFC Bank Wire / NEFT'
    },
    {
      id: 'sp_4',
      payeeId: 'pay_3',
      payeeName: 'DevTech Global Solutions',
      amount: 128000,
      currency: 'INR',
      frequency: 'Monthly (15th)',
      nextRun: '2026-09-15',
      autoApprove: false,
      status: 'Paused',
      gateway: 'ICICI Corporate Treasury Account'
    }
  ]
};

/* IndexedDB Storage Backend for Unlimited Data Capacity */
class IndexedDBStorage {
  constructor() {
    this.dbName = 'StorageVaultDB_v2';
    this.storeName = 'vaultState';
    this.db = null;
    this.readyPromise = this.init();
  }

  init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported in this browser environment.');
        resolve(false);
        return;
      }
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(true);
      };
      req.onerror = (err) => {
        console.warn('Failed to open IndexedDB:', err);
        resolve(false);
      };
    });
  }

  async save(key, val) {
    const isReady = await this.readyPromise;
    if (!isReady || !this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => {
          console.warn('IndexedDB save failed:', e);
          resolve(false);
        };
      } catch (e) {
        console.warn('IndexedDB tx error:', e);
        resolve(false);
      }
    });
  }

  async load(key) {
    const isReady = await this.readyPromise;
    if (!isReady || !this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        console.warn('IndexedDB load error:', e);
        resolve(null);
      }
    });
  }
}

const idbStorage = new IndexedDBStorage();

class StateManager {
  constructor() {
    this.data = this.loadStateSync();
    this.initAsyncStorage();
  }

  loadStateSync() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  async initAsyncStorage() {
    try {
      const idbData = await idbStorage.load(STORAGE_KEY);
      if (idbData && idbData.files) {
        this.data = idbData;
        console.log('Loaded latest state from IndexedDB successfully.');
        if (window.cloudDrive) window.cloudDrive.render();
        if (window.serverVolumes) window.serverVolumes.render();
        if (window.warehouse) window.warehouse.render();
        if (window.analytics) window.analytics.render();
        if (window.app) {
          window.app.updateSidebarMeter();
          window.app.renderActivityLog();
        }
      }
    } catch (e) {
      console.warn('Failed async IndexedDB load:', e);
    }
  }

  saveState() {
    // 1. Save to IndexedDB (asynchronous, handles large binary/file data easily)
    idbStorage.save(STORAGE_KEY, this.data).then(success => {
      if (success) {
        console.log('Saved state to IndexedDB.');
      }
    });

    // 2. Save to localStorage with fallback if quota exceeded
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('localStorage quota exceeded. Storing lightweight state in localStorage while full data is persisted in IndexedDB.');
      try {
        // Strip heavy binary content for localStorage backup
        const lightData = JSON.parse(JSON.stringify(this.data));
        lightData.files.forEach(f => {
          if (f.url && f.url.startsWith('data:')) {
            f.url = '[Base64 Binary Stored in IndexedDB]';
          }
          if (f.content && f.content.length > 5000) {
            f.content = f.content.substring(0, 1000) + '... [Truncated for localStorage, full in IndexedDB]';
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lightData));
      } catch (innerErr) {
        console.error('Failed light save to localStorage:', innerErr);
      }
    }
  }

  resetState() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
  }

  // File & Folder Helpers
  getFiles(folderId = null, filterStarred = false, filterTrashed = false) {
    return this.data.files.filter(f => {
      if (filterTrashed) return f.trashed === true;
      if (f.trashed) return false;
      if (filterStarred) return f.starred === true;
      if (folderId) return f.folderId === folderId;
      return true;
    });
  }

  getFolders(parentId = 'root') {
    return this.data.folders.filter(f => f.parentId === parentId);
  }

  getFolderHierarchy(currentId) {
    const chain = [];
    let curr = this.data.folders.find(f => f.id === currentId);
    while (curr) {
      chain.unshift(curr);
      curr = this.data.folders.find(f => f.id === curr.parentId);
    }
    return chain;
  }

  addFile(fileObj) {
    this.data.files.push(fileObj);
    this.addActivity('upload', `Uploaded file '${fileObj.name}' (${formatBytes(fileObj.sizeBytes || 0)})`);
    this.saveState();
  }

  updateFileContent(fileId, newContent) {
    const file = this.data.files.find(f => f.id === fileId);
    if (file) {
      file.content = newContent;
      file.updatedAt = new Date().toISOString().split('T')[0];
      file.sizeBytes = new Blob([newContent]).size;
      this.addActivity('edit', `Updated content of '${file.name}'`);
      this.saveState();
    }
  }

  updateFile(fileId, updates) {
    const file = this.data.files.find(f => f.id === fileId);
    if (file) {
      Object.assign(file, updates);
      file.updatedAt = new Date().toISOString().split('T')[0];
      this.saveState();
    }
  }

  addFolder(name, parentId) {
    const newFolder = {
      id: 'fld_' + Date.now(),
      name,
      parentId: parentId || this.data.currentFolderId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.data.folders.push(newFolder);
    this.addActivity('folder', `Created new folder '${name}'`);
    this.saveState();
    return newFolder;
  }

  toggleStar(fileId) {
    const file = this.data.files.find(f => f.id === fileId);
    if (file) {
      file.starred = !file.starred;
      this.saveState();
    }
  }

  trashFile(fileId) {
    const file = this.data.files.find(f => f.id === fileId);
    if (file) {
      file.trashed = true;
      this.addActivity('trash', `Moved '${file.name}' to Trash`);
      this.saveState();
    }
  }

  restoreFile(fileId) {
    const file = this.data.files.find(f => f.id === fileId);
    if (file) {
      file.trashed = false;
      this.addActivity('trash', `Restored '${file.name}' from Trash`);
      this.saveState();
    }
  }

  deletePermanently(fileId) {
    const index = this.data.files.findIndex(f => f.id === fileId);
    if (index !== -1) {
      const name = this.data.files[index].name;
      this.data.files.splice(index, 1);
      this.addActivity('trash', `Permanently deleted '${name}'`);
      this.saveState();
    }
  }

  // Quota & Size Calculations
  getTotalBytesUsed() {
    return this.data.files
      .filter(f => !f.trashed)
      .reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
  }

  getStorageBreakdown() {
    const breakdown = { document: 0, image: 0, video: 0, code: 0, archive: 0, audio: 0, other: 0 };
    this.data.files.filter(f => !f.trashed).forEach(f => {
      const cat = breakdown.hasOwnProperty(f.type) ? f.type : 'other';
      breakdown[cat] += f.sizeBytes || 0;
    });
    return breakdown;
  }

  // Server Pool Helpers
  addServerVolume(volumeObj) {
    this.data.serverNodes.push(volumeObj);
    this.addActivity('volume', `Provisioned new storage volume '${volumeObj.name}' (${formatBytes(volumeObj.totalCapacityBytes)})`);
    this.saveState();
  }

  // Warehouse Helpers
  updateWarehouseBin(rackId, binKey, itemData) {
    const rack = this.data.warehouseRacks.find(r => r.id === rackId);
    if (!rack) return;

    if (!rack.itemMapping) rack.itemMapping = {};
    if (!rack.occupiedBins) rack.occupiedBins = [];

    if (itemData && itemData.name) {
      rack.itemMapping[binKey] = itemData;
      if (!rack.occupiedBins.includes(binKey)) {
        rack.occupiedBins.push(binKey);
      }
      this.addActivity('warehouse', `Updated bin ${binKey.toUpperCase()} in ${rack.name}: ${itemData.name} (${itemData.qty} qty)`);
    } else {
      delete rack.itemMapping[binKey];
      rack.occupiedBins = rack.occupiedBins.filter(b => b !== binKey);
      this.addActivity('warehouse', `Cleared bin ${binKey.toUpperCase()} in ${rack.name}`);
    }
    this.saveState();
  }

  // Speed Test Helpers
  addSpeedTestLog(log) {
    if (!this.data.speedTestLogs) this.data.speedTestLogs = [];
    this.data.speedTestLogs.unshift(log);
    if (this.data.speedTestLogs.length > 50) this.data.speedTestLogs.pop();
    this.addActivity('speedtest', `Ran Speed Test: ${log.downloadMbps} Mbps Down / ${log.uploadMbps} Mbps Up (Ping ${log.pingMs}ms, Grade ${log.grade})`);
    this.saveState();
  }

  clearSpeedTestLogs() {
    this.data.speedTestLogs = [];
    this.saveState();
  }

  getSpeedTestStats() {
    const logs = this.data.speedTestLogs || [];
    if (logs.length === 0) {
      return { count: 0, avgDown: 0, maxDown: 0, avgUp: 0, maxUp: 0, bestPing: 0 };
    }
    const sumDown = logs.reduce((acc, l) => acc + (l.downloadMbps || 0), 0);
    const sumUp = logs.reduce((acc, l) => acc + (l.uploadMbps || 0), 0);
    const maxDown = Math.max(...logs.map(l => l.downloadMbps || 0));
    const maxUp = Math.max(...logs.map(l => l.uploadMbps || 0));
    const pings = logs.map(l => l.pingMs || 0).filter(p => p > 0);
    const bestPing = pings.length > 0 ? Math.min(...pings) : 0;

    return {
      count: logs.length,
      avgDown: parseFloat((sumDown / logs.length).toFixed(1)),
      maxDown: parseFloat(maxDown.toFixed(1)),
      avgUp: parseFloat((sumUp / logs.length).toFixed(1)),
      maxUp: parseFloat(maxUp.toFixed(1)),
      bestPing
    };
  }

  // Payment Directory Helpers
  getPaymentDirectory(searchQuery = '', categoryFilter = 'all', statusFilter = 'all') {
    if (!this.data.paymentDirectory) this.data.paymentDirectory = [];
    return this.data.paymentDirectory.filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.accountDetails && p.accountDetails.taxId && p.accountDetails.taxId.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesCat && matchesStatus;
    });
  }

  addPayee(payeeObj) {
    if (!this.data.paymentDirectory) this.data.paymentDirectory = [];
    payeeObj.id = 'pay_' + Date.now();
    payeeObj.totalDisbursed = 0;
    payeeObj.lastPaymentDate = 'Never';
    this.data.paymentDirectory.unshift(payeeObj);
    this.addActivity('payment', `Added new payee '${payeeObj.name}' (${payeeObj.category}) to Payment Directory`);
    this.saveState();
    return payeeObj;
  }

  updatePayee(payeeId, updates) {
    if (!this.data.paymentDirectory) return false;
    const index = this.data.paymentDirectory.findIndex(p => p.id === payeeId);
    if (index !== -1) {
      Object.assign(this.data.paymentDirectory[index], updates);
      this.addActivity('payment', `Updated payee details for '${this.data.paymentDirectory[index].name}'`);
      this.saveState();
      return true;
    }
    return false;
  }

  deletePayee(payeeId) {
    if (!this.data.paymentDirectory) return false;
    const index = this.data.paymentDirectory.findIndex(p => p.id === payeeId);
    if (index !== -1) {
      const name = this.data.paymentDirectory[index].name;
      this.data.paymentDirectory.splice(index, 1);
      this.addActivity('payment', `Removed payee '${name}' from Payment Directory`);
      this.saveState();
      return true;
    }
    return false;
  }

  togglePayeeStatus(payeeId) {
    const payee = this.data.paymentDirectory.find(p => p.id === payeeId);
    if (payee) {
      payee.status = payee.status === 'Active' ? 'Suspended' : 'Active';
      this.addActivity('payment', `Toggled status of '${payee.name}' to ${payee.status}`);
      this.saveState();
    }
  }

  recordPayoutTransaction(txObj) {
    if (!this.data.paymentTransactions) this.data.paymentTransactions = [];
    txObj.id = 'tx_' + Date.now();
    txObj.date = new Date().toISOString().replace('T', ' ').substring(0, 16);
    txObj.txHash = 'TX-' + Math.floor(100000 + Math.random() * 900000) + '-' + (txObj.currency || 'USD');
    
    this.data.paymentTransactions.unshift(txObj);

    // Update Payee totalDisbursed
    if (txObj.payeeId) {
      const payee = this.data.paymentDirectory.find(p => p.id === txObj.payeeId);
      if (payee) {
        payee.totalDisbursed = (payee.totalDisbursed || 0) + parseFloat(txObj.amount);
        payee.lastPaymentDate = txObj.date.split(' ')[0];
      }
    }

    // Deduct from Gateway balance
    if (this.data.paymentGateways && txObj.gatewayId) {
      const gw = this.data.paymentGateways.find(g => g.id === txObj.gatewayId);
      if (gw) {
        gw.balance = Math.max(0, gw.balance - parseFloat(txObj.amount));
      }
    }

    this.addActivity('payment', `Disbursed payment of ${txObj.currency} ${txObj.amount} to '${txObj.payeeName}' via ${txObj.method}`);
    this.saveState();
    return txObj;
  }

  addScheduledPayout(payoutObj) {
    if (!this.data.scheduledPayouts) this.data.scheduledPayouts = [];
    payoutObj.id = 'sp_' + Date.now();
    payoutObj.status = 'Active';
    this.data.scheduledPayouts.push(payoutObj);
    this.addActivity('payment', `Scheduled recurring payout of ${payoutObj.currency} ${payoutObj.amount} for '${payoutObj.payeeName}'`);
    this.saveState();
    return payoutObj;
  }

  toggleScheduledPayout(payoutId) {
    if (!this.data.scheduledPayouts) return;
    const sp = this.data.scheduledPayouts.find(s => s.id === payoutId);
    if (sp) {
      sp.status = sp.status === 'Active' ? 'Paused' : 'Active';
      this.addActivity('payment', `Toggled scheduled payout for '${sp.payeeName}' to ${sp.status}`);
      this.saveState();
    }
  }

  getPaymentMetrics() {
    const payees = this.data.paymentDirectory || [];
    const transactions = this.data.paymentTransactions || [];
    const scheduled = this.data.scheduledPayouts || [];
    const gateways = this.data.paymentGateways || [];

    const totalPayees = payees.length;
    const activePayees = payees.filter(p => p.status === 'Active' || p.status === 'Verified').length;
    const totalOutflowINR = transactions
      .filter(t => t.status === 'Completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const pendingTransactions = transactions.filter(t => t.status === 'Pending Approval' || t.status === 'Processing').length;
    const totalGatewayBalanceINR = gateways.reduce((sum, g) => sum + parseFloat(g.balance || 0), 0);

    return {
      totalPayees,
      activePayees,
      totalOutflowINR: Math.round(totalOutflowINR),
      pendingTransactions,
      scheduledCount: scheduled.filter(s => s.status === 'Active').length,
      totalGatewayBalanceINR: Math.round(totalGatewayBalanceINR)
    };
  }

  // Audit Log Helper
  addActivity(type, desc) {
    const now = new Date();
    const formatted = now.toISOString().replace('T', ' ').substring(0, 16);
    this.data.activities.unshift({
      id: 'act_' + Date.now(),
      timestamp: formatted,
      type,
      user: 'Admin User',
      desc
    });
    if (this.data.activities.length > 50) this.data.activities.pop();
    this.saveState();
  }

  exportState() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storage_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.addActivity('backup', 'Exported full system storage data backup JSON');
  }

  importState(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (!parsed.files || !parsed.folders || !parsed.serverNodes || !parsed.warehouseRacks) {
        throw new Error('Invalid backup data schema.');
      }
      this.data = parsed;
      this.saveState();
      this.addActivity('backup', 'Restored system storage state from JSON backup');
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
}

// Utility Formatter
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const state = new StateManager();
