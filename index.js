// Global database variable
let db = null;
let dbInitialized = false;
let currentCustomerForPayment = null;



// Notification System
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notification-container');
        this.notificationId = 0;
    }

    show(message, type = 'info', title = '', duration = 5000) {
        const notificationId = this.notificationId++;
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.id = `notification-${notificationId}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="notificationSystem.close(${notificationId})">×</button>
        `;

        this.container.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto close if duration is set
        if (duration > 0) {
            setTimeout(() => {
                this.close(notificationId);
            }, duration);
        }

        return notificationId;
    }

    close(notificationId) {
        const notification = document.getElementById(`notification-${notificationId}`);
        if (notification) {
            notification.classList.remove('show');
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(message, title = 'Success', duration = 3000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = 'Error', duration = 5000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = 'Warning', duration = 4000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = 'Info', duration = 3000) {
        return this.show(message, 'info', title, duration);
    }
}

// Initialize notification system
const notificationSystem = new NotificationSystem();

// Replace console.log and alert with notification system
const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    // Only show non-error messages as info notifications
    notificationSystem.info(args.join(' '), 'Console');
};

// Replace all alert calls with notifications
window.alert = function(message) {
    notificationSystem.info(message, 'Alert');
};

document.addEventListener('DOMContentLoaded', function () {
    // Database setup
    const dbName = "BillingSoftwareDB";
    const dbVersion = 6; // Incremented version for customer payments

    // Open database
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
        notificationSystem.error('Error opening database. Some features may not work properly.');
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        dbInitialized = true;
        //commented for debugging
        //console.log("Database opened successfully");

        // Initialize the application after database is ready
        initializeApplication();
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        const oldVersion = event.oldVersion;

        // Create object store for bills if it doesn't exist
        if (!db.objectStoreNames.contains('bills')) {
            const billsStore = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
            billsStore.createIndex('invoiceNo', 'invoiceNo', { unique: false });
            billsStore.createIndex('customerName', 'customerName', { unique: false });
            billsStore.createIndex('date', 'date', { unique: false });
        }

        // Create object store for company info if it doesn't exist
        if (!db.objectStoreNames.contains('companyInfo')) {
            const companyStore = db.createObjectStore('companyInfo', { keyPath: 'id' });
        }

        // Create object store for current session if it doesn't exist
        if (!db.objectStoreNames.contains('currentSession')) {
            const sessionStore = db.createObjectStore('currentSession', { keyPath: 'id' });
        }

        // Create object store for customers if it doesn't exist
        if (!db.objectStoreNames.contains('customers')) {
            const customersStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
            customersStore.createIndex('name', 'name', { unique: false });
            customersStore.createIndex('gstin', 'gstin', { unique: true });
        }

        // Create object store for ledger if it doesn't exist
        if (!db.objectStoreNames.contains('ledger')) {
            const ledgerStore = db.createObjectStore('ledger', { keyPath: 'id', autoIncrement: true });
            ledgerStore.createIndex('customerId', 'customerId', { unique: false });
            ledgerStore.createIndex('date', 'date', { unique: false });
            ledgerStore.createIndex('invoiceNo', 'invoiceNo', { unique: false });
        }

        // Create object store for items if it doesn't exist
        if (!db.objectStoreNames.contains('items')) {
            const itemsStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
            itemsStore.createIndex('desc', 'desc', { unique: false });
            itemsStore.createIndex('hsn', 'hsn', { unique: false });
        }

        // Create object store for customer payments if it doesn't exist
        if (!db.objectStoreNames.contains('customerPayments')) {
            const paymentsStore = db.createObjectStore('customerPayments', { keyPath: 'id', autoIncrement: true });
            paymentsStore.createIndex('customerId', 'customerId', { unique: false });
            paymentsStore.createIndex('customerName', 'customerName', { unique: false });
            paymentsStore.createIndex('date', 'date', { unique: false });
        }
    };

   // Enhanced sidebar toggle functionality with icon change and animations
function initializeSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    // Check if elements exist before proceeding
    if (!sidebarToggle || !sidebar || !sidebarOverlay) {
        console.error('Sidebar elements not found');
        return;
    }
    
    const toggleIcon = sidebarToggle.querySelector('.material-symbols-outlined');
    
    // Check if toggle icon exists
    if (!toggleIcon) {
        console.error('Toggle icon not found');
        return;
    }

    sidebarToggle.addEventListener('click', function() {
        const isOpening = !sidebar.classList.contains('active');
        
        // Toggle sidebar
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        
        // Change icon based on sidebar state - using Material Symbols names
        if (isOpening) {
            toggleIcon.textContent = 'chevron_left'; // When sidebar is open
        } else {
            toggleIcon.textContent = 'menu'; // When sidebar is closed
        }
    });
    
    // Close sidebar when clicking overlay
    sidebarOverlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        if (toggleIcon) {
            toggleIcon.textContent = 'menu';
        }
    });
    
    // Close sidebar when clicking on main content on mobile
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.addEventListener('click', function() {
            if (window.innerWidth <= 767 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                if (toggleIcon) {
                    toggleIcon.textContent = 'menu';
                }
            }
        });
    }
    
    // Close sidebar when a navigation button is clicked on mobile
    document.querySelectorAll('.sidebar .toggle-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (window.innerWidth <= 767 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                if (toggleIcon) {
                    toggleIcon.textContent = 'menu';
                }
            }
        });
    });
}

    // Initialize the application after database is ready
    function initializeApplication() {
        if (!dbInitialized) {
            notificationSystem.info('Database not ready yet, waiting...');
            setTimeout(initializeApplication, 100);
            return;
        }

        // Load all data
        loadCompanyInfo();
        loadCurrentSession();
        loadSavedBills();

        // Set default customer type to "Bill To"
        document.getElementById('customer-type').value = 'bill-to';
        updateCustomerTypeDisplay();

        // Setup customer suggestions
        setupCustomerSuggestions();
        
        // Setup item suggestions
        setupItemSuggestions();
        
        // Setup backup and restore buttons
        setupBackupRestore();
        
        // Initialize payment functionality
        initializePaymentFunctionality();
        
        // Initialize enhanced sidebar toggle
        initializeSidebarToggle();
        
        // Add clear customer info button event listener
        document.getElementById('clear-customer-info-btn').addEventListener('click', clearCustomerInfo);
        
        // Add print ledger button event listener
        document.getElementById('print-ledger-btn').addEventListener('click', printLedgerStatement);

        // Remove from date filter from ledger - Check if elements exist first
        const ledgerFromDate = document.getElementById('ledger-from-date');
        const ledgerFromDateLabel = document.querySelector('label[for="ledger-from-date"]');
        
        if (ledgerFromDate) {
            ledgerFromDate.style.display = 'none';
        }
        if (ledgerFromDateLabel) {
            ledgerFromDateLabel.style.display = 'none';
        }
    }

    // Function to clear customer info inputs and items
    // Function to clear customer info inputs and items
function clearCustomerInfo() {
    document.getElementById('consignee-name').value = '';
    document.getElementById('consignee-address').value = '';
    document.getElementById('consignee-gst').value = '';
    document.getElementById('consignee-state').value = 'Maharashtra';
    document.getElementById('consignee-code').value = '27';
    document.getElementById('consignee-contact').value = '';
    
    document.getElementById('buyer-name').value = '';
    document.getElementById('buyer-address').value = '';
    document.getElementById('buyer-gst').value = '2712ABCD34DZ9';
    document.getElementById('buyer-state').value = 'Maharashtra';
    document.getElementById('buyer-code').value = '27';
    document.getElementById('buyer-contact').value = '';
    document.getElementById('place-of-supply').value = 'Maharashtra';
    
    // Clear all items in the table
    const itemsTbody = document.getElementById('items-tbody');
    itemsTbody.innerHTML = '';
    
    // Auto-generate next invoice number
    generateNextInvoiceNumber();
    
    saveCurrentSession();
    notificationSystem.success('Customer information cleared successfully!');
}

