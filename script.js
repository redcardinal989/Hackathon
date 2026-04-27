// MunchCheck Tab Logic
async function loadAndFilter() {
    // Grab the budget saved from the Calculator tab
    const savedBudget = parseFloat(localStorage.getItem('munchBudget')) || 0;
    
    // Update the UI header
    document.getElementById('balance-amount').innerText = `$${savedBudget.toFixed(2)}`;

    try {
        const response = await fetch('food.json');
        const foodData = await response.json();
        
        const container = document.getElementById('food-container');
        container.innerHTML = '';

        // The Affordability Filter
        const safeOptions = foodData.filter(item => item.price <= savedBudget);

        if (safeOptions.length === 0) {
            container.innerHTML = "<p>Nothing affordable. Check the Budget Calculator!</p>";
        } else {
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
                    const currentBudget = parseFloat(localStorage.getItem('munchBudget')) || 0;
                    if (currentBudget >= food.price) {
                        const newBudget = currentBudget - food.price;
                        localStorage.setItem('munchBudget', newBudget);
                        document.getElementById('balance-amount').innerText = `$${newBudget.toFixed(2)}`;
                        alert(`Purchased ${food.item} for $${food.price.toFixed(2)}!`);
                        loadAndFilter(); // Refresh the list
                    } else {
                        alert('Insufficient funds!');
                    }
                });
                container.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Error loading food:", e);
    }
}

loadAndFilter();

// Calculator page logic
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function loadHistory() {
    try { return JSON.parse(localStorage.getItem('munchDailySpend') || '{}'); }
    catch { return {}; }
}

function saveHistory(h) { localStorage.setItem('munchDailySpend', JSON.stringify(h)); }

function showToast(msg) {
    const t = document.getElementById('toast');
    if (t) {
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2600);
    }
}

function calculate() {
    const cashInput = document.getElementById('total-cash');
    const travelInput = document.getElementById('travel-cost');
    const otherInput = document.getElementById('other-cost');
    const finalDisplay = document.getElementById('final-budget');
    
    const cash = parseFloat(cashInput?.value) || 0;
    const travel = parseFloat(travelInput?.value) || 0;
    const other = parseFloat(otherInput?.value) || 0;
    
    const total = cash - (travel + other);
    if (finalDisplay) {
        finalDisplay.innerText = `$${Math.max(0, total).toFixed(2)}`;
    }
    return total;
}

const inputs = document.querySelectorAll('input[type="number"]');
const saveBtn = document.getElementById('save-budget');

inputs.forEach(input => input.addEventListener('input', calculate));

if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const budget = calculate();
        localStorage.setItem('munchBudget', budget);
        
        const history = loadHistory();
        const todayKey = getDayKey();
        history[todayKey] = budget;
        saveHistory(history);
        
        renderChart();
        showToast("Budget saved! Go back to MunchCheck to see what you can eat.");
        setTimeout(() => { window.location.href = "index.html"; }, 1800);
    });
}

function renderChart() {
    const history = loadHistory();
    const now = new Date();
    const barsContainer = document.getElementById('bars-container');
    const chartSubtitle = document.getElementById('chart-subtitle');
    
    if (!barsContainer) return;

    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push({ key: getDayKey(d), label: DAYS[d.getDay()], isToday: i === 0 });
    }

    const values = days.map(d => history[d.key] || 0);
    const max = Math.max(...values, 1);
    const weekTotal = values.reduce((a, b) => a + b, 0);

    if (chartSubtitle) {
        chartSubtitle.textContent = weekTotal > 0
            ? `$${weekTotal.toFixed(2)} budgeted this week`
            : 'Save a budget to start tracking';
    }

    barsContainer.innerHTML = '';

    days.forEach(({ key, label, isToday }) => {
        const amount = history[key] || 0;
        const pct = (amount / max) * 100;

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
            col.querySelector('.bar-fill').style.height = pct + '%';
        }));
    });
}

const resetBtn = document.getElementById('reset-chart');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm("Clear this week's spending history?")) {
            localStorage.removeItem('munchDailySpend');
            renderChart();
            showToast('History cleared.');
        }
    });
}

calculate();
renderChart();