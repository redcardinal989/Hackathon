const STORAGE_BUDGET = 'munchBudget';
const STORAGE_HISTORY = 'munchDailyBudget';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadBudget() {
    return parseFloat(localStorage.getItem(STORAGE_BUDGET)) || 0;
}

function saveBudget(amount) {
    localStorage.setItem(STORAGE_BUDGET, amount.toFixed(2));
    saveTodayHistory(amount);
}

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '{}'); }
    catch { return {}; }
}

function saveHistory(history) {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
}

function saveTodayHistory(amount) {
    const history = loadHistory();
    history[getDayKey()] = amount;
    saveHistory(history);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
}

function updateBalanceDisplay() {
    const balanceEl = document.getElementById('balance-amount');
    if (!balanceEl) return;
    balanceEl.innerText = `$${loadBudget().toFixed(2)}`;
}

async function loadAndFilter() {
    const balanceEl = document.getElementById('balance-amount');
    if (balanceEl) updateBalanceDisplay();

    const container = document.getElementById('food-container');
    if (!container) return;

    const savedBudget = loadBudget();
    container.innerHTML = '';

    try {
        const response = await fetch('food.json');
        const foodData = await response.json();
        const safeOptions = foodData.filter(item => item.price <= savedBudget);

        if (safeOptions.length === 0) {
            container.innerHTML = '<p>Nothing affordable. Check the Budget Calculator!</p>';
            return;
        }

        safeOptions.forEach(food => {
            const div = document.createElement('div');
            div.className = 'food-card';
            div.innerHTML = `
                <div class="food-info">
                    <strong>${food.item}</strong> - ${food.name}<br>
                    <small>📍 ${food.dist} away</small>
                </div>
                <div class="price">$${food.price.toFixed(2)}</div>
            `;

            div.addEventListener('click', () => {
                const currentBudget = loadBudget();
                if (currentBudget >= food.price) {
                    const newBudget = currentBudget - food.price;
                    saveBudget(newBudget);
                    updateBalanceDisplay();
                    if (document.getElementById('final-budget')) {
                        document.getElementById('final-budget').innerText = `$${newBudget.toFixed(2)}`;
                    }
                    showToast(`Purchased ${food.item} for $${food.price.toFixed(2)}.`);
                    loadAndFilter();
                } else {
                    showToast('Insufficient funds!');
                }
            });

            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading food:', error);
        container.innerHTML = '<p>Could not load munch options.</p>';
    }
}

function calculateBudget() {
    const totalCash = document.getElementById('total-cash');
    const finalBudget = document.getElementById('final-budget');
    if (!totalCash || !finalBudget) return 0;

    const cash = parseFloat(totalCash.value) || 0;
    finalBudget.innerText = `$${Math.max(0, cash).toFixed(2)}`;
    return cash;
}

function renderChart() {
    const barsContainer = document.getElementById('bars-container');
    const chartSubtitle = document.getElementById('chart-subtitle');
    if (!barsContainer || !chartSubtitle) return;

    const history = loadHistory();
    const now = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        days.push({ key: getDayKey(day), label: DAYS[day.getDay()], isToday: i === 0 });
    }

    const values = days.map(d => history[d.key] || 0);
    const max = Math.max(...values, 1);
    const weekTotal = values.reduce((sum, value) => sum + value, 0);

    chartSubtitle.textContent = weekTotal > 0
        ? `$${weekTotal.toFixed(2)} remaining this week`
        : 'Save a budget to start tracking';

    barsContainer.innerHTML = '';

    days.forEach(({ key, label, isToday }) => {
        const amount = history[key] || 0;
        const height = (amount / max) * 100;
        const col = document.createElement('div');
        col.className = 'bar-col';
        col.innerHTML = `
            <div class="bar-amount">${amount > 0 ? '$' + amount.toFixed(0) : ''}</div>
            <div class="bar-track">
                <div class="bar-fill ${isToday ? 'today' : ''}" style="height:0%"></div>
            </div>
            <div class="bar-day ${isToday ? 'today-label' : ''}">${label}</div>
        `;
        barsContainer.appendChild(col);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            col.querySelector('.bar-fill').style.height = `${height}%`;
        }));
    });
}

function initCalculatorPage() {
    const totalCash = document.getElementById('total-cash');
    const saveBtn = document.getElementById('save-budget');
    if (!totalCash || !saveBtn) return;

    const currentBudget = loadBudget();
    if (currentBudget > 0) {
        totalCash.value = currentBudget.toFixed(2);
        calculateBudget();
    }

    totalCash.addEventListener('input', calculateBudget);

    saveBtn.addEventListener('click', () => {
        const budget = calculateBudget();
        if (budget <= 0) {
            showToast('Enter a budget amount first.');
            return;
        }
        saveBudget(budget);
        renderChart();
        showToast(`Budget saved! You can spend $${budget.toFixed(2)} on food.`);
        setTimeout(() => window.location.href = 'index.html', 1800);
    });

    renderChart();
}

function initIndexPage() {
    const addAmount = document.getElementById('add-amount');
    const addBtn = document.getElementById('add-money-btn');
    const withdrawBtn = document.getElementById('withdraw-money-btn');
    if (!addAmount || !addBtn || !withdrawBtn) return;

    updateBalanceDisplay();
    loadAndFilter();

    addBtn.addEventListener('click', () => {
        const amount = parseFloat(addAmount.value) || 0;
        if (amount <= 0) {
            showToast('Enter an amount to add.');
            return;
        }

        const currentBudget = loadBudget();
        const newBudget = currentBudget + amount;
        saveBudget(newBudget);
        updateBalanceDisplay();
        loadAndFilter();
        addAmount.value = '';
        showToast(`Added $${amount.toFixed(2)} to your budget.`);
    });

    withdrawBtn.addEventListener('click', () => {
        const amount = parseFloat(addAmount.value) || 0;
        if (amount <= 0) {
            showToast('Enter an amount to withdraw.');
            return;
        }

        const currentBudget = loadBudget();
        if (amount > currentBudget) {
            showToast('Cannot withdraw more than your current budget.');
            return;
        }

        const newBudget = currentBudget - amount;
        saveBudget(newBudget);
        updateBalanceDisplay();
        loadAndFilter();
        addAmount.value = '';
        showToast(`Withdrew $${amount.toFixed(2)} from your budget.`);
    });
}

function initResetChart() {
    const resetBtn = document.getElementById('reset-chart');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
        if (!confirm("Clear this week's spending history?")) return;
        localStorage.removeItem(STORAGE_HISTORY);
        renderChart();
        showToast('History cleared.');
    });
}

function initPage() {
    initIndexPage();
    initCalculatorPage();
    initResetChart();
}

initPage();