// Function to generate next invoice number based on last saved bill
function generateNextInvoiceNumber() {
    if (!dbInitialized) {
        document.getElementById('invoice-no').value = '001';
        return;
    }

    try {
        const transaction = db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');
        const request = store.getAll();

        request.onsuccess = function () {
            const bills = request.result;
            if (bills.length === 0) {
                // No bills yet, start with 001
                document.getElementById('invoice-no').value = '001';
                return;
            }

            // Find the highest invoice number
            let highestNumber = 0;
            bills.forEach(bill => {
                // Extract numeric part from invoice number (handle both "001" and "INV-001" formats)
                let invoiceNo = bill.invoiceNo;
                // Remove "INV-" prefix if present
                invoiceNo = invoiceNo.replace('INV-', '');
                // Convert to number
                const number = parseInt(invoiceNo);
                if (!isNaN(number) && number > highestNumber) {
                    highestNumber = number;
                }
            });

            // Generate next invoice number (highest + 1)
            const nextNumber = highestNumber + 1;
            // Format as 3-digit string with leading zeros
            const nextInvoiceNo = nextNumber.toString().padStart(3, '0');
            document.getElementById('invoice-no').value = nextInvoiceNo;
        };

        request.onerror = function () {
            // Fallback to simple increment if there's an error
            const currentValue = document.getElementById('invoice-no').value;
            if (currentValue && !isNaN(parseInt(currentValue))) {
                const currentNumber = parseInt(currentValue);
                const nextNumber = (currentNumber + 1).toString().padStart(3, '0');
                document.getElementById('invoice-no').value = nextNumber;
            } else {
                document.getElementById('invoice-no').value = '001';
            }
        };
    } catch (error) {
        console.error('Error generating next invoice number:', error);
        // Fallback
        const currentValue = document.getElementById('invoice-no').value;
        if (currentValue && !isNaN(parseInt(currentValue))) {
            const currentNumber = parseInt(currentValue);
            const nextNumber = (currentNumber + 1).toString().padStart(3, '0');
            document.getElementById('invoice-no').value = nextNumber;
        } else {
            document.getElementById('invoice-no').value = '001';
        }
    }
}

    // Add print functionality for ledger (modified to print on same page)
    function printLedgerStatement() {
        // Just call window.print() - CSS will handle which section to show
        window.print();
    }

    // Setup item suggestions in customer info section
    function setupItemSuggestions() {
        const itemDescInputs = document.querySelectorAll('.item-desc');
        
        itemDescInputs.forEach(input => {
            // Create suggestions container for each input if it doesn't exist
            let suggestionsContainer = input.parentNode.querySelector('.item-suggestions');
            if (!suggestionsContainer) {
                suggestionsContainer = document.createElement('div');
                suggestionsContainer.className = 'item-suggestions';
                input.parentNode.appendChild(suggestionsContainer);
            }
            
            input.addEventListener('input', function () {
                const searchTerm = this.value.trim();
                
                if (searchTerm.length < 2) {
                    suggestionsContainer.style.display = 'none';
                    return;
                }

                searchItems(searchTerm).then(items => {
                    suggestionsContainer.innerHTML = '';
                    if (items.length > 0) {
                        items.forEach(item => {
                            const suggestionItem = document.createElement('div');
                            suggestionItem.className = 'item-suggestion-item';
                            suggestionItem.innerHTML = `
                                <strong>${item.desc}</strong><br>
                                <small>HSN: ${item.hsn} | Rate: ₹${item.rate} | Per: ${item.per}</small>
                            `;
                            suggestionItem.addEventListener('click', function () {
                                const row = input.closest('tr');
                                fillItemDetails(row, item);
                                suggestionsContainer.style.display = 'none';
                            });
                            suggestionsContainer.appendChild(suggestionItem);
                        });
                        suggestionsContainer.style.display = 'block';
                    } else {
                        suggestionsContainer.style.display = 'none';
                    }
                });
            });

            // Hide suggestions when clicking outside
            document.addEventListener('click', function (e) {
                if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                    suggestionsContainer.style.display = 'none';
                }
            });
        });
    }

    // Fill item details when suggestion is clicked
    function fillItemDetails(row, item) {
        row.querySelector('.item-desc').value = item.desc;
        row.querySelector('.item-hsn').value = item.hsn;
        row.querySelector('.item-per').value = item.per;
        row.querySelector('.item-rate').value = item.rate;
        row.querySelector('.item-qty').value = 1; // Default quantity
        
        saveCurrentSession();
    }

    // Search items
    function searchItems(searchTerm) {
        return new Promise((resolve) => {
            if (!dbInitialized) {
                resolve([]);
                return;
            }

            try {
                const transaction = db.transaction(['items'], 'readonly');
                const store = transaction.objectStore('items');
                const request = store.getAll();

                request.onsuccess = function () {
                    const items = request.result;
                    const filteredItems = items.filter(item =>
                        item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.hsn.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    resolve(filteredItems);
                };

                request.onerror = function () {
                    resolve([]);
                };
            } catch (error) {
                console.error('Error searching items:', error);
                resolve([]);
            }
        });
    }

    // Load customer ledger (modified to show all bills and payments without date filter)
    function loadCustomerLedger(searchTerm = '') {
        if (!dbInitialized) {
            document.getElementById('ledger-results').innerHTML = '<div class="loading-message">Database loading...</div>';
            return;
        }

        if (!searchTerm.trim()) {
            document.getElementById('ledger-summary').innerHTML = '<p>Select a customer to view their ledger</p>';
            document.getElementById('ledger-results').innerHTML = '<div class="loading-message">Enter customer name or GSTIN to view ledger</div>';
            return;
        }

        try {
            const transaction = db.transaction(['bills', 'customerPayments'], 'readonly');
            const billsStore = transaction.objectStore('bills');
            const paymentsStore = transaction.objectStore('customerPayments');
            
            const billsRequest = billsStore.getAll();
            const paymentsRequest = paymentsStore.getAll();

            Promise.all([requestToPromise(billsRequest), requestToPromise(paymentsRequest)]).then(([bills, payments]) => {
                const ledgerResults = document.getElementById('ledger-results');
                const ledgerSummary = document.getElementById('ledger-summary');
                
                ledgerResults.innerHTML = '';
                ledgerSummary.innerHTML = '';

                // Filter bills and payments for the customer
                const customerBills = bills.filter(bill => 
                    bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    bill.customerGst.toLowerCase().includes(searchTerm.toLowerCase())
                );

                const customerPayments = payments.filter(payment =>
                    payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    payment.customerGstin.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (customerBills.length === 0 && customerPayments.length === 0) {
                    ledgerSummary.innerHTML = '<p>No bills or payments found for this customer.</p>';
                    return;
                }

                // Calculate summary
                let totalSubTotal = 0;
                let totalGrandTotal = 0;
                let totalBills = customerBills.length;
                let totalPayments = customerPayments.length;
                let totalPaymentAmount = 0;
                let oldestRecord = new Date();
                let newestRecord = new Date(0);

                // Get customer details from first bill or payment
                const firstBill = customerBills[0];
                const firstPayment = customerPayments[0];
                const customerName = firstBill ? firstBill.customerName : firstPayment.customerName;
                const customerGstin = firstBill ? firstBill.customerGst : firstPayment.customerGstin;

                // Process bills
                customerBills.forEach(bill => {
                    let billTotal = 0;
                    bill.items.forEach(item => {
                        const qty = parseFloat(item.qty) || 0;
                        const rate = parseFloat(item.rate) || 0;
                        billTotal += qty * rate;
                    });

                    const gstPercent = parseFloat(bill.gstPercent) || 0;
                    const gstAmount = (billTotal * gstPercent) / 100;
                    const grandTotal = Math.round(billTotal + gstAmount);
                    
                    totalSubTotal += billTotal;
                    totalGrandTotal += grandTotal;

                    const billDate = new Date(bill.date);
                    if (billDate < oldestRecord) oldestRecord = billDate;
                    if (billDate > newestRecord) newestRecord = billDate;
                });

                // Process payments
                customerPayments.forEach(payment => {
                    totalPaymentAmount += payment.amount;

                    const paymentDate = new Date(payment.date);
                    if (paymentDate < oldestRecord) oldestRecord = paymentDate;
                    if (paymentDate > newestRecord) newestRecord = paymentDate;
                });

                // Calculate balance and advance payment
                let balance = totalGrandTotal - totalPaymentAmount;
                let advancePayment = 0;

                if (balance < 0) {
                    advancePayment = Math.abs(balance);
                    balance = 0;
                }

                // Display summary
                ledgerSummary.innerHTML = `
                    <h3>Customer Summary</h3>
                    <p><strong>Customer Name:</strong> ${customerName}</p>
                    <p><strong>GSTIN:</strong> ${customerGstin}</p>
                    <p><strong>Total Bills:</strong> ${totalBills}</p>
                    <p><strong>Total Payments:</strong> ${totalPayments}</p>
                    <p><strong>Total Sub Total:</strong> ₹${totalSubTotal.toFixed(2)}</p>
                    <p><strong>Total Grand Total:</strong> ₹${totalGrandTotal.toFixed(2)}</p>
                    <p><strong>Total Payments Amount:</strong> ₹${totalPaymentAmount.toFixed(2)}</p>
                    <p><strong>Balance:</strong> ₹${balance.toFixed(2)}</p>
                    ${advancePayment > 0 ? `<p><strong>Advance Payment:</strong> ₹${advancePayment.toFixed(2)}</p>` : ''}
                    <p><strong>Date Range:</strong> ${oldestRecord.toLocaleDateString()} to ${newestRecord.toLocaleDateString()}</p>
                `;

                // Create bills table
                if (customerBills.length > 0) {
                    const billsTable = document.createElement('table');
                    billsTable.className = 'ledger-table';
                    billsTable.innerHTML = `
                        <thead>
                            <tr>
                                <th colspan="5" style="text-align: center; background-color: #e3f2fd;">BILLS</th>
                            </tr>
                            <tr>
                                <th>Invoice No</th>
                                <th>Date</th>
                                <th>Sub Total (₹)</th>
                                <th>Grand Total (₹)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    `;
                    ledgerResults.appendChild(billsTable);

                    const billsTbody = billsTable.querySelector('tbody');
                    customerBills.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(bill => {
                        let billTotal = 0;
                        bill.items.forEach(item => {
                            const qty = parseFloat(item.qty) || 0;
                            const rate = parseFloat(item.rate) || 0;
                            billTotal += qty * rate;
                        });

                        const gstPercent = parseFloat(bill.gstPercent) || 0;
                        const gstAmount = (billTotal * gstPercent) / 100;
                        const grandTotal = Math.round(billTotal + gstAmount);

                        const invoiceNumber = bill.invoiceNo.replace('INV-', '');
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${invoiceNumber}</td>
                            <td>${new Date(bill.date).toLocaleDateString()}</td>
                            <td>${billTotal.toFixed(2)}</td>
                            <td>${grandTotal.toFixed(2)}</td>
                            <td><button class="load-bill-btn" data-id="${bill.id}">View Bill</button></td>
                        `;
                        billsTbody.appendChild(row);
                    });
                }

                // Create payments table
                if (customerPayments.length > 0) {
                    const paymentsTable = document.createElement('table');
                    paymentsTable.className = 'ledger-table';
                    paymentsTable.innerHTML = `
                        <thead>
                            <tr>
                                <th colspan="4" style="text-align: center; background-color: #f3e5f5;">PAYMENTS</th>
                            </tr>
                            <tr>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Amount (₹)</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    `;
                    ledgerResults.appendChild(paymentsTable);

                    const paymentsTbody = paymentsTable.querySelector('tbody');
                    customerPayments.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(payment => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${new Date(payment.date).toLocaleDateString()}</td>
                            <td>${payment.method}</td>
                            <td>${payment.amount.toFixed(2)}</td>
                            <td>${payment.notes || '-'}</td>
                        `;
                        paymentsTbody.appendChild(row);
                    });
                }

                // Add event listeners to load buttons
                document.querySelectorAll('.ledger-table .load-bill-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const billId = parseInt(this.getAttribute('data-id'));
                        loadBill(billId);
                    });
                });
            });
        } catch (error) {
            console.error('Error loading customer ledger:', error);
            document.getElementById('ledger-results').innerHTML = '<p>Error loading ledger.</p>';
        }
    }

    // Helper function to convert IndexedDB request to Promise
    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Load and manage items
    function loadItems(searchTerm = '') {
        if (!dbInitialized) {
            document.getElementById('items-list').innerHTML = '<div class="loading-message">Database loading...</div>';
            return;
        }

        try {
            const transaction = db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.getAll();

            request.onsuccess = function () {
                const items = request.result;
                const itemsList = document.getElementById('items-list');
                itemsList.innerHTML = '';

                // Filter items if search term is provided
                const filteredItems = searchTerm ?
                    items.filter(item =>
                        item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.hsn.toLowerCase().includes(searchTerm.toLowerCase())
                    ) : items;

                if (filteredItems.length === 0) {
                    itemsList.innerHTML = '<p>No items found.</p>';
                    return;
                }

                filteredItems.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'item-item';
                    itemElement.innerHTML = `
                        <div class="item-details">
                            <strong>${item.desc}</strong>
                            <p>HSN: ${item.hsn}</p>
                            <p>Rate: ₹${item.rate} | Per: ${item.per}</p>
                        </div>
                        <div class="item-actions">
                            <button class="use-item-btn" data-id="${item.id}">
                                <i class="material-icons">add</i> Use
                            </button>
                            <button class="delete-item-btn" data-id="${item.id}">
                                <i class="material-icons">delete</i> Delete
                            </button>
                        </div>
                    `;
                    itemsList.appendChild(itemElement);
                });

                // Add event listeners
                document.querySelectorAll('.use-item-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const itemId = parseInt(this.getAttribute('data-id'));
                        useItem(itemId);
                    });
                });

                document.querySelectorAll('.delete-item-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const itemId = parseInt(this.getAttribute('data-id'));
                        deleteItem(itemId);
                    });
                });
            };
        } catch (error) {
            console.error('Error loading items:', error);
            document.getElementById('items-list').innerHTML = '<p>Error loading items.</p>';
        }
    }

    // Use item in customer info section
    function useItem(itemId) {
        if (!dbInitialized) return;

        try {
            const transaction = db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.get(itemId);

            request.onsuccess = function () {
                const item = request.result;
                if (item) {
                    // Add new row with item details
                    const itemsTbody = document.getElementById('items-tbody');
                    const newRow = document.createElement('tr');
                    newRow.innerHTML = `
                        <td><input type="text" class="item-desc" value="${item.desc}"></td>
                        <td><input type="text" class="item-hsn" value="${item.hsn}"></td>
                        <td><input type="number" class="item-qty" value="1"></td>
                        <td><input type="text" class="item-per" value="${item.per}"></td>
                        <td><input type="number" class="item-rate" value="${item.rate}" step="0.01"></td>
                        <td><button class="remove-item-btn">Remove</button></td>
                    `;
                    itemsTbody.appendChild(newRow);

                    // Add event listener to the new remove button
                    newRow.querySelector('.remove-item-btn').addEventListener('click', function () {
                        itemsTbody.removeChild(newRow);
                        saveCurrentSession();
                    });

                    // Setup item suggestions for the new row
                    setupItemSuggestionsForRow(newRow);

                    // Switch to customer info section
                    document.getElementById('customer-info-toggle').click();
                    
                    saveCurrentSession();
                    notificationSystem.success('Item added to bill successfully!');
                }
            };
        } catch (error) {
            console.error('Error loading item:', error);
            notificationSystem.error('Error loading item. Please try again.');
        }
    }

    // Setup item suggestions for a specific row
    function setupItemSuggestionsForRow(row) {
        const itemDescInput = row.querySelector('.item-desc');
        
        // Create suggestions container for this row
        let suggestionsContainer = row.querySelector('.item-suggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'item-suggestions';
            // Insert after the input's parent td
            const inputTd = itemDescInput.closest('td');
            inputTd.appendChild(suggestionsContainer);
        }
        
        itemDescInput.addEventListener('input', function () {
            const searchTerm = this.value.trim();
            
            if (searchTerm.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            searchItems(searchTerm).then(items => {
                suggestionsContainer.innerHTML = '';
                if (items.length > 0) {
                    items.forEach(item => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'item-suggestion-item';
                        suggestionItem.innerHTML = `
                            <strong>${item.desc}</strong><br>
                            <small>HSN: ${item.hsn} | Rate: ₹${item.rate} | Per: ${item.per}</small>
                        `;
                        suggestionItem.addEventListener('click', function () {
                            fillItemDetails(row, item);
                            suggestionsContainer.style.display = 'none';
                        });
                        suggestionsContainer.appendChild(suggestionItem);
                    });
                    suggestionsContainer.style.display = 'block';
                } else {
                    suggestionsContainer.style.display = 'none';
                }
            });
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function (e) {
            if (!itemDescInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    // Delete item
    function deleteItem(itemId) {
        if (!dbInitialized) return;

        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const transaction = db.transaction(['items'], 'readwrite');
                const store = transaction.objectStore('items');
                const request = store.delete(itemId);

                request.onsuccess = function () {
                    notificationSystem.success('Item deleted successfully!');
                    loadItems();
                };

                request.onerror = function () {
                    notificationSystem.error('Error deleting item');
                };
            } catch (error) {
                notificationSystem.error('Error deleting item: ' + error.message);
            }
        }
    }

    // Add new item
    document.getElementById('add-new-item-btn').addEventListener('click', function() {
        const desc = document.getElementById('new-item-desc').value;
        const hsn = document.getElementById('new-item-hsn').value;
        const per = document.getElementById('new-item-per').value;
        const rate = document.getElementById('new-item-rate').value;

        if (!desc || !hsn || !rate) {
            notificationSystem.error('Please fill all required fields: Description, HSN, and Rate.');
            return;
        }

        const itemData = {
            desc: desc,
            hsn: hsn,
            per: per,
            rate: parseFloat(rate),
            timestamp: new Date().getTime()
        };

        if (!dbInitialized) {
            notificationSystem.error('Database not ready. Please try again.');
            return;
        }

        try {
            const transaction = db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.add(itemData);

            request.onsuccess = function () {
                notificationSystem.success('Item added successfully!');
                // Clear the form
                document.getElementById('new-item-desc').value = '';
                document.getElementById('new-item-hsn').value = '';
                document.getElementById('new-item-rate').value = '';
                document.getElementById('new-item-per').value = 'NOS';
                
                loadItems();
            };

            request.onerror = function () {
                notificationSystem.error('Error adding item. Please try again.');
            };
        } catch (error) {
            notificationSystem.error('Error adding item: ' + error.message);
        }
    });

    // Setup backup and restore functionality
    function setupBackupRestore() {
        // Add event listeners
        document.getElementById('backup-btn').addEventListener('click', backupData);
        document.getElementById('restore-btn').addEventListener('click', restoreData);
        //commented for debugging
        //notificationSystem.info('Backup/Restore functionality initialized with items support');
    }

    // Backup all data to JSON file
    async function backupData() {
        if (!dbInitialized) {
            notificationSystem.error('Database not ready. Please try again.');
            return;
        }

        try {
            // Collect all data from IndexedDB
            const backupData = {
                bills: await getAllData('bills'),
                companyInfo: await getAllData('companyInfo'),
                customers: await getAllData('customers'),
                ledger: await getAllData('ledger'),
                items: await getAllData('items'),
                customerPayments: await getAllData('customerPayments'),
                timestamp: new Date().toISOString(),
                version: '1.3' // Update version for payments support
            };

            // Create and download JSON file
            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            
            // Use File System Access API if available, otherwise fallback to download
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: `billing-backup-${new Date().toISOString().split('T')[0]}.json`,
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] },
                        }],
                    });
                    
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    notificationSystem.success('Backup created successfully!');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        // Fallback to download method
                        downloadBackupFile(blob);
                    }
                }
            } else {
                // Fallback for browsers without File System Access API
                downloadBackupFile(blob);
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            notificationSystem.error('Error creating backup: ' + error.message);
        }
    }

    // Fallback method to download backup file
    function downloadBackupFile(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notificationSystem.success('Backup downloaded successfully!');
    }

    // Restore data from JSON file
    async function restoreData() {
        if (!dbInitialized) {
            notificationSystem.error('Database not ready. Please try again.');
            return;
        }

        try {
            let fileHandle;
            if ('showOpenFilePicker' in window) {
                [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    }],
                    multiple: false
                });
            } else {
                // Fallback for browsers without File System Access API
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        processRestoreFile(file);
                    }
                };
                input.click();
                return;
            }

            const file = await fileHandle.getFile();
            await processRestoreFile(file);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error restoring backup:', error);
                notificationSystem.error('Error restoring backup: ' + error.message);
            }
        }
    }

    // Process the restore file
    async function processRestoreFile(file) {
        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.bills || !backupData.customers) {
            throw new Error('Invalid backup file format');
        }

        // Confirm restore operation
        const confirmed = confirm(
            `This will add data from backup:\n\n` +
            `- Bills: ${backupData.bills.length}\n` +
            `- Customers: ${backupData.customers.length}\n` +
            `- Company Info: ${backupData.companyInfo ? backupData.companyInfo.length : 0}\n` +
            `- Ledger Entries: ${backupData.ledger ? backupData.ledger.length : 0}\n` +
            `- Items: ${backupData.items ? backupData.items.length : 0}\n` +
            `- Customer Payments: ${backupData.customerPayments ? backupData.customerPayments.length : 0}\n\n` +
            `Existing data will be preserved. Duplicates will be skipped.\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        // Restore data
        let billsAdded = 0;
        let customersAdded = 0;
        let companyInfoUpdated = 0;
        let ledgerEntriesAdded = 0;
        let itemsAdded = 0;
        let paymentsAdded = 0;

        // Restore bills
        for (const bill of backupData.bills) {
            const added = await restoreBill(bill);
            if (added) billsAdded++;
        }

        // Restore customers
        for (const customer of backupData.customers) {
            const added = await restoreCustomer(customer);
            if (added) customersAdded++;
        }

        // Restore ledger entries if they exist
        if (backupData.ledger && backupData.ledger.length > 0) {
            for (const ledgerEntry of backupData.ledger) {
                const added = await restoreLedgerEntry(ledgerEntry);
                if (added) ledgerEntriesAdded++;
            }
        }

        // Restore items if they exist
        if (backupData.items && backupData.items.length > 0) {
            for (const item of backupData.items) {
                const added = await restoreItem(item);
                if (added) itemsAdded++;
            }
        }

        // Restore customer payments if they exist
        if (backupData.customerPayments && backupData.customerPayments.length > 0) {
            for (const payment of backupData.customerPayments) {
                const added = await restoreCustomerPayment(payment);
                if (added) paymentsAdded++;
            }
        }

        // Restore company info (only if we don't have any)
        if (backupData.companyInfo && backupData.companyInfo.length > 0) {
            const existingCompanyInfo = await getAllData('companyInfo');
            if (existingCompanyInfo.length === 0) {
                for (const companyInfo of backupData.companyInfo) {
                    await restoreCompanyInfo(companyInfo);
                    companyInfoUpdated++;
                }
            }
        }

        // Show results and refresh UI
        notificationSystem.success(
            `Restore completed successfully!\n\n` +
            `- Bills added: ${billsAdded}\n` +
            `- Customers added: ${customersAdded}\n` +
            `- Ledger entries added: ${ledgerEntriesAdded}\n` +
            `- Items added: ${itemsAdded}\n` +
            `- Customer payments added: ${paymentsAdded}\n` +
            `- Company info updated: ${companyInfoUpdated}`
        );

        // Refresh UI
        loadSavedBills();
        loadCustomers();
        loadItems();
        if (companyInfoUpdated > 0) {
            loadCompanyInfo();
        }
    }

    // Restore a single item (skip duplicates by description and HSN)
    async function restoreItem(backupItem) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(['items'], 'readwrite');
                const store = transaction.objectStore('items');

                // Check for duplicate item by description and HSN
                const index = store.index('desc');
                const request = index.getAll(backupItem.desc);

                request.onsuccess = function () {
                    const existingItems = request.result;
                    
                    // Check if this exact item already exists (same description and HSN)
                    const isDuplicate = existingItems.some(existingItem => 
                        existingItem.desc === backupItem.desc && 
                        existingItem.hsn === backupItem.hsn
                    );

                    if (isDuplicate) {
                        console.log('Skipping duplicate item:', backupItem.desc);
                        resolve(false);
                        return;
                    }

                    // Remove ID from backup data to allow auto-increment
                    const { id, ...itemData } = backupItem;
                    
                    // Add new item
                    const addRequest = store.add(itemData);
                    addRequest.onsuccess = function () {
                        console.log('Restored item:', backupItem.desc);
                        resolve(true);
                    };
                    addRequest.onerror = function () {
                        console.error('Error restoring item:', backupItem.desc);
                        resolve(false);
                    };
                };

                request.onerror = function () {
                    console.error('Error checking for duplicate item');
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in restoreItem:', error);
                resolve(false);
            }
        });
    }

    // Restore a single customer payment
    async function restoreCustomerPayment(backupPayment) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(['customerPayments'], 'readwrite');
                const store = transaction.objectStore('customerPayments');

                // Check for duplicate payment by customerId, date, amount, and method
                const index = store.index('customerId');
                const request = index.getAll(backupPayment.customerId);

                request.onsuccess = function() {
                    const existingPayments = request.result;
                    
                    const isDuplicate = existingPayments.some(existingPayment => 
                        existingPayment.customerId === backupPayment.customerId &&
                        existingPayment.date === backupPayment.date &&
                        existingPayment.amount === backupPayment.amount &&
                        existingPayment.method === backupPayment.method
                    );

                    if (isDuplicate) {
                        console.log('Skipping duplicate payment for customer:', backupPayment.customerName);
                        resolve(false);
                        return;
                    }

                    const { id, ...paymentData } = backupPayment;
                    const addRequest = store.add(paymentData);
                    
                    addRequest.onsuccess = function() {
                        console.log('Restored payment for customer:', backupPayment.customerName);
                        resolve(true);
                    };
                    addRequest.onerror = function() {
                        console.error('Error restoring payment');
                        resolve(false);
                    };
                };

                request.onerror = function() {
                    console.error('Error checking for duplicate payment');
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in restoreCustomerPayment:', error);
                resolve(false);
            }
        });
    }

    // Helper function to get all data from an object store
    function getAllData(storeName) {
        return new Promise((resolve) => {
            if (!dbInitialized) {
                resolve([]);
                return;
            }

            try {
                // Check if the store exists before trying to access it
                if (!db.objectStoreNames.contains(storeName)) {
                    resolve([]);
                    return;
                }

                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = function () {
                    resolve(request.result || []);
                };

                request.onerror = function () {
                    console.error(`Error getting data from ${storeName}`);
                    resolve([]);
                };
            } catch (error) {
                console.error(`Error in getAllData for ${storeName}:`, error);
                resolve([]);
            }
        });
    }

    // Restore a single bill (skip duplicates)
    async function restoreBill(backupBill) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(['bills'], 'readwrite');
                const store = transaction.objectStore('bills');

                // Check for duplicate bill
                const index = store.index('invoiceNo');
                const request = index.getAll(backupBill.invoiceNo);

                request.onsuccess = function () {
                    const existingBills = request.result;
                    
                    // Check if this exact bill already exists
                    const isDuplicate = existingBills.some(existingBill => 
                        isBillDuplicate(existingBill, backupBill)
                    );

                    if (isDuplicate) {
                        console.log('Skipping duplicate bill:', backupBill.invoiceNo);
                        resolve(false);
                        return;
                    }

                    // Remove ID from backup data to allow auto-increment
                    const { id, ...billData } = backupBill;
                    
                    // Add new bill
                    const addRequest = store.add(billData);
                    addRequest.onsuccess = function () {
                        console.log('Restored bill:', backupBill.invoiceNo);
                        resolve(true);
                    };
                    addRequest.onerror = function () {
                        console.error('Error restoring bill:', backupBill.invoiceNo);
                        resolve(false);
                    };
                };

                request.onerror = function () {
                    console.error('Error checking for duplicate bill');
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in restoreBill:', error);
                resolve(false);
            }
        });
    }

    // Restore a single ledger entry
    async function restoreLedgerEntry(backupLedgerEntry) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(['ledger'], 'readwrite');
                const store = transaction.objectStore('ledger');

                // Check for duplicate ledger entry
                const index = store.index('invoiceNo');
                const request = index.get(backupLedgerEntry.invoiceNo);

                request.onsuccess = function () {
                    if (request.result) {
                        console.log('Skipping duplicate ledger entry:', backupLedgerEntry.invoiceNo);
                        resolve(false);
                        return;
                    }

                    // Remove ID from backup data to allow auto-increment
                    const { id, ...ledgerData } = backupLedgerEntry;
                    
                    // Add new ledger entry
                    const addRequest = store.add(ledgerData);
                    addRequest.onsuccess = function () {
                        console.log('Restored ledger entry:', backupLedgerEntry.invoiceNo);
                        resolve(true);
                    };
                    addRequest.onerror = function () {
                        console.error('Error restoring ledger entry:', backupLedgerEntry.invoiceNo);
                        resolve(false);
                    };
                };

                request.onerror = function () {
                    console.error('Error checking for duplicate ledger entry');
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in restoreLedgerEntry:', error);
                resolve(false);
            }
        });
    }

    // Check if two bills are duplicates
    function isBillDuplicate(bill1, bill2) {
        // Compare key fields that should be unique for a bill
        const keyFields = [
            'invoiceNo', 'date', 'customerName', 'customerGst',
            'transactionType', 'gstPercent'
        ];

        for (const field of keyFields) {
            if (bill1[field] !== bill2[field]) {
                return false;
            }
        }

        // Compare items
        if (bill1.items.length !== bill2.items.length) {
            return false;
        }

        for (let i = 0; i < bill1.items.length; i++) {
            const item1 = bill1.items[i];
            const item2 = bill2.items[i];
            
            if (item1.desc !== item2.desc ||
                item1.hsn !== item2.hsn ||
                item1.qty !== item2.qty ||
                item1.rate !== item2.rate) {
                return false;
            }
        }

        return true;
    }

    // Restore a single customer (skip duplicates by GSTIN)
    async function restoreCustomer(backupCustomer) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(['customers'], 'readwrite');
                const store = transaction.objectStore('customers');

                // Check for duplicate customer by GSTIN
                const index = store.index('gstin');
                const request = index.get(backupCustomer.gstin);

                request.onsuccess = function () {
                    if (request.result) {
                        console.log('Skipping duplicate customer:', backupCustomer.gstin);
                        resolve(false);
                        return;
                    }

                    // Remove ID from backup data to allow auto-increment
                    const { id, ...customerData } = backupCustomer;
                    
                    // Add new customer
                    const addRequest = store.add(customerData);
                    addRequest.onsuccess = function () {
                        console.log('Restored customer:', backupCustomer.gstin);
                        resolve(true);
                    };
                    addRequest.onerror = function () {
                        console.error('Error restoring customer:', backupCustomer.gstin);
                        resolve(false);
                    };
                };

                request.onerror = function () {
                    console.error('Error checking for duplicate customer');
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in restoreCustomer:', error);
                resolve(false);
            }
        });
    }

    // Restore company info
    async function restoreCompanyInfo(backupCompanyInfo) {
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(['companyInfo'], 'readwrite');
                const store = transaction.objectStore('companyInfo');
                
                // Remove ID and use fixed ID 1
                const { id, ...companyData } = backupCompanyInfo;
                companyData.id = 1;
                
                const request = store.put(companyData);
                request.onsuccess = function () {
                    console.log('Restored company info');
                    resolve(true);
                };
                request.onerror = function () {
                    console.error('Error restoring company info');
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in restoreCompanyInfo:', error);
                resolve(false);
            }
        });
    }

    // Generate ledger entry when bill is saved (for future use)
    function generateLedgerEntry(billData, billId) {
        if (!dbInitialized) return;

        try {
            // Calculate bill total
            let billTotal = 0;
            billData.items.forEach(item => {
                const qty = parseFloat(item.qty) || 0;
                const rate = parseFloat(item.rate) || 0;
                billTotal += qty * rate;
            });

            // Apply GST
            const gstPercent = parseFloat(billData.gstPercent) || 0;
            const gstAmount = (billTotal * gstPercent) / 100;
            const grandTotal = Math.round(billTotal + gstAmount);

            const ledgerEntry = {
                billId: billId,
                customerName: billData.customerName,
                customerGst: billData.customerGst,
                invoiceNo: billData.invoiceNo,
                date: billData.date,
                amount: grandTotal,
                type: 'sale',
                status: 'unpaid', // You can modify this based on your needs
                timestamp: new Date().getTime()
            };

            const transaction = db.transaction(['ledger'], 'readwrite');
            const store = transaction.objectStore('ledger');
            store.add(ledgerEntry);
        } catch (error) {
            console.error('Error generating ledger entry:', error);
        }
    }

    // Setup customer suggestions
    function setupCustomerSuggestions() {
        const consigneeNameInput = document.getElementById('consignee-name');
        const suggestionsContainer = document.getElementById('consignee-suggestions');

        consigneeNameInput.addEventListener('input', function () {
            const searchTerm = this.value.trim();
            if (searchTerm.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            searchCustomers(searchTerm).then(customers => {
                suggestionsContainer.innerHTML = '';
                if (customers.length > 0) {
                    customers.forEach(customer => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'customer-suggestion-item';
                        suggestionItem.innerHTML = `
                            <strong>${customer.name}</strong><br>
                            <small>GSTIN: ${customer.gstin} | ${customer.address}</small>
                        `;
                        suggestionItem.addEventListener('click', function () {
                            fillCustomerDetails(customer);
                            suggestionsContainer.style.display = 'none';
                        });
                        suggestionsContainer.appendChild(suggestionItem);
                    });
                    suggestionsContainer.style.display = 'block';
                } else {
                    suggestionsContainer.style.display = 'none';
                }
            });
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function (e) {
            if (!consigneeNameInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    // Search customers
    function searchCustomers(searchTerm) {
        return new Promise((resolve) => {
            if (!dbInitialized) {
                resolve([]);
                return;
            }

            try {
                const transaction = db.transaction(['customers'], 'readonly');
                const store = transaction.objectStore('customers');
                const request = store.getAll();

                request.onsuccess = function () {
                    const customers = request.result;
                    const filteredCustomers = customers.filter(customer =>
                        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        customer.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        customer.address.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    resolve(filteredCustomers);
                };

                request.onerror = function () {
                    resolve([]);
                };
            } catch (error) {
                console.error('Error searching customers:', error);
                resolve([]);
            }
        });
    }

    // Fill customer details
    function fillCustomerDetails(customer) {
        document.getElementById('consignee-name').value = customer.name;
        document.getElementById('consignee-address').value = customer.address;
        document.getElementById('consignee-gst').value = customer.gstin;
        document.getElementById('consignee-state').value = customer.state;
        document.getElementById('consignee-code').value = customer.stateCode;
        document.getElementById('consignee-contact').value = customer.contact || '';

        // If ship to is same as bill to
        if (document.getElementById('customer-type').value === 'both') {
            document.getElementById('buyer-name').value = customer.name;
            document.getElementById('buyer-address').value = customer.address;
            document.getElementById('buyer-gst').value = customer.gstin;
            document.getElementById('buyer-state').value = customer.state;
            document.getElementById('buyer-code').value = customer.stateCode;
            document.getElementById('buyer-contact').value = customer.contact || '';
        }

        saveCurrentSession();
        notificationSystem.success('Customer details filled successfully!');
    }

    // Save customer automatically when generating bill
    function saveCustomerFromBill() {
        if (!dbInitialized) return;

        const customerData = {
            name: document.getElementById('consignee-name').value,
            address: document.getElementById('consignee-address').value,
            gstin: document.getElementById('consignee-gst').value,
            state: document.getElementById('consignee-state').value,
            stateCode: document.getElementById('consignee-code').value,
            contact: document.getElementById('consignee-contact').value,
            timestamp: new Date().getTime()
        };

        // Check if customer already exists
        if (!customerData.name || !customerData.gstin) return;

        try {
            const transaction = db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');

            // Check if customer exists by GSTIN
            const getRequest = store.index('gstin').get(customerData.gstin);

            getRequest.onsuccess = function () {
                if (!getRequest.result) {
                    // Customer doesn't exist, add new one
                    const addRequest = store.add(customerData);
                    addRequest.onsuccess = function () {
                        console.log('Customer saved automatically');
                    };
                }
            };
        } catch (error) {
            console.error('Error saving customer:', error);
        }
    }

    // Load customers for management
    // Load customers for management
function loadCustomers(searchTerm = '') {
    if (!dbInitialized) {
        document.getElementById('customers-list').innerHTML = '<div class="loading-message">Database loading...</div>';
        return;
    }

    try {
        const transaction = db.transaction(['customers'], 'readonly');
        const store = transaction.objectStore('customers');
        const request = store.getAll();

        request.onsuccess = function () {
            const customers = request.result;
            const customersList = document.getElementById('customers-list');
            customersList.innerHTML = '';

            // Filter customers if search term is provided
            const filteredCustomers = searchTerm ?
                customers.filter(customer =>
                    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.gstin.toLowerCase().includes(searchTerm.toLowerCase())
                ) : customers;

            if (filteredCustomers.length === 0) {
                customersList.innerHTML = '<p>No customers found.</p>';
                return;
            }

            filteredCustomers.forEach(customer => {
                const customerItem = document.createElement('div');
                customerItem.className = 'customer-item';
                customerItem.innerHTML = `
                    <div class="customer-details">
                        <strong>${customer.name}</strong>
                        <p>GSTIN: ${customer.gstin}</p>
                        <p>Address: ${customer.address}</p>
                        <p>State: ${customer.state} (${customer.stateCode})</p>
                        ${customer.contact ? `<p>Contact: ${customer.contact}</p>` : ''}
                    </div>
                    <div class="customer-actions">
                        <button class="use-customer-btn" data-id="${customer.id}">
                            <i class="material-icons">person_add</i> Use
                        </button>
                        <button class="payment-action-btn" data-id="${customer.id}" data-name="${customer.name}" data-gstin="${customer.gstin}">
                            <i class="material-icons">payments</i> Payment
                        </button>
                        <button class="delete-customer-btn" data-id="${customer.id}">
                            <i class="material-icons">delete</i> Delete
                        </button>
                    </div>
                `;
                customersList.appendChild(customerItem);
            });

            // Remove any existing event listeners first by cloning and replacing
            const newCustomersList = customersList.cloneNode(true);
            customersList.parentNode.replaceChild(newCustomersList, customersList);

            // Add event listeners to the new element
            newCustomersList.querySelectorAll('.use-customer-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const customerId = parseInt(this.getAttribute('data-id'));
                    useCustomer(customerId);
                });
            });

            newCustomersList.querySelectorAll('.payment-action-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const customerId = parseInt(this.getAttribute('data-id'));
                    const customerName = this.getAttribute('data-name');
                    const customerGstin = this.getAttribute('data-gstin');
                    openPaymentDialog(customerId, customerName, customerGstin);
                });
            });

            newCustomersList.querySelectorAll('.delete-customer-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const customerId = parseInt(this.getAttribute('data-id'));
                    deleteCustomer(customerId);
                });
            });
        };
    } catch (error) {
        console.error('Error loading customers:', error);
        document.getElementById('customers-list').innerHTML = '<p>Error loading customers.</p>';
    }
}

    // Use customer
    function useCustomer(customerId) {
        if (!dbInitialized) return;

        try {
            const transaction = db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.get(customerId);

            request.onsuccess = function () {
                const customer = request.result;
                if (customer) {
                    fillCustomerDetails(customer);
                    // Switch to customer info section
                    document.getElementById('customer-info-toggle').click();
                    notificationSystem.success('Customer details loaded successfully!');
                }
            };
        } catch (error) {
            console.error('Error loading customer:', error);
            notificationSystem.error('Error loading customer. Please try again.');
        }
    }

    // Delete customer
    function deleteCustomer(customerId) {
        if (!dbInitialized) return;

        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                const transaction = db.transaction(['customers'], 'readwrite');
                const store = transaction.objectStore('customers');
                const request = store.delete(customerId);

                request.onsuccess = function () {
                    notificationSystem.success('Customer deleted successfully!');
                    loadCustomers();
                };

                request.onerror = function () {
                    notificationSystem.error('Error deleting customer');
                };
            } catch (error) {
                notificationSystem.error('Error deleting customer: ' + error.message);
            }
        }
    }

    // Payment functionality
    // Payment functionality
function initializePaymentFunctionality() {
    // Payment dialog elements
    const paymentDialog = document.getElementById('payment-dialog');
    const closePaymentDialog = document.getElementById('close-payment-dialog');
    
    // Remove any existing event listeners by cloning and replacing
    const newCloseBtn = closePaymentDialog.cloneNode(true);
    closePaymentDialog.parentNode.replaceChild(newCloseBtn, closePaymentDialog);

    // Close dialog when clicking X or outside
    newCloseBtn.addEventListener('click', closePaymentDialogFunc);
    paymentDialog.addEventListener('click', function(e) {
        if (e.target === paymentDialog) {
            closePaymentDialogFunc();
        }
    });

    // Add payment button - clone and replace to remove duplicate listeners
    const addPaymentBtn = document.getElementById('add-payment-btn');
    const newAddPaymentBtn = addPaymentBtn.cloneNode(true);
    addPaymentBtn.parentNode.replaceChild(newAddPaymentBtn, addPaymentBtn);
    
    newAddPaymentBtn.addEventListener('click', addCustomerPayment);

    // Payment search functionality - clone and replace
    const paymentSearch = document.getElementById('payment-search');
    const newPaymentSearch = paymentSearch.cloneNode(true);
    paymentSearch.parentNode.replaceChild(newPaymentSearch, paymentSearch);

    newPaymentSearch.addEventListener('input', function() {
        if (currentCustomerForPayment) {
            loadCustomerPayments(currentCustomerForPayment.id, this.value);
        }
    });

    // Set default date to today
    document.getElementById('payment-date').valueAsDate = new Date();
}

    // Function to close payment dialog
    function closePaymentDialogFunc() {
        document.getElementById('payment-dialog').classList.remove('active');
        currentCustomerForPayment = null;
        clearPaymentForm();
    }

    // Function to clear payment form
    function clearPaymentForm() {
        document.getElementById('payment-date').valueAsDate = new Date();
        document.getElementById('payment-method').value = 'Cash';
        document.getElementById('payment-amount').value = '';
        document.getElementById('payment-notes').value = '';
    }

    // Function to open payment dialog
    function openPaymentDialog(customerId, customerName, customerGstin) {
        currentCustomerForPayment = {
            id: customerId,
            name: customerName,
            gstin: customerGstin
        };

        // Update dialog title
        document.querySelector('.payment-dialog-header h3').textContent = `Payments - ${customerName}`;
        
        // Load payments for this customer
        loadCustomerPayments(customerId);
        
        // Show dialog
        document.getElementById('payment-dialog').classList.add('active');
    }

    // Function to load customer payments
    // Function to load customer payments
// Function to load customer payments
function loadCustomerPayments(customerId, searchTerm = '') {
    if (!dbInitialized) return;

    try {
        const transaction = db.transaction(['customerPayments'], 'readonly');
        const store = transaction.objectStore('customerPayments');
        const index = store.index('customerId');
        const request = index.getAll(customerId);

        request.onsuccess = function() {
            const payments = request.result;
            const paymentsTbody = document.getElementById('payments-tbody');
            
            // Clone and replace to remove existing event listeners
            const newPaymentsTbody = paymentsTbody.cloneNode(false);
            paymentsTbody.parentNode.replaceChild(newPaymentsTbody, paymentsTbody);

            // Filter payments if search term is provided
            const filteredPayments = searchTerm ? 
                payments.filter(payment => {
                    const searchLower = searchTerm.toLowerCase();
                    
                    // Search in method
                    if (payment.method.toLowerCase().includes(searchLower)) return true;
                    
                    // Search in notes
                    if (payment.notes && payment.notes.toLowerCase().includes(searchLower)) return true;
                    
                    // Search in amount (convert to string for searching)
                    if (payment.amount.toString().includes(searchTerm)) return true;
                    
                    // Search in date (format: YYYY-MM-DD and localized date)
                    const paymentDate = new Date(payment.date);
                    const dateString = paymentDate.toLocaleDateString();
                    const isoDate = payment.date; // Already in YYYY-MM-DD format
                    
                    if (dateString.includes(searchTerm)) return true;
                    if (isoDate.includes(searchTerm)) return true;
                    
                    return false;
                }) : payments;

            if (filteredPayments.length === 0) {
                newPaymentsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No payments found.</td></tr>';
                return;
            }

            // Sort by date (newest first)
            filteredPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

            filteredPayments.forEach(payment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(payment.date).toLocaleDateString()}</td>
                    <td>${payment.method}</td>
                    <td>₹${payment.amount.toFixed(2)}</td>
                    <td>${payment.notes || '-'}</td>
                    <td class="payment-actions">
                        <button class="edit-payment-btn" data-id="${payment.id}">
                            <i class="material-icons">edit</i> Edit
                        </button>
                        <button class="delete-payment-btn" data-id="${payment.id}">
                            <i class="material-icons">delete</i> Delete
                        </button>
                    </td>
                `;
                newPaymentsTbody.appendChild(row);
            });

            // Add event listeners to edit and delete buttons
            newPaymentsTbody.querySelectorAll('.edit-payment-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const paymentId = parseInt(this.getAttribute('data-id'));
                    editPayment(paymentId);
                });
            });

            newPaymentsTbody.querySelectorAll('.delete-payment-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const paymentId = parseInt(this.getAttribute('data-id'));
                    deletePayment(paymentId);
                });
            });
        };
    } catch (error) {
        console.error('Error loading customer payments:', error);
    }
}

    // Function to add customer payment
    function addCustomerPayment() {
        if (!dbInitialized || !currentCustomerForPayment) return;

        const date = document.getElementById('payment-date').value;
        const method = document.getElementById('payment-method').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const notes = document.getElementById('payment-notes').value;

        if (!date || !method || !amount || amount <= 0) {
            notificationSystem.error('Please fill all required fields with valid values.');
            return;
        }

        const paymentData = {
            customerId: currentCustomerForPayment.id,
            customerName: currentCustomerForPayment.name,
            customerGstin: currentCustomerForPayment.gstin,
            date: date,
            method: method,
            amount: amount,
            notes: notes,
            timestamp: new Date().getTime()
        };

        try {
            const transaction = db.transaction(['customerPayments'], 'readwrite');
            const store = transaction.objectStore('customerPayments');
            const request = store.add(paymentData);

            request.onsuccess = function() {
                notificationSystem.success('Payment added successfully!');
                loadCustomerPayments(currentCustomerForPayment.id);
                clearPaymentForm();
                // Refresh ledger if open
                if (document.getElementById('ledger-section').classList.contains('active')) {
                    const searchTerm = document.getElementById('ledger-search').value;
                    if (searchTerm) {
                        loadCustomerLedger(searchTerm);
                    }
                }
            };

            request.onerror = function() {
                notificationSystem.error('Error adding payment. Please try again.');
            };
        } catch (error) {
            console.error('Error adding payment:', error);
            notificationSystem.error('Error adding payment: ' + error.message);
        }
    }

    // Function to edit payment
    // Function to edit payment
