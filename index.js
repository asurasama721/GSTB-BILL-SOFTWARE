// Global database variable
        let db = null;
        let dbInitialized = false;

        document.addEventListener('DOMContentLoaded', function () {
            // Database setup
            const dbName = "BillingSoftwareDB";
            const dbVersion = 3; // Incremented version for customers schema

            // Open database
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = function (event) {
                console.error("Database error: " + event.target.errorCode);
                console.log('Error opening database. Some features may not work properly.');
            };

            request.onsuccess = function (event) {
                db = event.target.result;
                dbInitialized = true;
                console.log("Database opened successfully");

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
            };

            // Initialize the application after database is ready
            function initializeApplication() {
                if (!dbInitialized) {
                    console.log('Database not ready yet, waiting...');
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
                                    <button class="delete-customer-btn" data-id="${customer.id}">
                                        <i class="material-icons">delete</i> Delete
                                    </button>
                                </div>
                            `;
                            customersList.appendChild(customerItem);
                        });

                        // Add event listeners
                        document.querySelectorAll('.use-customer-btn').forEach(button => {
                            button.addEventListener('click', function () {
                                const customerId = parseInt(this.getAttribute('data-id'));
                                useCustomer(customerId);
                            });
                        });

                        document.querySelectorAll('.delete-customer-btn').forEach(button => {
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
                        }
                    };
                } catch (error) {
                    console.error('Error loading customer:', error);
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
                            console.log('Customer deleted successfully!');
                            loadCustomers();
                        };

                        request.onerror = function () {
                            console.log('Error deleting customer');
                        };
                    } catch (error) {
                        console.log('Error deleting customer: ' + error.message);
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
                        }
                    };
                } catch (error) {
                    console.error('Error in loadCurrentSession:', error);
                }
            }

            // Get currently active section
            function getActiveSection() {
                if (document.getElementById('company-info-section').classList.contains('active')) return 'company-info';
                if (document.getElementById('input-section').classList.contains('active')) return 'customer-info';
                if (document.getElementById('bill-section').classList.contains('active')) return 'bill-view';
                if (document.getElementById('saved-bills-section').classList.contains('active')) return 'saved-bills';
                if (document.getElementById('customers-section').classList.contains('active')) return 'customers';
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
                    console.log('Database not ready. Please try again.');
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
                        console.log('Company information saved successfully!');
                    };

                    request.onerror = function () {
                        console.log('Error saving company information');
                    };
                } catch (error) {
                    console.log('Error saving company information: ' + error.message);
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
            function saveBill() {
                if (!dbInitialized) {
                    console.log('Database not ready. Please try again.');
                    return;
                }

                const billData = {
                    invoiceNo: document.getElementById('invoice-no').value,
                    date: document.getElementById('invoice-date').value,
                    customerName: document.getElementById('consignee-name').value,
                    customerAddress: document.getElementById('consignee-address').value,
                    customerGst: document.getElementById('consignee-gst').value,
                    customerState: document.getElementById('consignee-state').value,
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

                    request.onsuccess = function () {
                        console.log('Bill saved successfully!');
                        loadSavedBills();
                    };

                    request.onerror = function () {
                        console.log('Error saving bill');
                    };
                } catch (error) {
                    console.log('Error saving bill: ' + error.message);
                }
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
                    console.log('Database not ready. Please try again.');
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
                            document.getElementById('invoice-no').value = bill.invoiceNo;
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
                        }
                    };
                } catch (error) {
                    console.log('Error loading bill: ' + error.message);
                }
            }

            // Delete a bill from database
            function deleteBill(billId) {
                if (!dbInitialized) {
                    console.log('Database not ready. Please try again.');
                    return;
                }

                if (confirm('Are you sure you want to delete this bill?')) {
                    try {
                        const transaction = db.transaction(['bills'], 'readwrite');
                        const store = transaction.objectStore('bills');
                        const request = store.delete(billId);

                        request.onsuccess = function () {
                            console.log('Bill deleted successfully!');
                            loadSavedBills();
                        };

                        request.onerror = function () {
                            console.log('Error deleting bill');
                        };
                    } catch (error) {
                        console.log('Error deleting bill: ' + error.message);
                    }
                }
            }

            // Toggle between sections
            const companyInfoToggle = document.getElementById('company-info-toggle');
            const customerInfoToggle = document.getElementById('customer-info-toggle');
            const billViewToggle = document.getElementById('bill-view-toggle');
            const savedBillsToggle = document.getElementById('saved-bills-toggle');
            const manageCustomersBtn = document.getElementById('manage-customers-btn');

            const companyInfoSection = document.getElementById('company-info-section');
            const inputSection = document.getElementById('input-section');
            const billSection = document.getElementById('bill-section');
            const savedBillsSection = document.getElementById('saved-bills-section');
            const customersSection = document.getElementById('customers-section');

            companyInfoToggle.addEventListener('click', function () {
                companyInfoSection.classList.add('active');
                inputSection.classList.remove('active');
                billSection.classList.remove('active');
                savedBillsSection.classList.remove('active');
                customersSection.classList.remove('active');

                companyInfoToggle.classList.add('active');
                customerInfoToggle.classList.remove('active');
                billViewToggle.classList.remove('active');
                savedBillsToggle.classList.remove('active');
                manageCustomersBtn.classList.remove('active');

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

                customerInfoToggle.classList.add('active');
                companyInfoToggle.classList.remove('active');
                billViewToggle.classList.remove('active');
                savedBillsToggle.classList.remove('active');
                manageCustomersBtn.classList.remove('active');

                saveCurrentSession();
            });

            billViewToggle.addEventListener('click', function () {
                billSection.classList.add('active');
                companyInfoSection.classList.remove('active');
                inputSection.classList.remove('active');
                savedBillsSection.classList.remove('active');
                customersSection.classList.remove('active');

                billViewToggle.classList.add('active');
                companyInfoToggle.classList.remove('active');
                customerInfoToggle.classList.remove('active');
                savedBillsToggle.classList.remove('active');
                manageCustomersBtn.classList.remove('active');

                generateBill();
                saveCurrentSession();
            });

            savedBillsToggle.addEventListener('click', function () {
                savedBillsSection.classList.add('active');
                companyInfoSection.classList.remove('active');
                inputSection.classList.remove('active');
                billSection.classList.remove('active');
                customersSection.classList.remove('active');

                savedBillsToggle.classList.add('active');
                companyInfoToggle.classList.remove('active');
                customerInfoToggle.classList.remove('active');
                billViewToggle.classList.remove('active');
                manageCustomersBtn.classList.remove('active');

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

                manageCustomersBtn.classList.add('active');
                companyInfoToggle.classList.remove('active');
                customerInfoToggle.classList.remove('active');
                billViewToggle.classList.remove('active');
                savedBillsToggle.classList.remove('active');

                if (dbInitialized) {
                    loadCustomers();
                }
                saveCurrentSession();
            });

            // Save bill button
            document.getElementById('save-bill-btn').addEventListener('click', function () {
                if (dbInitialized) {
                    saveBill();
                } else {
                    console.log('Database not ready. Please try again.');
                }
            });

            // Save company info button
            document.getElementById('save-company-info').addEventListener('click', function () {
                if (dbInitialized) {
                    saveCompanyInfo();
                } else {
                    console.log('Database not ready. Please try again.');
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
                document.getElementById('bill-company-signatory').textContent = `for ${companyName}`;

                // Update banking details
                document.getElementById('bill-account-holder').textContent = document.getElementById('account-holder').value;
                document.getElementById('bill-account-number').textContent = document.getElementById('account-number').value;
                document.getElementById('bill-ifsc-code').textContent = document.getElementById('ifsc-code').value;
                document.getElementById('bill-branch').textContent = document.getElementById('branch').value;
                document.getElementById('bill-bank-name').textContent = document.getElementById('bank-name').value;

                // Update invoice number and date
                document.getElementById('bill-invoice-no').textContent = document.getElementById('invoice-no').value;

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
        });

       
