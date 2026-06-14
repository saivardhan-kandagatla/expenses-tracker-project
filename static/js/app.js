// --- Categories Configuration ---
const CATEGORIES = {
    income: ['Salary', 'Freelance', 'Investments', 'Refunds', 'Other Income'],
    expense: ['Food', 'Housing', 'Transportation', 'Utilities', 'Entertainment', 'Shopping', 'Health & Wellness', 'Education', 'Other Expense']
};

// --- App State ---
let state = {
    transactions: [],
    stats: {
        total_income: 0.0,
        total_expense: 0.0,
        balance: 0.0,
        category_expenses: [],
        category_income: [],
        monthly_history: []
    },
    editingTxId: null,
    charts: {
        category: null,
        trend: null
    }
};

// --- UI Elements ---
const el = {
    btnNewTx: document.getElementById('btn-add-transaction'),
    modal: document.getElementById('transaction-modal'),
    modalClose: document.getElementById('modal-close-btn'),
    modalCancel: document.getElementById('btn-cancel-modal'),
    modalTitle: document.getElementById('modal-title'),
    form: document.getElementById('transaction-form'),
    formId: document.getElementById('tx-id'),
    formTitle: document.getElementById('tx-title'),
    formAmount: document.getElementById('tx-amount'),
    formCategory: document.getElementById('tx-category'),
    formDate: document.getElementById('tx-date'),
    formDesc: document.getElementById('tx-description'),
    formTypeRadios: document.getElementsByName('tx-type'),
    
    // Stats elements
    statBalance: document.getElementById('stat-balance'),
    statIncome: document.getElementById('stat-income'),
    statExpense: document.getElementById('stat-expense'),
    
    // List & Filters
    txList: document.getElementById('transactions-list'),
    searchInput: document.getElementById('search-input'),
    filterType: document.getElementById('filter-type'),
    filterCategory: document.getElementById('filter-category'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
};

// --- Helper: Format Currency ---
function formatCurrency(value) {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    });
    return formatter.format(value);
}

// --- Helper: Format Date ---
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- Toasts notification ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    el.toastContainer.appendChild(toast);
    
    // Animate out after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

// --- Dynamic Category Dropdowns ---
function populateCategorySelects(type = 'income') {
    // Populate form category
    el.formCategory.innerHTML = '';
    CATEGORIES[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        el.formCategory.appendChild(option);
    });
}

function initCategoryFilters() {
    // Combine all unique categories for the filter
    const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense];
    const uniqueCategories = [...new Set(allCategories)].sort();
    
    el.filterCategory.innerHTML = '<option value="">All Categories</option>';
    uniqueCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        el.filterCategory.appendChild(option);
    });
}

// --- Fetch APIs ---
async function fetchTransactions() {
    try {
        const search = el.searchInput.value;
        const type = el.filterType.value;
        const category = el.filterCategory.value;
        
        let url = '/api/transactions?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (type) url += `type=${type}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load transactions');
        
        state.transactions = await response.json();
        renderTransactions();
    } catch (error) {
        console.error(error);
        showToast('Error loading transaction data.', 'error');
    }
}

async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        
        state.stats = await response.json();
        renderStats();
        updateCharts();
    } catch (error) {
        console.error(error);
        showToast('Error fetching dashboard statistics.', 'error');
    }
}

