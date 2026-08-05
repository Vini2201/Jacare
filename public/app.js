const socket = io();

let currentDrivePath = '/app';
let parentDrivePath = '/';
let editingFilePath = '';

// Sistema de Abas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

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

const filesListEl = document.getElementById('files-list');
const currentFolderDisplay = document.getElementById('current-folder-display');

const domainsListEl = document.getElementById('domains-list');

const logsModal = document.getElementById('logs-modal');
const modalTitle = document.getElementById('modal-title');
const logsContent = document.getElementById('logs-content');
const btnCloseModal = document.getElementById('btn-close-modal');

const fileEditorModal = document.getElementById('file-editor-modal');
const editorFileTitle = document.getElementById('editor-file-title');
const fileEditorContent = document.getElementById('file-editor-content');

const terminalOutput = document.getElementById('terminal-output');

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m`;
}

socket.on('metrics', (data) => {
  osInfoEl.textContent = `Alpine Linux v3.23 | IP: 13.222.3.171`;
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

// Deploy 1-Click com Docker Pull Real
async function deployService(type) {
  alert('⏳ Iniciando o Pull da imagem no Docker Hub... Aguarde alguns instantes.');
  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    const data = await res.json();
    if (res.ok) alert(`✅ ${data.message}`);
    else alert(`Erro no Deploy: ${data.error}`);
  } catch (err) {
    alert(`Erro ao criar serviço: ${err.message}`);
  }
}

// Deploy de Imagem Customizada
async function deployCustomImage(e) {
  e.preventDefault();
  const customImage = document.getElementById('custom-image-input').value;
  alert(`⏳ Puxando imagem ${customImage} do Docker Hub...`);

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'custom', customImage })
    });
    const data = await res.json();
    if (res.ok) alert(`✅ ${data.message}`);
    else alert(`Erro no Deploy: ${data.error}`);
  } catch (err) {
    alert(`Erro ao puxar imagem: ${err.message}`);
  }
}

// 📱 Painel de Automação Telegram
async function sendTelegramMessage(e) {
  e.preventDefault();
  const chatId = document.getElementById('telegram-chat-id').value;
  const message = document.getElementById('telegram-message-input').value;

  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message })
    });
    const data = await res.json();
    if (res.ok) alert(`✅ ${data.message}`);
    else alert(`Erro ao enviar: ${data.error}`);
  } catch (err) {
    alert(`Erro de comunicação com o Telegram: ${err.message}`);
  }
}

// 🖥️ Terminal Web SSH (Comandos Bash)
async function handleTerminalCommand(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('terminal-input');
    const command = input.value.trim();
    if (!command) return;

    appendTerminalOutput(`ubuntu@ec2:~$ ${command}`);
    input.value = '';

    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      appendTerminalOutput(data.output || data.error);
    } catch (err) {
      appendTerminalOutput(`Erro ao executar comando: ${err.message}`);
    }
  }
}

function appendTerminalOutput(text) {
  const div = document.createElement('div');
  div.textContent = text;
  terminalOutput.appendChild(div);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// 📁 GERENCIADOR DE ARQUIVOS ESTILO GOOGLE DRIVE
async function loadFiles(path = '/app') {
  try {
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!res.ok) return;

    currentDrivePath = data.currentPath;
    parentDrivePath = data.parentPath;
    currentFolderDisplay.textContent = currentDrivePath;

    if (data.files.length === 0) {
      filesListEl.innerHTML = `<tr><td colspan="4" class="empty-row">Diretório vazio.</td></tr>`;
      return;
    }

    filesListEl.innerHTML = data.files.map(f => `
      <tr>
        <td>
          <span style="display: flex; align-items: center; gap: 0.4rem;" class="${f.isDirectory ? 'icon-accent-amber' : 'icon-accent-blue'}">
            ${f.isDirectory 
              ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Pasta`
              : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> Arquivo`
            }
          </span>
        </td>
        <td>
          ${f.isDirectory 
            ? `<a href="#" onclick="loadFiles('${f.path.replace(/\\/g, '/')}'); return false;" class="cell-title" style="color: #60a5fa; text-decoration: underline;">${f.name}</a>`
            : `<span class="cell-title">${f.name}</span>`
          }
        </td>
        <td><span class="cell-code">${f.path}</span></td>
        <td>
          <div class="actions-row">
            ${!f.isDirectory ? `
              <button class="btn btn-logs" onclick="openFileEditor('${f.path.replace(/\\/g, '/')}')">Editar</button>
              <a href="/api/files/download?path=${encodeURIComponent(f.path)}" class="btn btn-primary" download>Baixar</a>
            ` : `<button class="btn btn-start" onclick="loadFiles('${f.path.replace(/\\/g, '/')}')">Abrir</button>`}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar arquivos:', err);
  }
}