function editPayment(paymentId) {
    if (!dbInitialized) return;

    // Remove any existing update button listeners first
    const addBtn = document.getElementById('add-payment-btn');
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);

    // For simplicity, we'll implement a basic edit by pre-filling the form
    try {
        const transaction = db.transaction(['customerPayments'], 'readonly');
        const store = transaction.objectStore('customerPayments');
        const request = store.get(paymentId);

        request.onsuccess = function() {
            const payment = request.result;
            if (payment) {
                document.getElementById('payment-date').value = payment.date;
                document.getElementById('payment-method').value = payment.method;
                document.getElementById('payment-amount').value = payment.amount;
                document.getElementById('payment-notes').value = payment.notes || '';

                // Change add button to update button temporarily
                const updatedAddBtn = document.getElementById('add-payment-btn');
                updatedAddBtn.innerHTML = '<i class="material-icons">save</i> Update Payment';
                updatedAddBtn.onclick = function() {
                    updatePayment(paymentId);
                };
            }
        };
    } catch (error) {
        console.error('Error loading payment for edit:', error);
    }
}

    // Function to update payment
    function updatePayment(paymentId) {
        if (!dbInitialized || !currentCustomerForPayment) return;

        const date = document.getElementById('payment-date').value;
        const method = document.getElementById('payment-method').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const notes = document.getElementById('payment-notes').value;

        if (!date || !method || !amount || amount <= 0) {
            notificationSystem.error('Please fill all required fields with valid values.');
            return;
        }

        const paymentData = {
            id: paymentId,
            customerId: currentCustomerForPayment.id,
            customerName: currentCustomerForPayment.name,
            customerGstin: currentCustomerForPayment.gstin,
            date: date,
            method: method,
            amount: amount,
            notes: notes,
            timestamp: new Date().getTime()
        };

        try {
            const transaction = db.transaction(['customerPayments'], 'readwrite');
            const store = transaction.objectStore('customerPayments');
            const request = store.put(paymentData);

            request.onsuccess = function() {
                notificationSystem.success('Payment updated successfully!');
                loadCustomerPayments(currentCustomerForPayment.id);
                clearPaymentForm();
                
                // Reset add button
                const addBtn = document.getElementById('add-payment-btn');
                addBtn.innerHTML = '<i class="material-icons">add</i> Add Payment';
                addBtn.onclick = addCustomerPayment;

                // Refresh ledger if open
                if (document.getElementById('ledger-section').classList.contains('active')) {
                    const searchTerm = document.getElementById('ledger-search').value;
                    if (searchTerm) {
                        loadCustomerLedger(searchTerm);
                    }
                }
            };

            request.onerror = function() {
                notificationSystem.error('Error updating payment. Please try again.');
            };
        } catch (error) {
            console.error('Error updating payment:', error);
            notificationSystem.error('Error updating payment: ' + error.message);
        }
    }

    // Function to delete payment
    function deletePayment(paymentId) {
        if (!dbInitialized) return;

        if (confirm('Are you sure you want to delete this payment?')) {
            try {
                const transaction = db.transaction(['customerPayments'], 'readwrite');
                const store = transaction.objectStore('customerPayments');
                const request = store.delete(paymentId);

                request.onsuccess = function() {
                    notificationSystem.success('Payment deleted successfully!');
                    loadCustomerPayments(currentCustomerForPayment.id);
                    
                    // Refresh ledger if open
                    if (document.getElementById('ledger-section').classList.contains('active')) {
                        const searchTerm = document.getElementById('ledger-search').value;
                        if (searchTerm) {
                            loadCustomerLedger(searchTerm);
                        }
                    }
                };

                request.onerror = function() {
                    notificationSystem.error('Error deleting payment.');
                };
            } catch (error) {
                console.error('Error deleting payment:', error);
                notificationSystem.error('Error deleting payment: ' + error.message);
            }
        }
    }

    // Save current session data
    function saveCurrentSession() {
        if (!dbInitialized) return;

        const sessionData = {
            id: 1,
            invoiceNo: document.getElementById('invoice-no').value,
            invoiceDate: document.getElementById('invoice-date').value,
            customerType: document.getElementById('customer-type').value,
            consigneeName: document.getElementById('consignee-name').value,
            consigneeAddress: document.getElementById('consignee-address').value,
            consigneeGst: document.getElementById('consignee-gst').value,
            consigneeState: document.getElementById('consignee-state').value,
            consigneeCode: document.getElementById('consignee-code').value,
            consigneeContact: document.getElementById('consignee-contact').value,
            buyerName: document.getElementById('buyer-name').value,
            buyerAddress: document.getElementById('buyer-address').value,
            buyerGst: document.getElementById('buyer-gst').value,
            buyerState: document.getElementById('buyer-state').value,
            buyerCode: document.getElementById('buyer-code').value,
            buyerContact: document.getElementById('buyer-contact').value,
            placeOfSupply: document.getElementById('place-of-supply').value,
            transactionType: document.getElementById('transaction_type').value,
            gstPercent: document.getElementById('gst-percent').value,
            activeSection: getActiveSection(),
            items: []
        };

        // Collect items
        document.querySelectorAll('#items-tbody tr').forEach(row => {
            sessionData.items.push({
                desc: row.querySelector('.item-desc').value,
                hsn: row.querySelector('.item-hsn').value,
                qty: row.querySelector('.item-qty').value,
                rate: row.querySelector('.item-rate').value,
                per: row.querySelector('.item-per').value
            });
        });

        try {
            const transaction = db.transaction(['currentSession'], 'readwrite');
            const store = transaction.objectStore('currentSession');
            const request = store.put(sessionData);

            request.onerror = function () {
                console.error('Error saving session data');
            };
        } catch (error) {
            console.error('Error in saveCurrentSession:', error);
        }
    }

    // Load current session data
    // Load current session data
