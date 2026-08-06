const socket = io();

// ----------------------------------------------------
// NAVEGAÇÃO DE ABAS
// ----------------------------------------------------
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
  });
});

// ----------------------------------------------------
// TELEMETRIA E RENDERING DE CONTAINERS (EASYPANEL STYLE)
// ----------------------------------------------------
socket.on('metrics', (data) => {
  if (data.os) {
    document.getElementById('os-info').innerText = `${data.os.distro} (${data.os.hostname})`;
    const hours = Math.floor(data.os.uptime / 3600);
    const mins = Math.floor((data.os.uptime % 3600) / 60);
    document.getElementById('uptime-display').innerText = `Uptime: ${hours}h ${mins}m`;
  }

  if (data.cpu) {
    document.getElementById('cpu-percent').innerText = `${data.cpu.load}%`;
    document.getElementById('cpu-cores').innerText = `${data.cpu.cores} Cores`;
    document.getElementById('cpu-bar').style.width = `${Math.min(data.cpu.load, 100)}%`;
  }

  if (data.mem) {
    document.getElementById('ram-percent').innerText = `${data.mem.percent}%`;
    document.getElementById('ram-usage').innerText = `${data.mem.used} GB / ${data.mem.total} GB`;
    document.getElementById('ram-bar').style.width = `${Math.min(data.mem.percent, 100)}%`;
  }

  if (data.disk && data.disk[0]) {
    document.getElementById('disk-percent').innerText = `${data.disk[0].usePercent}%`;
    document.getElementById('disk-usage').innerText = `${data.disk[0].used} GB / ${data.disk[0].size} GB`;
    document.getElementById('disk-bar').style.width = `${Math.min(data.disk[0].usePercent, 100)}%`;
  }

  if (data.containers) {
    renderEasypanelContainers(data.containers);
  }
});

// Renderizar o grid de serviços no estilo Easypanel
function renderEasypanelContainers(containers) {
  const containerListEl = document.getElementById('easypanel-containers-list');
  const countBadgeEl = document.getElementById('container-count');

  if (countBadgeEl) {
    countBadgeEl.innerText = `${containers.length} Ativos`;
  }

  if (!containers || containers.length === 0) {
    containerListEl.innerHTML = `<div class="empty-state">Nenhum container Docker rodando na VPS.</div>`;
    return;
  }

  containerListEl.innerHTML = containers.map(c => {
    const isRunning = c.state === 'running';
    const statusBadge = isRunning 
      ? `<span class="status-badge status-online"><span class="dot-status"></span> Rodando</span>`
      : `<span class="status-badge status-offline"><span class="dot-status"></span> Parado</span>`;

    const portsText = c.ports.length > 0 ? c.ports.join(', ') : 'Interna';

    return `
      <div class="easypanel-card">
        <div class="easypanel-card-header">
          <div>
            <div class="easypanel-card-title">${c.name}</div>
            <span class="cell-code" style="font-size:0.75rem;">${c.image}</span>
          </div>
          ${statusBadge}
        </div>

        <div class="easypanel-stats-bar">
          <div class="easypanel-stat-item">
            <span class="stat-label">CPU</span>
            <span class="stat-val">${c.cpuPercent || '0.0'}%</span>
          </div>
          <div class="easypanel-stat-item">
            <span class="stat-label">RAM MB</span>
            <span class="stat-val">${c.memUsageMB || '0.0'} MB</span>
          </div>
          <div class="easypanel-stat-item">
            <span class="stat-label">Portas Expostas</span>
            <span class="stat-val" style="color:var(--brand-blue);">${portsText}</span>
          </div>
        </div>

        <div class="actions-row" style="margin-top:auto;">
          <button class="btn btn-logs" onclick="openContainerLogs('${c.id}', '${c.name}')">📄 Logs</button>
          <button class="btn" onclick="openRebindPortModal('${c.id}', '${c.ports[0] ? c.ports[0].split(':')[0] : ''}')">🔌 Mudar Porta</button>
          ${isRunning 
            ? `<button class="btn btn-stop" onclick="controlContainer('${c.id}', 'stop')">⏹️ Parar</button>`
            : `<button class="btn btn-start" onclick="controlContainer('${c.id}', 'start')">▶️ Iniciar</button>`
          }
          <button class="btn btn-delete" onclick="controlContainer('${c.id}', 'remove')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Controlar Container (Start, Stop, Restart, Remove)
async function controlContainer(id, action) {
  if (action === 'remove' && !confirm('Tem certeza que deseja apagar este container?')) return;
  
  try {
    const res = await fetch(`/api/containers/${id}/${action}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) alert(`Erro: ${data.error}`);
  } catch (e) {
    alert(`Erro na requisição: ${e.message}`);
  }
}