// --- Render Table & Info ---
function renderTransactions() {
    el.txList.innerHTML = '';
    
    if (state.transactions.length === 0) {
        el.txList.innerHTML = `
            <tr>
                <td colspan="6" class="table-placeholder">
                    <i class="fa-solid fa-folder-open"></i> No transactions found. Try resetting filters or add a new record.
                </td>
            </tr>
        `;
        return;
    }
    
    state.transactions.forEach(tx => {
        const tr = document.createElement('tr');
        tr.style.opacity = '0';
        tr.style.transform = 'translateY(10px)';
        
        const iconClass = tx.type === 'income' ? 'fa-arrow-trend-up tx-icon-income' : 'fa-arrow-trend-down tx-icon-expense';
        const amountClass = tx.type === 'income' ? 'amount-income' : 'amount-expense';
        const prefix = tx.type === 'income' ? '+' : '-';
        
        tr.innerHTML = `
            <td>
                <div class="transaction-title-cell">
                    <div class="tx-icon-circle ${tx.type === 'income' ? 'tx-icon-income' : 'tx-icon-expense'}">
                        <i class="fa-solid ${tx.type === 'income' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                    </div>
                    <span class="tx-title-text">${escapeHTML(tx.title)}</span>
                </div>
            </td>
            <td><span class="category-badge">${escapeHTML(tx.category)}</span></td>
            <td>${formatDate(tx.date)}</td>
            <td style="color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHTML(tx.description || '-')}
            </td>
            <td class="text-right amount-text ${amountClass}">
                ${prefix}${formatCurrency(tx.amount)}
            </td>
            <td class="text-center">
                <div class="actions-cell-wrapper">
                    <button class="btn-icon edit-btn" onclick="editTransaction(${tx.id})" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon delete-btn" onclick="confirmDeleteTransaction(${tx.id})" title="Delete">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        
        el.txList.appendChild(tr);
        
        // Trigger subtle row entry animations
        setTimeout(() => {
            tr.style.transition = 'all 0.4s ease';
            tr.style.opacity = '1';
            tr.style.transform = 'translateY(0)';
        }, 30);
    });
}

function renderStats() {
    // Dynamic text color for net balance
    if (state.stats.balance > 0) {
        el.statBalance.style.color = 'var(--income)';
    } else if (state.stats.balance < 0) {
        el.statBalance.style.color = 'var(--expense)';
    } else {
        el.statBalance.style.color = 'var(--text-primary)';
    }
    
    el.statBalance.textContent = formatCurrency(state.stats.balance);
    el.statIncome.textContent = formatCurrency(state.stats.total_income);
    el.statExpense.textContent = formatCurrency(state.stats.total_expense);
}

// --- Visualizations via Chart.js ---
function updateCharts() {
    const categoryData = state.stats.category_expenses;
    const historyData = state.stats.monthly_history;
    
    // 1. Render Category Expenses (Pie Chart)
    const ctxPie = document.getElementById('categoryChart').getContext('2d');
    const noDataEl = document.getElementById('no-chart-data');
    
    if (categoryData.length === 0) {
        noDataEl.classList.remove('hidden-element');
        document.getElementById('categoryChart').classList.add('hidden-element');
        if (state.charts.category) {
            state.charts.category.destroy();
            state.charts.category = null;
        }
    } else {
        noDataEl.classList.add('hidden-element');
        document.getElementById('categoryChart').classList.remove('hidden-element');
        
        const labels = categoryData.map(item => item.category);
        const data = categoryData.map(item => item.value);
        
        // Dynamic premium gradient slices
        const chartColors = [
            '#7c4dff', // Purple
            '#ff5252', // Red
            '#00e5ff', // Cyan
            '#00e676', // Green
            '#ffc400', // Yellow
            '#ff4081', // Pink
            '#3d5afe', // Indigo
            '#ff6d00', // Orange
            '#a7ffeb'  // Teal
        ];
        
        if (state.charts.category) {
            state.charts.category.data.labels = labels;
            state.charts.category.data.datasets[0].data = data;
            state.charts.category.update();
        } else {
            state.charts.category = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: chartColors.slice(0, labels.length),
                        borderColor: '#120f24',
                        borderWidth: 2,
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#9d9aa8',
                                font: {
                                    family: 'Plus Jakarta Sans',
                                    size: 11
                                },
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    return ` $${value.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }
    
    // 2. Render Trends Line Chart (Monthly History)
    const ctxLine = document.getElementById('trendChart').getContext('2d');
    
    // Sort months correctly before feeding to line graph
    const sortedHistory = [...historyData]
        .filter(item => item && item.month)
        .sort((a, b) => a.month.localeCompare(b.month));
    
    const months = sortedHistory.map(item => {
        // Format YYYY-MM to descriptive Month Name
        const [year, month] = item.month.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    });
    
    const incomes = sortedHistory.map(item => item.income);
    const expenses = sortedHistory.map(item => item.expense);
    
    if (state.charts.trend) {
        state.charts.trend.data.labels = months;
        state.charts.trend.data.datasets[0].data = incomes;
        state.charts.trend.data.datasets[1].data = expenses;
        state.charts.trend.update();
    } else {
        // Chart.js configurations
        state.charts.trend = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: months.length > 0 ? months : ['No Data'],
                datasets: [
                    {
                        label: 'Income',
                        data: incomes.length > 0 ? incomes : [0],
                        borderColor: '#00e676',
                        backgroundColor: 'rgba(0, 230, 118, 0.08)',
                        borderWidth: 3,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Expenses',
                        data: expenses.length > 0 ? expenses : [0],
                        borderColor: '#ff5252',
                        backgroundColor: 'rgba(255, 82, 82, 0.08)',
                        borderWidth: 3,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)'
                        },
                        ticks: {
                            color: '#9d9aa8',
                            font: { family: 'Plus Jakarta Sans', size: 10 },
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9d9aa8',
                            font: { family: 'Plus Jakarta Sans', size: 10 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#9d9aa8',
                            font: { family: 'Plus Jakarta Sans', size: 11 }
                        }
                    }
                }
            }
        });
    }
}