function loadCurrentSession() {
    if (!dbInitialized) return;

    try {
        const transaction = db.transaction(['currentSession'], 'readonly');
        const store = transaction.objectStore('currentSession');
        const request = store.get(1);

        request.onsuccess = function () {
            if (request.result) {
                const sessionData = request.result;

                // Restore form fields
                document.getElementById('invoice-no').value = sessionData.invoiceNo || '';
                document.getElementById('invoice-date').value = sessionData.invoiceDate || '';
                document.getElementById('customer-type').value = sessionData.customerType || 'bill-to';
                document.getElementById('consignee-name').value = sessionData.consigneeName || '';
                document.getElementById('consignee-address').value = sessionData.consigneeAddress || '';
                document.getElementById('consignee-gst').value = sessionData.consigneeGst || '';
                document.getElementById('consignee-state').value = sessionData.consigneeState || '';
                document.getElementById('consignee-code').value = sessionData.consigneeCode || '';
                document.getElementById('consignee-contact').value = sessionData.consigneeContact || '';
                document.getElementById('buyer-name').value = sessionData.buyerName || '';
                document.getElementById('buyer-address').value = sessionData.buyerAddress || '';
                document.getElementById('buyer-gst').value = sessionData.buyerGst || '';
                document.getElementById('buyer-state').value = sessionData.buyerState || '';
                document.getElementById('buyer-code').value = sessionData.buyerCode || '';
                document.getElementById('buyer-contact').value = sessionData.buyerContact || '';
                document.getElementById('place-of-supply').value = sessionData.placeOfSupply || '';
                document.getElementById('transaction_type').value = sessionData.transactionType || 'intrastate';
                document.getElementById('gst-percent').value = sessionData.gstPercent || '18';

                // Restore items
                const itemsTbody = document.getElementById('items-tbody');
                itemsTbody.innerHTML = '';

                if (sessionData.items && sessionData.items.length > 0) {
                    sessionData.items.forEach(item => {
                        const newRow = document.createElement('tr');
                        newRow.innerHTML = `
                            <td><input type="text" class="item-desc" value="${item.desc}"></td>
                            <td><input type="text" class="item-hsn" value="${item.hsn}"></td>
                            <td><input type="number" class="item-qty" value="${item.qty}"></td>
                            <td><input type="text" class="item-per" value="${item.per}"></td>
                            <td><input type="number" class="item-rate" value="${item.rate}" step="0.01"></td>
                            <td><button class="remove-item-btn">Remove</button></td>
                        `;
                        itemsTbody.appendChild(newRow);

                        // Add event listener to the new remove button
                        newRow.querySelector('.remove-item-btn').addEventListener('click', function () {
                            itemsTbody.removeChild(newRow);
                            saveCurrentSession();
                        });
                    });
                }

                // Update customer type display
                updateCustomerTypeDisplay();

                // Restore active section
                if (sessionData.activeSection) {
                    switchToSection(sessionData.activeSection);
                }
            } else {
                // No session data found, generate initial invoice number
                generateNextInvoiceNumber();
            }
        };

        request.onerror = function () {
            console.error('Error loading session data');
            // Generate initial invoice number if there's an error
            generateNextInvoiceNumber();
        };
    } catch (error) {
        console.error('Error in loadCurrentSession:', error);
        // Generate initial invoice number if there's an error
        generateNextInvoiceNumber();
    }
}

    // Get currently active section
    function getActiveSection() {
        if (document.getElementById('company-info-section').classList.contains('active')) return 'company-info';
        if (document.getElementById('input-section').classList.contains('active')) return 'customer-info';
        if (document.getElementById('bill-section').classList.contains('active')) return 'bill-view';
        if (document.getElementById('saved-bills-section').classList.contains('active')) return 'saved-bills';
        if (document.getElementById('customers-section').classList.contains('active')) return 'customers';
        if (document.getElementById('ledger-section').classList.contains('active')) return 'ledger';
        if (document.getElementById('manage-items-section').classList.contains('active')) return 'manage-items';
        if (document.getElementById('funding-section').classList.contains('active')) return 'funding';
        return 'customer-info'; // Default
    }

    // Switch to a specific section
    function switchToSection(section) {
        switch (section) {
            case 'company-info':
                document.getElementById('company-info-toggle').click();
                break;
            case 'customer-info':
                document.getElementById('customer-info-toggle').click();
                break;
            case 'bill-view':
                document.getElementById('bill-view-toggle').click();
                break;
            case 'saved-bills':
                document.getElementById('saved-bills-toggle').click();
                break;
            case 'customers':
                document.getElementById('manage-customers-btn').click();
                break;
            case 'ledger':
                document.getElementById('ledger-toggle').click();
                break;
            case 'manage-items':
                document.getElementById('manage-items-toggle').click();
                break;
            case 'funding':
                document.getElementById('funding-toggle').click();
                break;
            default:
                document.getElementById('customer-info-toggle').click();
        }
    }

    // Update customer type display based on selection
    function updateCustomerTypeDisplay() {
        const customerType = document.getElementById('customer-type').value;
        const shipToSection = document.getElementById('ship-to-section');
        const billBuyerInfo = document.getElementById('bill-buyer-info');

        if (customerType === 'both') {
            shipToSection.classList.add('active');
            billBuyerInfo.classList.add('active');
        } else {
            shipToSection.classList.remove('active');
            billBuyerInfo.classList.remove('active');
        }
    }

    // Save company info to database
    function saveCompanyInfo() {
        if (!dbInitialized) {
            notificationSystem.error('Database not ready. Please try again.');
            return;
        }

        const companyInfo = {
            id: 1,
            name: document.getElementById('company-name').value,
            address: document.getElementById('company-address').value,
            gst: document.getElementById('company-gst').value,
            mobile: document.getElementById('company-mobile').value,
            email: document.getElementById('company-email').value,
            accountHolder: document.getElementById('account-holder').value,
            accountNumber: document.getElementById('account-number').value,
            ifscCode: document.getElementById('ifsc-code').value,
            branch: document.getElementById('branch').value,
            bankName: document.getElementById('bank-name').value
        };

        try {
            const transaction = db.transaction(['companyInfo'], 'readwrite');
            const store = transaction.objectStore('companyInfo');
            const request = store.put(companyInfo);

            request.onsuccess = function () {
                notificationSystem.success('Company information saved successfully!');
            };

            request.onerror = function () {
                notificationSystem.error('Error saving company information');
            };
        } catch (error) {
            notificationSystem.error('Error saving company information: ' + error.message);
        }
    }

    // Load company info from database
    function loadCompanyInfo() {
        if (!dbInitialized) {
            console.log('Database not ready for loadCompanyInfo');
            return;
        }

        try {
            const transaction = db.transaction(['companyInfo'], 'readonly');
            const store = transaction.objectStore('companyInfo');
            const request = store.get(1);

            request.onsuccess = function () {
                if (request.result) {
                    const companyInfo = request.result;
                    document.getElementById('company-name').value = companyInfo.name || '';
                    document.getElementById('company-address').value = companyInfo.address || '';
                    document.getElementById('company-gst').value = companyInfo.gst || '';
                    document.getElementById('company-mobile').value = companyInfo.mobile || '';
                    document.getElementById('company-email').value = companyInfo.email || '';
                    document.getElementById('account-holder').value = companyInfo.accountHolder || '';
                    document.getElementById('account-number').value = companyInfo.accountNumber || '';
                    document.getElementById('ifsc-code').value = companyInfo.ifscCode || '';
                    document.getElementById('branch').value = companyInfo.branch || '';
                    document.getElementById('bank-name').value = companyInfo.bankName || '';
                }
            };

            request.onerror = function () {
                console.error('Error loading company info');
            };
        } catch (error) {
            console.error('Error in loadCompanyInfo:', error);
        }
    }

    // Save bill to database
    // Save bill to database
