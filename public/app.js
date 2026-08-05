const socket = io();

// Elementos do DOM
const osInfoEl = document.getElementById('os-info');
const uptimeEl = document.getElementById('uptime-display');

const cpuPercentEl = document.getElementById('cpu-percent');
const cpuCoresEl = document.getElementById('cpu-cores');
const cpuBarEl = document.getElementById('cpu-bar');

const ramPercentEl = document.getElementById('ram-percent');
const ramUsageEl = document.getElementById('ram-usage');
const ramBarEl = document.getElementById('ram-bar');

const swapUsageEl = document.getElementById('swap-usage');
const swapTotalEl = document.getElementById('swap-total');
const swapBarEl = document.getElementById('swap-bar');

const diskPercentEl = document.getElementById('disk-percent');
const diskUsageEl = document.getElementById('disk-usage');
const diskBarEl = document.getElementById('disk-bar');

const containersListEl = document.getElementById('containers-list');
const containerCountEl = document.getElementById('container-count');

const logsModal = document.getElementById('logs-modal');
const modalTitle = document.getElementById('modal-title');
const logsContent = document.getElementById('logs-content');
const btnCloseModal = document.getElementById('btn-close-modal');

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m`;
}

socket.on('metrics', (data) => {
  osInfoEl.textContent = `${data.os.hostname} • ${data.os.distro}`;
  uptimeEl.textContent = `Uptime: ${formatUptime(data.os.uptime)}`;

  cpuPercentEl.textContent = `${data.cpu.load}%`;
  cpuCoresEl.textContent = `${data.cpu.cores} Cores (${data.cpu.brand.split(' ')[0]})`;
  cpuBarEl.style.width = `${data.cpu.load}%`;

  ramPercentEl.textContent = `${data.mem.percent}%`;
  ramUsageEl.textContent = `${data.mem.used} GB / ${data.mem.total} GB`;
  ramBarEl.style.width = `${data.mem.percent}%`;

  swapUsageEl.textContent = `${data.mem.swapUsed} GB`;
  swapTotalEl.textContent = `de ${data.mem.swapTotal} GB`;
  const swapPercent = data.mem.swapTotal > 0 ? ((data.mem.swapUsed / data.mem.swapTotal) * 100).toFixed(1) : 0;
  swapBarEl.style.width = `${swapPercent}%`;

  const mainDisk = data.disk.find(d => d.mount === '/') || data.disk[0];
  if (mainDisk) {
    diskPercentEl.textContent = `${mainDisk.usePercent}%`;
    diskUsageEl.textContent = `${mainDisk.used} GB / ${mainDisk.size} GB`;
    diskBarEl.style.width = `${mainDisk.usePercent}%`;
  }

  renderContainers(data.containers);
});

function renderContainers(containers) {
  containerCountEl.textContent = `${containers.length} Container${containers.length !== 1 ? 's' : ''}`;

  if (containers.length === 0) {
    containersListEl.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Nenhum container Docker rodando no momento.</td>
      </tr>`;
    return;
  }

  containersListEl.innerHTML = containers.map(c => {
    const isRunning = c.state === 'running';
    const statusClass = isRunning ? 'status-running' : 'status-exited';
    const statusText = isRunning ? 'Rodando' : 'Parado';

    return `
      <tr>
        <td>
          <span class="status-pill ${statusClass}">
            <span>${isRunning ? '●' : '○'}</span> ${statusText}
          </span>
        </td>
        <td><span class="container-name">${c.name}</span></td>
        <td><span class="container-image">${c.image}</span></td>
        <td><span class="container-image">${c.ports.join(', ') || 'Nenhuma'}</span></td>
        <td class="actions-cell">
          ${isRunning 
            ? `<button class="btn btn-stop" onclick="controlContainer('${c.id}', 'stop')">Parar</button>`
            : `<button class="btn btn-start" onclick="controlContainer('${c.id}', 'start')">Iniciar</button>`
          }
          <button class="btn btn-logs" onclick="viewLogs('${c.id}', '${c.name}')">Logs</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function controlContainer(id, action) {
  try {
    const res = await fetch(`/api/containers/${id}/${action}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(`Erro: ${data.error}`);
  } catch (err) {
    alert(`Erro ao executar ação: ${err.message}`);
  }
}

async function viewLogs(id, name) {
  modalTitle.textContent = `Logs: ${name}`;
  logsContent.textContent = 'Carregando logs do container...';
  logsModal.classList.add('active');

  try {
    const res = await fetch(`/api/containers/${id}/logs`);
    const text = await res.text();
    logsContent.textContent = text || 'Nenhum log gerado recentemente.';
  } catch (err) {
    logsContent.textContent = `Erro ao carregar logs: ${err.message}`;
  }
}

btnCloseModal.addEventListener('click', () => {
  logsModal.classList.remove('active');
});

logsModal.addEventListener('click', (e) => {
  if (e.target === logsModal) logsModal.classList.remove('active');
});