function navigateDriveUp() {
  if (currentDrivePath !== '/') {
    loadFiles(parentDrivePath);
  }
}

// Abrir e Salvar Arquivos no Editor
async function openFileEditor(filePath) {
  editingFilePath = filePath;
  editorFileTitle.textContent = `Editar: ${filePath}`;
  fileEditorContent.value = 'Carregando conteúdo...';
  fileEditorModal.classList.add('active');

  try {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    fileEditorContent.value = data.content || '';
  } catch (err) {
    fileEditorContent.value = `Erro ao carregar arquivo: ${err.message}`;
  }
}

function closeEditorModal() {
  fileEditorModal.classList.remove('active');
}

async function saveFileContent() {
  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: editingFilePath, content: fileEditorContent.value })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.message}`);
      closeEditorModal();
    } else alert(`Erro ao salvar: ${data.error}`);
  } catch (err) {
    alert(`Erro ao salvar arquivo: ${err.message}`);
  }
}

// Domínios & SSL
async function addDomain(e) {
  e.preventDefault();
  const domain = document.getElementById('domain-input').value;
  const containerPort = document.getElementById('port-input').value;

  try {
    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, containerPort })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`${data.message}`);
      loadDomains();
    } else alert(`Erro: ${data.error}`);
  } catch (err) {
    alert(`Erro ao apontar domínio: ${err.message}`);
  }
}

async function loadDomains() {
  try {
    const res = await fetch('/api/domains');
    const domains = await res.json();

    if (domains.length === 0) {
      domainsListEl.innerHTML = `<tr><td colspan="4" class="empty-row">Nenhum domínio configurado ainda.</td></tr>`;
      return;
    }

    domainsListEl.innerHTML = domains.map(d => `
      <tr>
        <td><span class="cell-title">${d.domain}</span></td>
        <td><span class="cell-code">Porta ${d.containerPort}</span></td>
        <td><span class="status-badge status-online"><span class="dot-status"></span> ${d.sslStatus}</span></td>
        <td><span class="cell-code">${new Date(d.createdAt).toLocaleDateString()}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar domínios:', err);
  }
}

function renderContainers(containers) {
  containerCountEl.textContent = `${containers.length} Ativo${containers.length !== 1 ? 's' : ''}`;

  if (containers.length === 0) {
    containersListEl.innerHTML = `<tr><td colspan="5" class="empty-row">Nenhum container Docker ativo no momento.</td></tr>`;
    return;
  }

  containersListEl.innerHTML = containers.map(c => {
    const isRunning = c.state === 'running';
    const statusClass = isRunning ? 'status-online' : 'status-offline';
    const statusText = isRunning ? 'Rodando' : 'Parado';

    return `
      <tr>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="dot-status"></span> ${statusText}
          </span>
        </td>
        <td><span class="cell-title">${c.name}</span></td>
        <td><span class="cell-code">${c.image}</span></td>
        <td><span class="cell-code">${c.ports.join(', ') || 'Nenhuma'}</span></td>
        <td>
          <div class="actions-row">
            ${isRunning 
              ? `<button class="btn btn-stop" onclick="controlContainer('${c.id}', 'stop')">Parar</button>`
              : `<button class="btn btn-start" onclick="controlContainer('${c.id}', 'start')">Iniciar</button>`
            }
            <button class="btn btn-start" onclick="controlContainer('${c.id}', 'restart')">Reiniciar</button>
            <button class="btn btn-logs" onclick="viewLogs('${c.id}', '${c.name}')">Logs</button>
            <button class="btn btn-delete" onclick="controlContainer('${c.id}', 'remove')">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function controlContainer(id, action) {
  if (action === 'remove' && !confirm('Tem certeza que deseja remover este container?')) return;
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
  logsContent.textContent = 'Buscando histórico de saída...';
  logsModal.classList.add('active');

  try {
    const res = await fetch(`/api/containers/${id}/logs`);
    const text = await res.text();
    logsContent.textContent = text || 'Nenhum log gerado recentemente.';
  } catch (err) {
    logsContent.textContent = `Erro ao carregar logs: ${err.message}`;
  }
}

btnCloseModal.addEventListener('click', () => logsModal.classList.remove('active'));
logsModal.addEventListener('click', (e) => { if (e.target === logsModal) logsModal.classList.remove('active'); });

// Inicialização
loadFiles();
loadDomains();