function saveBill() {
    if (!dbInitialized) {
        notificationSystem.error('Database not ready. Please try again.');
        return;
    }

    const invoiceNo = document.getElementById('invoice-no').value;
    
    if (!invoiceNo.trim()) {
        notificationSystem.error('Please enter an invoice number.');
        return;
    }

    // Validate required customer fields
    const customerName = document.getElementById('consignee-name').value.trim();
    const customerGst = document.getElementById('consignee-gst').value.trim();
    const customerAddress = document.getElementById('consignee-address').value.trim();
    const customerState = document.getElementById('consignee-state').value.trim();

    if (!customerName) {
        notificationSystem.error('Please enter customer name.');
        return;
    }

    if (!customerGst) {
        notificationSystem.error('Please enter customer GSTIN.');
        return;
    }

    if (!customerAddress) {
        notificationSystem.error('Please enter customer address.');
        return;
    }

    if (!customerState) {
        notificationSystem.error('Please enter customer state name.');
        return;
    }

    // Check for duplicate invoice number
    const transactionCheck = db.transaction(['bills'], 'readonly');
    const storeCheck = transactionCheck.objectStore('bills');
    const indexCheck = storeCheck.index('invoiceNo');
    const requestCheck = indexCheck.getAll(invoiceNo);

    requestCheck.onsuccess = function() {
        const existingBills = requestCheck.result;
        
        if (existingBills.length > 0) {
            notificationSystem.error('Invoice number already exists. Please use a different invoice number.');
            return;
        }

        // Continue with saving if no duplicate found
        const billData = {
            invoiceNo: invoiceNo,
            date: document.getElementById('invoice-date').value,
            customerName: customerName,
            customerAddress: customerAddress,
            customerGst: customerGst,
            customerState: customerState,
            customerCode: document.getElementById('consignee-code').value,
            customerContact: document.getElementById('consignee-contact').value,
            customerType: document.getElementById('customer-type').value,
            buyerName: document.getElementById('buyer-name').value,
            buyerAddress: document.getElementById('buyer-address').value,
            buyerGst: document.getElementById('buyer-gst').value,
            buyerState: document.getElementById('buyer-state').value,
            buyerCode: document.getElementById('buyer-code').value,
            buyerContact: document.getElementById('buyer-contact').value,
            placeOfSupply: document.getElementById('place-of-supply').value,
            items: [],
            transactionType: document.getElementById('transaction_type').value,
            gstPercent: document.getElementById('gst-percent').value,
            timestamp: new Date().getTime()
        };

        // Collect items (with swapped per and rate columns)
        document.querySelectorAll('#items-tbody tr').forEach(row => {
            billData.items.push({
                desc: row.querySelector('.item-desc').value,
                hsn: row.querySelector('.item-hsn').value,
                qty: row.querySelector('.item-qty').value,
                per: row.querySelector('.item-per').value,
                rate: row.querySelector('.item-rate').value
            });
        });

        try {
            const transaction = db.transaction(['bills'], 'readwrite');
            const store = transaction.objectStore('bills');
            const request = store.add(billData);

            request.onsuccess = function (event) {
                const billId = event.target.result;
                console.log('Bill saved successfully! ID:', billId);
                
                // Generate ledger entry for this bill
                generateLedgerEntry(billData, billId);
                
                loadSavedBills();
                notificationSystem.success('Bill saved successfully!');
                
                // Auto-generate next invoice number after successful save
                generateNextInvoiceNumber();
            };

            request.onerror = function () {
                notificationSystem.error('Error saving bill. Please try again.');
            };
        } catch (error) {
            notificationSystem.error('Error saving bill: ' + error.message);
        }
    };

    requestCheck.onerror = function() {
        notificationSystem.error('Error checking for duplicate invoice number. Please try again.');
    };
}

    // Load saved bills from database