// ----------------------------------------------------
// LOGS MODAL & REBIND PORT MODAL
// ----------------------------------------------------
async function openContainerLogs(id, name) {
  const modal = document.getElementById('logs-modal');
  const title = document.getElementById('modal-title');
  const content = document.getElementById('logs-content');

  title.innerText = `Logs de Execução: ${name}`;
  content.innerText = 'Buscando histórico de logs...';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/containers/${id}/logs`);
    const logs = await res.text();
    content.innerText = logs || 'Nenhum log retornado pelo container.';
  } catch (e) {
    content.innerText = `Erro ao buscar logs: ${e.message}`;
  }
}

document.getElementById('btn-close-modal').addEventListener('click', () => {
  document.getElementById('logs-modal').classList.remove('active');
});

function openRebindPortModal(id, currentPort) {
  document.getElementById('rebind-container-id').value = id;
  document.getElementById('rebind-new-port').value = currentPort || '8080';
  document.getElementById('rebind-port-modal').classList.add('active');
}

function closeRebindPortModal() {
  document.getElementById('rebind-port-modal').classList.remove('active');
}

async function submitRebindPort() {
  const id = document.getElementById('rebind-container-id').value;
  const newHostPort = document.getElementById('rebind-new-port').value;

  try {
    const res = await fetch(`/api/containers/${id}/rebind-port`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newHostPort })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeRebindPortModal();
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (e) {
    alert(`Erro: ${e.message}`);
  }
}

// ----------------------------------------------------
// CHAT AGÊNTICO DA IA (HERMES / JACARÉ AGENT)
// ----------------------------------------------------
const chatHistory = [];

async function handleSendAgentMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chat-input');
  const messagesContainer = document.getElementById('chat-messages');
  const text = input.value.trim();

  if (!text) return;

  // Renderizar mensagem do usuário
  messagesContainer.innerHTML += `
    <div class="chat-msg user">
      <strong>Você:</strong> ${escapeHtml(text)}
    </div>
  `;
  input.value = '';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Placeholder do agente pensando
  const thinkingId = `thinking-${Date.now()}`;
  messagesContainer.innerHTML += `
    <div class="chat-msg agent" id="${thinkingId}">
      <strong>🐊 Jacaré Agent:</strong> <em>Pensando e executando ferramentas... ⚙️</em>
    </div>
  `;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory })
    });

    const data = await res.json();
    const thinkingEl = document.getElementById(thinkingId);

    if (data.error) {
      thinkingEl.innerHTML = `<strong>🐊 Jacaré Agent:</strong> ⚠️ ${data.error}`;
      return;
    }

    // Salvar histórico de conversa
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: data.reply });

    thinkingEl.innerHTML = `<strong>🐊 Jacaré Agent:</strong><br>${formatMarkdown(data.reply)}`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (data.config) {
      document.getElementById('ai-provider-badge').innerText = `Provedor: ${data.config.provider} (${data.config.model})`;
    }
  } catch (e) {
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.innerHTML = `<strong>🐊 Jacaré Agent:</strong> ⚠️ Erro de conexão: ${e.message}`;
  }
}

// ----------------------------------------------------
// MODAIS DE IA E DEPLOY
// ----------------------------------------------------
function openAiConfigModal() {
  fetch('/api/ai/config')
    .then(r => r.json())
    .then(data => {
      document.getElementById('ai-provider-select').value = data.provider || 'groq';
      document.getElementById('ai-model-name').value = data.model || 'llama-3.3-70b-versatile';
      document.getElementById('ai-config-modal').classList.add('active');
    });
}

function closeAiConfigModal() {
  document.getElementById('ai-config-modal').classList.remove('active');
}

async function handleSaveAiConfig(event) {
  event.preventDefault();
  const provider = document.getElementById('ai-provider-select').value;
  const apiKey = document.getElementById('ai-api-key').value;
  const model = document.getElementById('ai-model-name').value;

  try {
    const res = await fetch('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model })
    });
    const data = await res.json();
    if (data.success) {
      alert('Configuração de IA atualizada com sucesso!');
      closeAiConfigModal();
      document.getElementById('ai-provider-badge').innerText = `Provedor: ${data.config.provider} (${data.config.model})`;
    }
  } catch (e) {
    alert(`Erro: ${e.message}`);
  }
}

function openDeployModal() {
  document.getElementById('deploy-modal').classList.add('active');
}

function closeDeployModal() {
  document.getElementById('deploy-modal').classList.remove('active');
}

function onDeployPresetChange() {
  const val = document.getElementById('deploy-preset-select').value;
  const customGrp = document.getElementById('custom-image-group');
  customGrp.style.display = val === 'custom' ? 'block' : 'none';
}

async function handleCustomDeploySubmit(event) {
  event.preventDefault();
  const type = document.getElementById('deploy-preset-select').value;
  const customImage = document.getElementById('deploy-custom-image').value;
  const name = document.getElementById('deploy-container-name').value;
  const portHost = document.getElementById('deploy-port-host').value;
  const portContainer = document.getElementById('deploy-port-container').value;

  try {
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, customImage, name, portHost, portContainer })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeDeployModal();
    } else {
      alert(`Erro: ${data.error}`);
    }
  } catch (e) {
    alert(`Erro: ${e.message}`);
  }
}

// Terminal SSH Exec Handler
function handleTerminalCommand(event) {
  if (event.key === 'Enter') {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const cmd = input.value.trim();
    if (!cmd) return;

    output.innerHTML += `<div><span class="prompt-symbol">ubuntu@ec2:~$</span> ${escapeHtml(cmd)}</div>`;
    input.value = '';

    fetch('/api/terminal/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    })
    .then(r => r.json())
    .then(data => {
      output.innerHTML += `<div style="color:var(--text-secondary); margin-bottom:0.5rem;">${escapeHtml(data.output)}</div>`;
      output.scrollTop = output.scrollHeight;
    });
  }
}

// Utilities
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMarkdown(str) {
  return escapeHtml(str)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="cell-code">$1</code>')
    .replace(/\n/g, '<br>');
}