// --- CRUD Functionality: Add / Edit Transaction ---
function getSelectedRadioValue(name) {
    const radios = document.getElementsByName(name);
    for (let r of radios) {
        if (r.checked) return r.value;
    }
    return 'income';
}

function setSelectedRadioValue(name, value) {
    const radios = document.getElementsByName(name);
    for (let r of radios) {
        r.checked = r.value === value;
    }
    // Fire event manually to update category lists
    const checkedRadio = Array.from(radios).find(r => r.checked);
    if (checkedRadio) checkedRadio.dispatchEvent(new Event('change'));
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const payload = {
        title: el.formTitle.value.trim(),
        amount: parseFloat(el.formAmount.value),
        type: getSelectedRadioValue('tx-type'),
        category: el.formCategory.value,
        date: el.formDate.value,
        description: el.formDesc.value.trim()
    };
    
    // Basic Form validation
    if (!payload.title || isNaN(payload.amount) || payload.amount <= 0 || !payload.category || !payload.date) {
        showToast('Please fill out all required fields correctly.', 'error');
        return;
    }
    
    try {
        let response;
        if (state.editingTxId) {
            // Edit mode
            response = await fetch(`/api/transactions/${state.editingTxId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create mode
            response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Server operation failed');
        }
        
        showToast(state.editingTxId ? 'Transaction updated successfully!' : 'Transaction created successfully!');
        hideModal();
        
        // Refresh dashboard data
        fetchTransactions();
        fetchStats();
        
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Error saving transaction.', 'error');
    }
}

function openAddModal() {
    state.editingTxId = null;
    el.modalTitle.textContent = 'Add Transaction';
    el.form.reset();
    
    // Reset to defaults
    setSelectedRadioValue('tx-type', 'income');
    populateCategorySelects('income');
    el.formDate.value = new Date().toISOString().split('T')[0];
    
    el.modal.classList.add('active');
}

function openEditModal(tx) {
    state.editingTxId = tx.id;
    el.modalTitle.textContent = 'Edit Transaction';
    
    el.formTitle.value = tx.title;
    el.formAmount.value = tx.amount;
    el.formDate.value = tx.date;
    el.formDesc.value = tx.description || '';
    
    setSelectedRadioValue('tx-type', tx.type);
    populateCategorySelects(tx.type);
    el.formCategory.value = tx.category;
    
    el.modal.classList.add('active');
}

function hideModal() {
    el.modal.classList.remove('active');
    el.form.reset();
    state.editingTxId = null;
}

// Exposed to window so HTML action buttons can call it
window.editTransaction = function(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (tx) {
        openEditModal(tx);
    }
};

window.confirmDeleteTransaction = async function(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete');
            
            showToast('Transaction deleted successfully!');
            fetchTransactions();
            fetchStats();
        } catch (error) {
            console.error(error);
            showToast('Error deleting transaction.', 'error');
        }
    }
};

// --- Helpers: HTML Sanitization ---
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- Setup Event Listeners ---
function setupEventListeners() {
    // Header triggers
    el.btnNewTx.addEventListener('click', openAddModal);
    el.modalClose.addEventListener('click', hideModal);
    el.modalCancel.addEventListener('click', hideModal);
    
    // Click outside modal
    el.modal.addEventListener('click', (e) => {
        if (e.target === el.modal) hideModal();
    });
    
    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && el.modal.classList.contains('active')) {
            hideModal();
        }
    });
    
    // Form Submit
    el.form.addEventListener('submit', handleFormSubmit);
    
    // Form Radio Type switches category selections dynamically
    Array.from(el.formTypeRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            populateCategorySelects(e.target.value);
        });
    });
    
    // Table filter/search triggers
    let searchTimeout;
    el.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchTransactions();
        }, 300); // Debounce search fetches
    });
    
    el.filterType.addEventListener('change', () => {
        fetchTransactions();
    });
    
    el.filterCategory.addEventListener('change', () => {
        fetchTransactions();
    });
}

// --- App Initialization ---
function init() {
    setupEventListeners();
    populateCategorySelects('income'); // default
    initCategoryFilters();
    
    // Initial data fetches
    fetchTransactions();
    fetchStats();
}

// Run app
document.addEventListener('DOMContentLoaded', init);