function loadSavedBills(searchTerm = '') {
    if (!dbInitialized) {
        document.getElementById('saved-bills-list').innerHTML = '<div class="loading-message">Database loading...</div>';
        return;
    }

    try {
        const transaction = db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');
        const request = store.getAll();

        request.onsuccess = function () {
            const bills = request.result;
            const savedBillsList = document.getElementById('saved-bills-list');
            savedBillsList.innerHTML = '';

            // Filter bills if search term is provided
            const filteredBills = searchTerm ?
                bills.filter(bill =>
                    bill.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    bill.customerName.toLowerCase().includes(searchTerm.toLowerCase())
                ) : bills;

            // Sort bills by invoice number (smallest to highest)
            filteredBills.sort((a, b) => {
                // Convert to numbers if possible, otherwise compare as strings
                const aNum = parseInt(a.invoiceNo);
                const bNum = parseInt(b.invoiceNo);
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                } else {
                    return a.invoiceNo.localeCompare(b.invoiceNo);
                }
            });

            if (filteredBills.length === 0) {
                savedBillsList.innerHTML = '<p>No saved bills found.</p>';
                return;
            }

            filteredBills.forEach(bill => {
                const billItem = document.createElement('div');
                billItem.className = 'saved-bill-item';
                billItem.innerHTML = `
                    <div class="saved-bill-header">
                        <div>
                            <strong>Invoice No: ${bill.invoiceNo}</strong> - ${bill.customerName}
                        </div>
                        <div class="saved-bill-actions">
                            <button class="load-bill-btn" data-id="${bill.id}">Load</button>
                            <button class="edit-bill-btn" data-id="${bill.id}">Edit</button>
                            <button class="delete-bill-btn" data-id="${bill.id}">Delete</button>
                        </div>
                    </div>
                    <div>Date: ${new Date(bill.date).toLocaleDateString()}</div>
                    <div>Items: ${bill.items.length}</div>
                `;
                savedBillsList.appendChild(billItem);
            });

            // Add event listeners to load and delete buttons
            document.querySelectorAll('.load-bill-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const billId = parseInt(this.getAttribute('data-id'));
                    loadBill(billId);
                });
            });

            // Add event listeners to edit buttons
            document.querySelectorAll('.edit-bill-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const billId = parseInt(this.getAttribute('data-id'));
                    editBill(billId);
                });
            });

            document.querySelectorAll('.delete-bill-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const billId = parseInt(this.getAttribute('data-id'));
                    deleteBill(billId);
                });
            });
        };
    } catch (error) {
        console.error('Error in loadSavedBills:', error);
        document.getElementById('saved-bills-list').innerHTML = '<p>Error loading saved bills.</p>';
    }
}



    // Load a specific bill from database
    function loadBill(billId) {
        if (!dbInitialized) {
            notificationSystem.error('Database not ready. Please try again.');
            return;
        }

        try {
            const transaction = db.transaction(['bills'], 'readonly');
            const store = transaction.objectStore('bills');
            const request = store.get(billId);

            request.onsuccess = function () {
                const bill = request.result;
                if (bill) {
                    // Populate form fields with bill data
                    let invoiceNo = bill.invoiceNo;
                    // Remove "INV-" if present for display in form
                    invoiceNo = invoiceNo.replace('INV-', '');
                    document.getElementById('invoice-no').value = invoiceNo;
                    
                    document.getElementById('invoice-date').value = bill.date;
                    document.getElementById('consignee-name').value = bill.customerName;
                    document.getElementById('consignee-address').value = bill.customerAddress;
                    document.getElementById('consignee-gst').value = bill.customerGst;
                    document.getElementById('consignee-state').value = bill.customerState;
                    document.getElementById('consignee-code').value = bill.customerCode;
                    document.getElementById('consignee-contact').value = bill.customerContact;
                    document.getElementById('customer-type').value = bill.customerType || 'bill-to';
                    document.getElementById('buyer-name').value = bill.buyerName || '';
                    document.getElementById('buyer-address').value = bill.buyerAddress || '';
                    document.getElementById('buyer-gst').value = bill.buyerGst || '';
                    document.getElementById('buyer-state').value = bill.buyerState || '';
                    document.getElementById('buyer-code').value = bill.buyerCode || '';
                    document.getElementById('buyer-contact').value = bill.buyerContact || '';
                    document.getElementById('place-of-supply').value = bill.placeOfSupply || '';
                    document.getElementById('transaction_type').value = bill.transactionType;
                    document.getElementById('gst-percent').value = bill.gstPercent;

                    // Clear existing items
                    const itemsTbody = document.getElementById('items-tbody');
                    itemsTbody.innerHTML = '';

                    // Add items from bill (with swapped per and rate columns)
                    bill.items.forEach(item => {
                        const newRow = document.createElement('tr');
                        newRow.innerHTML = `
                            <td><input type="text" class="item-desc" value="${item.desc}"></td>
                            <td><input type="text" class="item-hsn" value="${item.hsn}"></td>
                            <td><input type="number" class="item-qty" value="${item.qty}"></td>
                            <td><input type="text" class="item-per" value="${item.per}"></td>
                            <td><input type="number" class="item-rate" value="${item.rate}" step="0.01"></td>
                            <td><button class="remove-item-btn">Remove</button></td>
                        `;
                        itemsTbody.appendChild(newRow);

                        // Add event listener to the new remove button
                        newRow.querySelector('.remove-item-btn').addEventListener('click', function () {
                            itemsTbody.removeChild(newRow);
                            saveCurrentSession();
                        });
                    });

                    // Update customer type display
                    updateCustomerTypeDisplay();

                    // Switch to customer info section
                    document.getElementById('customer-info-toggle').click();
                    console.log('Bill loaded successfully!');

                    // Save the loaded state as current session
                    saveCurrentSession();
                    notificationSystem.success('Bill loaded successfully!');
                }
            };
        } catch (error) {
            notificationSystem.error('Error loading bill: ' + error.message);
        }
    }

    // Edit a bill from database
