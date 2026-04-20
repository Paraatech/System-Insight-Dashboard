let processesData = [];
let lastFiltered = [];

const ctx = document.getElementById('cpuChart').getContext('2d');

const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'CPU', data: [] }] },
    options: { responsive: true, maintainAspectRatio: false }
});

async function fetchData() {
    const res = await fetch('/api/system');
    const data = await res.json();
    processesData = data.processes;
    updateUI(data);
}

function updateUI(data) {
    const cpu = data.cpu.toFixed(2);
    const mem = data.memory.toFixed(2);

    document.getElementById('cpu').innerText = cpu + "%";
    document.getElementById('memory').innerText = mem + "%";

    document.getElementById('cpuBar').style.width = cpu + "%";
    document.getElementById('memBar').style.width = mem + "%";

    updateChart(cpu);
    renderTable();
}

function updateChart(cpu) {
    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.data.labels.push('');
    chart.data.datasets[0].data.push(cpu);
    chart.update();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

function renderTable() {
    const search = document.getElementById('search').value.toLowerCase();

    let filtered = processesData.filter(p =>
        p.name.toLowerCase().includes(search)
    );

    if (search && filtered.length === 0) {
        filtered = lastFiltered;
    } else {
        lastFiltered = filtered;
    }

    const protectedList = ["system","winlogon.exe","services.exe","lsass.exe"];

    document.getElementById('processTable').innerHTML = filtered.map(p => {
        const disabled = protectedList.includes(p.name.toLowerCase());
        const highlight = search && p.name.toLowerCase().includes(search) ? "highlight" : "";

        return `
        <tr class="${highlight}" id="row-${p.pid}">
            <td>${p.name}</td>
            <td>${p.cpu.toFixed(2)}%</td>
            <td>${p.mem.toFixed(2)}%</td>
            <td>Running</td>
            <td>
                <button class="kill-btn"
                    ${disabled ? "disabled" : ""}
                    onclick="killProcess(${p.pid}, '${p.name}')">
                    ${disabled ? "System" : "End Task"}
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function killProcess(pid, name) {
    if (!confirm(`End ${name}?`)) return;

    const res = await fetch(`/api/kill/${pid}`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
        document.getElementById(`row-${pid}`).style.opacity = "0.3";
        showToast(`✔ ${name} terminated`);
        setTimeout(fetchData, 800);
    } else {
        showToast("⚠ Cannot terminate protected/system process");
    }
}

let timer;
document.getElementById('search').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(renderTable, 300);
});

setInterval(fetchData, 2000);
fetchData();