function editBill(billId) {
    if (!dbInitialized) {
        notificationSystem.error('Database not ready. Please try again.');
        return;
    }

    try {
        const transaction = db.transaction(['bills'], 'readonly');
        const store = transaction.objectStore('bills');
        const request = store.get(billId);

        request.onsuccess = function () {
            const bill = request.result;
            if (bill) {
                // Populate form fields with bill data
                let invoiceNo = bill.invoiceNo;
                // Remove "INV-" if present for display in form
                invoiceNo = invoiceNo.replace('INV-', '');
                document.getElementById('invoice-no').value = invoiceNo;
                
                document.getElementById('invoice-date').value = bill.date;
                document.getElementById('consignee-name').value = bill.customerName;
                document.getElementById('consignee-address').value = bill.customerAddress;
                document.getElementById('consignee-gst').value = bill.customerGst;
                document.getElementById('consignee-state').value = bill.customerState;
                document.getElementById('consignee-code').value = bill.customerCode;
                document.getElementById('consignee-contact').value = bill.customerContact;
                document.getElementById('customer-type').value = bill.customerType || 'bill-to';
                document.getElementById('buyer-name').value = bill.buyerName || '';
                document.getElementById('buyer-address').value = bill.buyerAddress || '';
                document.getElementById('buyer-gst').value = bill.buyerGst || '';
                document.getElementById('buyer-state').value = bill.buyerState || '';
                document.getElementById('buyer-code').value = bill.buyerCode || '';
                document.getElementById('buyer-contact').value = bill.buyerContact || '';
                document.getElementById('place-of-supply').value = bill.placeOfSupply || '';
                document.getElementById('transaction_type').value = bill.transactionType;
                document.getElementById('gst-percent').value = bill.gstPercent;

                // Clear existing items
                const itemsTbody = document.getElementById('items-tbody');
                itemsTbody.innerHTML = '';

                // Add items from bill (with swapped per and rate columns)
                bill.items.forEach(item => {
                    const newRow = document.createElement('tr');
                    newRow.innerHTML = `
                        <td><input type="text" class="item-desc" value="${item.desc}"></td>
                        <td><input type="text" class="item-hsn" value="${item.hsn}"></td>
                        <td><input type="number" class="item-qty" value="${item.qty}"></td>
                        <td><input type="text" class="item-per" value="${item.per}"></td>
                        <td><input type="number" class="item-rate" value="${item.rate}" step="0.01"></td>
                        <td><button class="remove-item-btn">Remove</button></td>
                    `;
                    itemsTbody.appendChild(newRow);

                    // Add event listener to the new remove button
                    newRow.querySelector('.remove-item-btn').addEventListener('click', function () {
                        itemsTbody.removeChild(newRow);
                        saveCurrentSession();
                    });
                });

                // Update customer type display
                updateCustomerTypeDisplay();

                // Switch to customer info section
                document.getElementById('customer-info-toggle').click();
                
                // Change generate button to update button
                const generateBtn = document.getElementById('generate-bill');
                generateBtn.innerHTML = '<i class="material-icons">save</i> Update Bill';
                generateBtn.onclick = function() {
                    updateBill(billId);
                };

                // Save the loaded state as current session
                saveCurrentSession();
                notificationSystem.success('Bill loaded for editing! Click "Update Bill" to save changes.');
            }
        };
    } catch (error) {
        notificationSystem.error('Error loading bill for editing: ' + error.message);
    }
}

// Update bill in database
function updateBill(billId) {
    if (!dbInitialized) {
        notificationSystem.error('Database not ready. Please try again.');
        return;
    }

    const invoiceNo = document.getElementById('invoice-no').value;
    
    if (!invoiceNo.trim()) {
        notificationSystem.error('Please enter an invoice number.');
        return;
    }

    // Validate required customer fields
    const customerName = document.getElementById('consignee-name').value.trim();
    const customerGst = document.getElementById('consignee-gst').value.trim();
    const customerAddress = document.getElementById('consignee-address').value.trim();
    const customerState = document.getElementById('consignee-state').value.trim();

    if (!customerName) {
        notificationSystem.error('Please enter customer name.');
        return;
    }

    if (!customerGst) {
        notificationSystem.error('Please enter customer GSTIN.');
        return;
    }

    if (!customerAddress) {
        notificationSystem.error('Please enter customer address.');
        return;
    }

    if (!customerState) {
        notificationSystem.error('Please enter customer state name.');
        return;
    }

    const billData = {
        id: billId,
        invoiceNo: invoiceNo,
        date: document.getElementById('invoice-date').value,
        customerName: customerName,
        customerAddress: customerAddress,
        customerGst: customerGst,
        customerState: customerState,
        customerCode: document.getElementById('consignee-code').value,
        customerContact: document.getElementById('consignee-contact').value,
        customerType: document.getElementById('customer-type').value,
        buyerName: document.getElementById('buyer-name').value,
        buyerAddress: document.getElementById('buyer-address').value,
        buyerGst: document.getElementById('buyer-gst').value,
        buyerState: document.getElementById('buyer-state').value,
        buyerCode: document.getElementById('buyer-code').value,
        buyerContact: document.getElementById('buyer-contact').value,
        placeOfSupply: document.getElementById('place-of-supply').value,
        items: [],
        transactionType: document.getElementById('transaction_type').value,
        gstPercent: document.getElementById('gst-percent').value,
        timestamp: new Date().getTime()
    };

    // Collect items (with swapped per and rate columns)
    document.querySelectorAll('#items-tbody tr').forEach(row => {
        billData.items.push({
            desc: row.querySelector('.item-desc').value,
            hsn: row.querySelector('.item-hsn').value,
            qty: row.querySelector('.item-qty').value,
            per: row.querySelector('.item-per').value,
            rate: row.querySelector('.item-rate').value
        });
    });

    try {
        const transaction = db.transaction(['bills'], 'readwrite');
        const store = transaction.objectStore('bills');
        const request = store.put(billData);

        request.onsuccess = function () {
            console.log('Bill updated successfully! ID:', billId);
            
            // Reset generate button back to normal
            const generateBtn = document.getElementById('generate-bill');
            generateBtn.innerHTML = '<i class="material-icons">receipt</i> Generate Bill';
            generateBtn.onclick = function() {
                // Save customer automatically when generating bill
                saveCustomerFromBill();
                generateBill();
                document.getElementById('bill-view-toggle').click();
            };

            loadSavedBills();
            notificationSystem.success('Bill updated successfully!');
        };

        request.onerror = function () {
            notificationSystem.error('Error updating bill. Please try again.');
        };
    } catch (error) {
        notificationSystem.error('Error updating bill: ' + error.message);
    }
}

    // Delete a bill from database
    function deleteBill(billId) {
        if (!dbInitialized) {
            notificationSystem.error('Database not ready. Please try again.');
            return;
        }

        if (confirm('Are you sure you want to delete this bill?')) {
            try {
                const transaction = db.transaction(['bills'], 'readwrite');
                const store = transaction.objectStore('bills');
                const request = store.delete(billId);

                request.onsuccess = function () {
                    notificationSystem.success('Bill deleted successfully!');
                    loadSavedBills();
                };

                request.onerror = function () {
                    notificationSystem.error('Error deleting bill');
                };
            } catch (error) {
                notificationSystem.error('Error deleting bill: ' + error.message);
            }
        }
    }

    // Toggle between sections
    const companyInfoToggle = document.getElementById('company-info-toggle');
    const customerInfoToggle = document.getElementById('customer-info-toggle');
    const billViewToggle = document.getElementById('bill-view-toggle');
    const savedBillsToggle = document.getElementById('saved-bills-toggle');
    const manageCustomersBtn = document.getElementById('manage-customers-btn');
    const ledgerToggle = document.getElementById('ledger-toggle');
    const manageItemsToggle = document.getElementById('manage-items-toggle');
    const fundingToggle = document.getElementById('funding-toggle');

    const companyInfoSection = document.getElementById('company-info-section');
    const inputSection = document.getElementById('input-section');
    const billSection = document.getElementById('bill-section');
    const savedBillsSection = document.getElementById('saved-bills-section');
    const customersSection = document.getElementById('customers-section');
    const ledgerSection = document.getElementById('ledger-section');
    const manageItemsSection = document.getElementById('manage-items-section');
    const fundingSection = document.getElementById('funding-section');

    companyInfoToggle.addEventListener('click', function () {
        companyInfoSection.classList.add('active');
        inputSection.classList.remove('active');
        billSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        customersSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        manageItemsSection.classList.remove('active');
        fundingSection.classList.remove('active');

        companyInfoToggle.classList.add('active');
        customerInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        ledgerToggle.classList.remove('active');
        manageItemsToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        if (dbInitialized) {
            loadCompanyInfo();
        }
        saveCurrentSession();
    });

    customerInfoToggle.addEventListener('click', function () {
        inputSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        billSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        customersSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        manageItemsSection.classList.remove('active');
        fundingSection.classList.remove('active');

        customerInfoToggle.classList.add('active');
        companyInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        ledgerToggle.classList.remove('active');
        manageItemsToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        saveCurrentSession();
    });

    billViewToggle.addEventListener('click', function () {
        billSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        inputSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        customersSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        manageItemsSection.classList.remove('active');
        fundingSection.classList.remove('active');

        billViewToggle.classList.add('active');
        companyInfoToggle.classList.remove('active');
        customerInfoToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        ledgerToggle.classList.remove('active');
        manageItemsToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        generateBill();
        saveCurrentSession();
    });

    savedBillsToggle.addEventListener('click', function () {
        savedBillsSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        inputSection.classList.remove('active');
        billSection.classList.remove('active');
        customersSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        manageItemsSection.classList.remove('active');
        fundingSection.classList.remove('active');

        savedBillsToggle.classList.add('active');
        companyInfoToggle.classList.remove('active');
        customerInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        ledgerToggle.classList.remove('active');
        manageItemsToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        if (dbInitialized) {
            loadSavedBills();
        }
        saveCurrentSession();
    });

    manageCustomersBtn.addEventListener('click', function () {
        customersSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        inputSection.classList.remove('active');
        billSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        manageItemsSection.classList.remove('active');
        fundingSection.classList.remove('active');

        manageCustomersBtn.classList.add('active');
        companyInfoToggle.classList.remove('active');
        customerInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        ledgerToggle.classList.remove('active');
        manageItemsToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        if (dbInitialized) {
            loadCustomers();
        }
        saveCurrentSession();
    });

    // Ledger toggle functionality
    ledgerToggle.addEventListener('click', function () {
        ledgerSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        inputSection.classList.remove('active');
        billSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        customersSection.classList.remove('active');
        manageItemsSection.classList.remove('active');
        fundingSection.classList.remove('active');

        ledgerToggle.classList.add('active');
        companyInfoToggle.classList.remove('active');
        customerInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        manageItemsToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        saveCurrentSession();
    });

    // Manage Items toggle functionality
    manageItemsToggle.addEventListener('click', function () {
        manageItemsSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        inputSection.classList.remove('active');
        billSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        customersSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        fundingSection.classList.remove('active');

        manageItemsToggle.classList.add('active');
        companyInfoToggle.classList.remove('active');
        customerInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        ledgerToggle.classList.remove('active');
        fundingToggle.classList.remove('active');

        if (dbInitialized) {
            loadItems();
        }
        saveCurrentSession();
    });

    // Funding toggle functionality
    fundingToggle.addEventListener('click', function () {
        fundingSection.classList.add('active');
        companyInfoSection.classList.remove('active');
        inputSection.classList.remove('active');
        billSection.classList.remove('active');
        savedBillsSection.classList.remove('active');
        customersSection.classList.remove('active');
        ledgerSection.classList.remove('active');
        manageItemsSection.classList.remove('active');

        fundingToggle.classList.add('active');
        companyInfoToggle.classList.remove('active');
        customerInfoToggle.classList.remove('active');
        billViewToggle.classList.remove('active');
        savedBillsToggle.classList.remove('active');
        manageCustomersBtn.classList.remove('active');
        ledgerToggle.classList.remove('active');
        manageItemsToggle.classList.remove('active');

        loadDonors();
        saveCurrentSession();
    });

    // Save bill button
    document.getElementById('save-bill-btn').addEventListener('click', function () {
        if (dbInitialized) {
            saveBill();
        } else {
            notificationSystem.error('Database not ready. Please try again.');
        }
    });

    // Save company info button
    document.getElementById('save-company-info').addEventListener('click', function () {
        if (dbInitialized) {
            saveCompanyInfo();
        } else {
            notificationSystem.error('Database not ready. Please try again.');
        }
    });

    // Search saved bills
    document.getElementById('saved-bills-search').addEventListener('input', function () {
        if (dbInitialized) {
            loadSavedBills(this.value);
        }
    });

    // Search customers
    document.getElementById('customers-search').addEventListener('input', function () {
        if (dbInitialized) {
            loadCustomers(this.value);
        }
    });

    // Search ledger
    document.getElementById('ledger-search').addEventListener('input', function () {
        if (dbInitialized) {
            loadCustomerLedger(this.value);
        }
    });

    // Search items
    document.getElementById('items-search').addEventListener('input', function () {
        if (dbInitialized) {
            loadItems(this.value);
        }
    });

    // Customer type selector
    const customerType = document.getElementById('customer-type');
    customerType.addEventListener('change', function () {
        updateCustomerTypeDisplay();
        saveCurrentSession();
    });

    // Add item functionality
    const addItemBtn = document.getElementById('add-item');
    const itemsTbody = document.getElementById('items-tbody');

    addItemBtn.addEventListener('click', function () {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" class="item-desc" placeholder="Item Description"></td>
            <td><input type="text" class="item-hsn" placeholder="HSN/SAC"></td>
            <td><input type="number" class="item-qty" placeholder="Quantity" value="1"></td>
            <td><input type="text" class="item-per" placeholder="Per" value="NOS"></td>
            <td><input type="number" class="item-rate" placeholder="Rate" step="0.01"></td>
            <td><button class="remove-item-btn">Remove</button></td>
        `;
        itemsTbody.appendChild(newRow);

        // Add event listener to the new remove button
        newRow.querySelector('.remove-item-btn').addEventListener('click', function () {
            itemsTbody.removeChild(newRow);
            saveCurrentSession();
        });

        // Setup item suggestions for the new row
        setupItemSuggestionsForRow(newRow);

        saveCurrentSession();
    });

    // Add event listeners to existing remove buttons
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            itemsTbody.removeChild(row);
            saveCurrentSession();
        });
    });

    // Add event listeners to form fields to auto-save session
    const formFields = [
        'invoice-no', 'invoice-date', 'consignee-name', 'consignee-address',
        'consignee-gst', 'consignee-state', 'consignee-code', 'consignee-contact',
        'buyer-name', 'buyer-address', 'buyer-gst', 'buyer-state', 'buyer-code',
        'buyer-contact', 'place-of-supply', 'transaction_type', 'gst-percent',
        'company-name', 'company-address', 'company-gst', 'company-mobile',
        'company-email', 'account-holder', 'account-number', 'ifsc-code',
        'branch', 'bank-name'
    ];

    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', saveCurrentSession);
            if (field.tagName === 'SELECT') {
                field.addEventListener('change', saveCurrentSession);
            }
        }
    });

    // Add event listeners to item fields
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('item-desc') ||
            e.target.classList.contains('item-hsn') ||
            e.target.classList.contains('item-qty') ||
            e.target.classList.contains('item-per') ||
            e.target.classList.contains('item-rate')) {
            saveCurrentSession();
        }
    });

    // Generate bill functionality
    const generateBillBtn = document.getElementById('generate-bill');
    const editBillBtn = document.getElementById('edit-bill');
    const printBillBtn = document.getElementById('print-bill');

    generateBillBtn.addEventListener('click', function () {
        // Save customer automatically when generating bill
        saveCustomerFromBill();
        generateBill();
        billViewToggle.click();
    });

    editBillBtn.addEventListener('click', function () {
        customerInfoToggle.click();
    });

    printBillBtn.addEventListener('click', function () {
        window.print();
    });

    // Function to generate the bill
    function generateBill() {
        // Update company information
        const companyName = document.getElementById('company-name').value;
        document.getElementById('bill-company-name').textContent = companyName;
        document.getElementById('bill-company-address').textContent = document.getElementById('company-address').value;
        document.getElementById('bill-company-gst').textContent = document.getElementById('company-gst').value;
        document.getElementById('bill-company-mobile').textContent = document.getElementById('company-mobile').value;
        document.getElementById('bill-company-email').textContent = document.getElementById('company-email').value;

        // Update signatory text with company name
        document.getElementById('bill-company-signatory').textContent = `for ${companyName.toUpperCase()}`;

        // Update banking details
        document.getElementById('bill-account-holder').textContent = document.getElementById('account-holder').value;
        document.getElementById('bill-account-number').textContent = document.getElementById('account-number').value;
        document.getElementById('bill-ifsc-code').textContent = document.getElementById('ifsc-code').value;
        document.getElementById('bill-branch').textContent = document.getElementById('branch').value;
        document.getElementById('bill-bank-name').textContent = document.getElementById('bank-name').value;

        // Update invoice number and date (remove "INV-" prefix)
        let invoiceNo = document.getElementById('invoice-no').value;
        // Remove "INV-" if present
        invoiceNo = invoiceNo.replace('INV-', '');
        document.getElementById('bill-invoice-no').textContent = invoiceNo;

        const date = new Date(document.getElementById('invoice-date').value);
        const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).toUpperCase();
        document.getElementById('bill-date').textContent = formattedDate;

        // Update consignee information
        document.getElementById('bill-consignee-name').textContent = document.getElementById('consignee-name').value;
        document.getElementById('bill-consignee-address').textContent = document.getElementById('consignee-address').value;
        document.getElementById('bill-consignee-gst').textContent = document.getElementById('consignee-gst').value;
        document.getElementById('bill-consignee-state').textContent = document.getElementById('consignee-state').value;
        document.getElementById('bill-consignee-code').textContent = document.getElementById('consignee-code').value;
        document.getElementById('bill-consignee-contact').textContent = document.getElementById('consignee-contact').value;

        // Update buyer information if applicable
        const customerTypeValue = document.getElementById('customer-type').value;
        const billBuyerInfo = document.getElementById('bill-buyer-info');

        if (customerTypeValue === 'both') {
            document.getElementById('bill-buyer-name').textContent = document.getElementById('buyer-name').value;
            document.getElementById('bill-buyer-address').textContent = document.getElementById('buyer-address').value;
            document.getElementById('bill-buyer-gst').textContent = document.getElementById('buyer-gst').value;
            document.getElementById('bill-buyer-state').textContent = document.getElementById('buyer-state').value;
            document.getElementById('bill-buyer-code').textContent = document.getElementById('buyer-code').value;
            document.getElementById('bill-buyer-contact').textContent = document.getElementById('buyer-contact').value;
            document.getElementById('bill-place-of-supply').textContent = document.getElementById('place-of-supply').value;
            billBuyerInfo.classList.add('active');
        } else {
            billBuyerInfo.classList.remove('active');
        }

        // Generate items table (with swapped per and rate columns)
        const billItemsTbody = document.getElementById('bill-items-tbody');
        billItemsTbody.innerHTML = '';

        const items = document.querySelectorAll('#items-tbody tr');
        let totalAmount = 0;

        items.forEach((item, index) => {
            const desc = item.querySelector('.item-desc').value;
            const hsn = item.querySelector('.item-hsn').value;
            const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
            const per = item.querySelector('.item-per').value;
            const rate = parseFloat(item.querySelector('.item-rate').value) || 0;
            const amount = qty * rate;
            totalAmount += amount;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${desc}</td>
                <td>${hsn}</td>
                <td>${qty}</td>
                <td>${per}</td>
                <td>${rate.toFixed(2)}</td>
                <td>${amount.toFixed(2)}</td>
            `;
            billItemsTbody.appendChild(row);
        });

        // Calculate totals and taxes
        const gstPercent = parseFloat(document.getElementById('gst-percent').value) || 0;
        const transactionType = document.getElementById('transaction_type').value;

        let cgstRate = 0;
        let sgstRate = 0;
        let igstRate = 0;

        if (transactionType === 'intrastate') {
            cgstRate = gstPercent / 2;
            sgstRate = gstPercent / 2;
        } else {
            igstRate = gstPercent;
        }

        const cgstAmount = (totalAmount * cgstRate) / 100;
        const sgstAmount = (totalAmount * sgstRate) / 100;
        const igstAmount = (totalAmount * igstRate) / 100;
        const grandTotalTaxAmount = cgstAmount + sgstAmount + igstAmount;
        const grandTotal = Math.round(totalAmount + grandTotalTaxAmount);

        // Update totals table
        const totalsTable = document.getElementById('bill-totals-table');
        totalsTable.innerHTML = `
            <tr>
                <td>Sub Total</td>
                <td>${totalAmount.toFixed(2)}</td>
            </tr>
            ${transactionType === 'intrastate' ? `
            <tr>
                <td>CGST</td>
                <td>${cgstAmount.toFixed(2)}</td>
            </tr>
            <tr>
                <td>SGST</td>
                <td>${sgstAmount.toFixed(2)}</td>
            </tr>
            ` : `
            <tr>
                <td> IGST (${gstPercent}%)</td>
                <td>${igstAmount.toFixed(2)}</td>
            </tr>
            `}
            <tr>
                <td><strong>Grand Total</strong></td>
                <td><strong>${grandTotal.toFixed(2)}</strong></td>
            </tr>
        `;

        // Update tax table
        const taxTbody = document.getElementById('bill-tax-tbody');
        taxTbody.innerHTML = '';

        // Group by HSN
        const hsnMap = {};
        let totalTaxableValue = 0;
        let totalCgstAmount = 0;
        let totalSgstAmount = 0;
        let totalIgstAmount = 0;

        items.forEach(item => {
            const hsn = item.querySelector('.item-hsn').value;
            const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
            const rate = parseFloat(item.querySelector('.item-rate').value) || 0;
            const amount = qty * rate;

            if (!hsnMap[hsn]) {
                hsnMap[hsn] = {
                    taxableValue: 0,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0
                };
            }

            hsnMap[hsn].taxableValue += amount;
            hsnMap[hsn].cgstAmount += (amount * cgstRate) / 100;
            hsnMap[hsn].sgstAmount += (amount * sgstRate) / 100;
            hsnMap[hsn].igstAmount += (amount * igstRate) / 100;

            // Accumulate totals
            totalTaxableValue += amount;
            totalCgstAmount += (amount * cgstRate) / 100;
            totalSgstAmount += (amount * sgstRate) / 100;
            totalIgstAmount += (amount * igstRate) / 100;
        });

        Object.keys(hsnMap).forEach(hsn => {
            const data = hsnMap[hsn];
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${hsn}</td>
                <td>${data.taxableValue.toFixed(2)}</td>
                <td>${cgstRate.toFixed(2)}%</td>
                <td>${data.cgstAmount.toFixed(2)}</td>
                <td>${sgstRate.toFixed(2)}%</td>
                <td>${data.sgstAmount.toFixed(2)}</td>
                <td>${(data.cgstAmount + data.sgstAmount + data.igstAmount).toFixed(2)}</td>
            `;

            taxTbody.appendChild(row);
        });

        // Add totals row
        const finalTotalTaxAmount = totalCgstAmount + totalSgstAmount + totalIgstAmount;
        const totalsRow = document.createElement('tr');
        totalsRow.id = 'tax-section-totals';
        totalsRow.innerHTML = `
            <td class="align-center"><strong>TOTAL</strong></td>
            <td class="align-center"><strong>${totalTaxableValue.toFixed(2)}</strong></td>
            <td></td>
            <td class="align-center"><strong>${totalCgstAmount.toFixed(2)}</strong></td>
            <td></td>
            <td class="align-center"><strong>${totalSgstAmount.toFixed(2)}</strong></td>
            <td class="align-center"><strong>${finalTotalTaxAmount.toFixed(2)}</strong></td>
        `;
        taxTbody.appendChild(totalsRow);

        // Update amount in words
        document.getElementById('bill-amount-words').textContent = convertToWords(grandTotal);
    }

    // Function to convert number to words
    function convertToWords(num) {
        // Round to nearest integer
        const roundedNum = Math.round(num);

        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if (num === 0) return 'Rupees Zero Only';

        function convertHundreds(n) {
            if (n === 0) return '';
            let result = '';

            if (n >= 100) {
                result += ones[Math.floor(n / 100)] + ' Hundred ';
                n %= 100;
            }

            if (n >= 20) {
                result += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
            } else if (n >= 10) {
                result += teens[n - 10] + ' ';
                n = 0;
            }

            if (n > 0) {
                result += ones[n] + ' ';
            }

            return result.trim();
        }

        let result = 'Rupees ';
        let n = roundedNum;

        if (n >= 10000000) {
            result += convertHundreds(Math.floor(n / 10000000)) + ' Crore ';
            n %= 10000000;
        }

        if (n >= 100000) {
            result += convertHundreds(Math.floor(n / 100000)) + ' Lakh ';
            n %= 100000;
        }

        if (n >= 1000) {
            result += convertHundreds(Math.floor(n / 1000)) + ' Thousand ';
            n %= 1000;
        }

        if (n > 0) {
            result += convertHundreds(n);
        }

        return result.trim() + ' Only';
    }

    // Funding functionality
    function loadDonors(filter = 'latest') {
        const donorsTbody = document.getElementById('donors-tbody');
        donorsTbody.innerHTML = '';

        let sortedDonors = [...sampleDonors];

        switch (filter) {
            case 'latest':
                sortedDonors.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'highest':
                sortedDonors.sort((a, b) => b.amount - a.amount);
                break;
            case 'lowest':
                sortedDonors.sort((a, b) => a.amount - b.amount);
                break;
        }

        sortedDonors.forEach(donor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${donor.name}</td>
                <td>${new Date(donor.date).toLocaleDateString()}</td>
                <td>${donor.occupation}</td>
                <td>${donor.state}</td>
                <td>₹${donor.amount.toLocaleString()}</td>
            `;
            donorsTbody.appendChild(row);
        });
    }

    // Add donors filter functionality
    document.getElementById('donors-filter').addEventListener('change', function() {
        loadDonors(this.value);
    });
});
