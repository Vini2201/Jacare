const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { OpenAI } = require('openai');
const Groq = require('groq-sdk');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conecta ao socket do Docker da hospedeira (/var/run/docker.sock)
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

// Garantir a existência de uma rede interna compartilhada no Docker
async function ensureNetwork() {
  try {
    const networks = await docker.listNetworks();
    const exists = networks.some(n => n.Name === 'jacare-network');
    if (!exists) {
      await docker.createNetwork({ Name: 'jacare-network', Driver: 'bridge' });
      console.log('✅ Rede Docker jacare-network criada com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao verificar/criar rede docker:', err.message);
  }
}
ensureNetwork();

// 🔒 AUTENTICAÇÃO BÁSICA DO PAINEL
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'scalegrid_secret_pass';

function checkAuth(authHeader) {
  if (!authHeader) return false;
  const auth = Buffer.from(authHeader.split(' ')[1] || '', 'base64').toString().split(':');
  return auth[0] === DASHBOARD_USER && auth[1] === DASHBOARD_PASS;
}

const basicAuthMiddleware = (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/api/webhook/trigger' || req.path === '/api/mcp/rpc') {
    return next();
  }

  if (checkAuth(req.headers.authorization)) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Jacare Engine Access"');
  return res.status(401).send('Acesso Negado: Credenciais incorretas.');
};

// Autenticar Socket.io
io.use((socket, next) => {
  const req = socket.request;
  const authHeader = req.headers.authorization || (req._query && req._query.auth);
  // Permitir conexão web de mesma origem se cookies/headers forem válidos
  if (req.headers.host && (req.headers.referer || req.headers.origin)) {
    return next();
  }
  if (checkAuth(authHeader)) {
    return next();
  }
  return next(new Error('Autenticação de Socket negada.'));
});

app.use(basicAuthMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 📩 PROXY TELEGRAM SERVICE
app.post('/api/telegram/send', async (req, res) => {
  const { peer, message } = req.body;
  const telegramServiceUrl = process.env.TELEGRAM_SERVICE_URL || 'http://telegram_mtproto_service:4000';
  
  try {
    const fetchRes = await fetch(`${telegramServiceUrl}/api/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peer, message })
    });
    const data = await fetchRes.json();
    res.status(fetchRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: `Erro de comunicação com Telegram Service: ${err.message}` });
  }
});


// 🤖 CONFIGURAÇÃO DO AGENTE DE IA (HERMES / JACARÉ AGENT)
let aiConfig = {
  provider: process.env.AI_PROVIDER || 'groq', // 'groq', 'openai', 'openrouter', 'ollama'
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
  model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
  baseUrl: process.env.AI_BASE_URL || ''
};

// Retorna cliente da IA apropriado
function getAiClient() {
  if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
    return null;
  }
  if (aiConfig.provider === 'groq') {
    return new Groq({ apiKey: aiConfig.apiKey });
  }
  const baseURL = aiConfig.baseUrl || (
    aiConfig.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
    aiConfig.provider === 'ollama' ? 'http://localhost:11434/v1' : undefined
  );
  return new OpenAI({ apiKey: aiConfig.apiKey || 'ollama', baseURL });
}

// 🛠️ FERRAMENTAS DO AGENTE (TOOLS CALLED BY THE LLM)
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_containers',
      description: 'Lista todos os containers Docker rodando na VPS com portas e estado.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_container',
      description: 'Inicia, para, reinicia ou deleta um container Docker pelo ID ou Nome.',
      parameters: {
        type: 'object',
        properties: {
          containerId: { type: 'string', description: 'ID ou Nome do container' },
          action: { type: 'string', enum: ['start', 'stop', 'restart', 'remove'] }
        },
        required: ['containerId', 'action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deploy_service',
      description: 'Cria e inicia um novo serviço/container na VPS com imagem, porta e variáveis de ambiente.',
      parameters: {
        type: 'object',
        properties: {
          image: { type: 'string', description: 'Imagem Docker (ex: postgres:16-alpine, nginx:alpine, redis:alpine)' },
          name: { type: 'string', description: 'Nome do container' },
          portHost: { type: 'string', description: 'Porta exposta na VPS' },
          portContainer: { type: 'string', description: 'Porta interna do container' },
          env: { type: 'array', items: { type: 'string' }, description: 'Variáveis de ambiente ex: ["POSTGRES_PASSWORD=secret"]' }
        },
        required: ['image']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'exec_bash',
      description: 'Executa um comando Bash direto no terminal da VPS Ubuntu.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando bash' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'configure_ai',
      description: 'Altera o provedor de IA, Chave de API ou Modelo em tempo de execução.',
      parameters: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['groq', 'openai', 'openrouter', 'ollama'] },
          apiKey: { type: 'string', description: 'Nova chave API' },
          model: { type: 'string', description: 'Nome do modelo ex: llama-3.3-70b-versatile, gpt-4o' }
        }
      }
    }
  }
];

// Executor de Tools chamado pelo LLM
async function executeAgentTool(name, args) {
  try {
    if (name === 'list_containers') {
      const containers = await docker.listContainers({ all: true });
      return JSON.stringify(containers.map(c => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace('/', ''),
        image: c.Image,
        state: c.State,
        ports: c.Ports.map(p => `${p.PublicPort || ''}:${p.PrivatePort}`).join(', ')
      })));
    }

    if (name === 'manage_container') {
      const container = docker.getContainer(args.containerId);
      if (args.action === 'start') await container.start();
      if (args.action === 'stop') await container.stop();
      if (args.action === 'restart') await container.restart();
      if (args.action === 'remove') await container.remove({ force: true });
      return `Container ${args.containerId} executou a ação: ${args.action} com sucesso!`;
    }

    if (name === 'deploy_service') {
      await pullImageIfNeeded(args.image);
      const portBindings = args.portHost && args.portContainer ? {
        [`${args.portContainer}/tcp`]: [{ HostPort: String(args.portHost) }]
      } : {};

      const container = await docker.createContainer({
        Image: args.image,
        name: args.name || `app-${Date.now()}`,
        Env: args.env || [],
        HostConfig: {
          PortBindings: portBindings,
          NetworkMode: 'jacare-network',
          RestartPolicy: { Name: 'always' }
        }
      });
      await container.start();
      return `Novo serviço ${args.image} iniciado na porta ${args.portHost || 'interna'}!`;
    }

    if (name === 'exec_bash') {
      return new Promise((resolve) => {
        exec(args.command, { cwd: '/app' }, (err, stdout, stderr) => {
          resolve(stdout || stderr || (err ? err.message : 'Comando executado.'));
        });
      });
    }

    if (name === 'configure_ai') {
      if (args.provider) aiConfig.provider = args.provider;
      if (args.apiKey) aiConfig.apiKey = args.apiKey;
      if (args.model) aiConfig.model = args.model;
      return `Configuração de IA atualizada! Provedor: ${aiConfig.provider}, Modelo: ${aiConfig.model}`;
    }

    return 'Ferramenta desconhecida.';
  } catch (err) {
    return `Erro ao executar ${name}: ${err.message}`;
  }
}

// ROTA DO CHAT COM O JACARÉ AGENT
app.post('/api/ai/chat', async (req, res) => {
  const { message, history } = req.body;
  const client = getAiClient();

  if (!client) {
    return res.status(400).json({
      error: 'Provedor de IA não configurado ou chave de API faltando. Envie a chave API do Groq ou OpenAI para ativar!'
    });
  }

  try {
    const messages = [
      {
        role: 'system',
        content: `Você é o Jacaré Agent (estilo Hermes Agent), o assistente agêntico encarregado de gerenciar esta VPS Linux e seus containers Docker.
Você tem acesso direto a ferramentas para criar, modificar e parar containers, alterar configurações de porta, ler logs e executar comandos bash.
Seja direto, proativo e execute as ações necessárias usando suas ferramentas. Responda sempre em Português do Brasil em formato Markdown limpo.`
      },
      ...(history || []),
      { role: 'user', content: message }
    ];

    // Chamada inicial para o modelo
    let response;
    if (aiConfig.provider === 'groq') {
      response = await client.chat.completions.create({
        model: aiConfig.model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto'
      });
    } else {
      response = await client.chat.completions.create({
        model: aiConfig.model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto'
      });
    }

    let responseMessage = response.choices[0].message;

    // Se o modelo decidiu chamar ferramentas (Tool Calling)
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        const toolResult = await executeAgentTool(functionName, functionArgs);

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: toolResult
        });
      }

      // Segunda chamada com o resultado da ferramenta para resposta final
      let finalResponse;
      if (aiConfig.provider === 'groq') {
        finalResponse = await client.chat.completions.create({
          model: aiConfig.model,
          messages
        });
      } else {
        finalResponse = await client.chat.completions.create({
          model: aiConfig.model,
          messages
        });
      }
      return res.json({ reply: finalResponse.choices[0].message.content, config: { provider: aiConfig.provider, model: aiConfig.model } });
    }

    return res.json({ reply: responseMessage.content, config: { provider: aiConfig.provider, model: aiConfig.model } });
  } catch (err) {
    console.error('Erro no Jacaré Agent:', err);
    res.status(500).json({ error: `Erro na IA (${aiConfig.provider}): ${err.message}` });
  }
});

// Configurar IA via REST
app.post('/api/ai/config', (req, res) => {
  const { provider, apiKey, model, baseUrl } = req.body;
  if (provider) aiConfig.provider = provider;
  if (apiKey) aiConfig.apiKey = apiKey;
  if (model) aiConfig.model = model;
  if (baseUrl !== undefined) aiConfig.baseUrl = baseUrl;

  res.json({ success: true, config: { provider: aiConfig.provider, model: aiConfig.model, hasApiKey: !!aiConfig.apiKey } });
});

app.get('/api/ai/config', (req, res) => {
  res.json({ provider: aiConfig.provider, model: aiConfig.model, hasApiKey: !!aiConfig.apiKey });
});

// Helper para fazer Pull de imagem
async function pullImageIfNeeded(imageName) {
  return new Promise((resolve, reject) => {
    docker.pull(imageName, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err, output) => {
        if (err) return reject(err);
        resolve(output);
      });
    });
  });
}

// Deploy de serviços pré-configurados (Easypanel Preset Deploy)
app.post('/api/deploy', async (req, res) => {
  const { type, customImage, name, portHost, portContainer, env } = req.body;
  try {
    let imageName = customImage || '';
    let containerName = name || '';
    let envVars = env || [];
    let portBindings = {};

    if (type === 'postgres') {
      imageName = 'postgres:16-alpine';
      containerName = name || `postgres-db-${Date.now()}`;
      envVars = envVars.length ? envVars : ['POSTGRES_USER=jacare', 'POSTGRES_PASSWORD=jacare_secret_123', 'POSTGRES_DB=jacare_db'];
      portBindings = { '5432/tcp': [{ HostPort: String(portHost || '5432') }] };
    } else if (type === 'mysql') {
      imageName = 'mysql:8.0';
      containerName = name || `mysql-db-${Date.now()}`;
      envVars = envVars.length ? envVars : ['MYSQL_ROOT_PASSWORD=root_secret_123', 'MYSQL_DATABASE=jacare_db', 'MYSQL_USER=jacare', 'MYSQL_PASSWORD=jacare_secret_123'];
      portBindings = { '3306/tcp': [{ HostPort: String(portHost || '3306') }] };
    } else if (type === 'nginx') {
      imageName = 'nginx:alpine';
      containerName = name || `nginx-web-${Date.now()}`;
      portBindings = { '80/tcp': [{ HostPort: String(portHost || '8080') }] };
    } else if (type === 'redis') {
      imageName = 'redis:alpine';
      containerName = name || `redis-cache-${Date.now()}`;
      portBindings = { '6379/tcp': [{ HostPort: String(portHost || '6379') }] };
    } else if (type === 'prezzy') {
      return res.status(400).json({ error: 'Para implantar a suíte Prezzy completa com Frontend + FastAPI + Worker, acesse o terminal e rode: cd apps/prezzy && docker compose up -d' });
    } else if (type === 'custom' && customImage) {
      containerName = name || `custom-app-${Date.now()}`;
      if (portHost && portContainer) {
        portBindings = { [`${portContainer}/tcp`]: [{ HostPort: String(portHost) }] };
      }
    }

    await pullImageIfNeeded(imageName);

    const container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      Env: envVars,
      HostConfig: {
        PortBindings: portBindings,
        NetworkMode: 'jacare-network',
        RestartPolicy: { Name: 'always' }
      }
    });

    await container.start();
    res.json({ success: true, message: `Serviço ${containerName} criado com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ações no Docker (Start, Stop, Restart, Remove)
app.post('/api/containers/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  try {
    const container = docker.getContainer(id);
    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'restart') await container.restart();
    else if (action === 'remove') await container.remove({ force: true });
    else return res.status(400).json({ error: 'Ação inválida' });

    res.json({ success: true, message: `Container ${action} executado com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alterar Variáveis de Ambiente de um container (Easypanel Style: Stop -> Remove -> Recreate com novos ENVs)
app.post('/api/containers/:id/update-env', async (req, res) => {
  const { id } = req.params;
  const { envVars } = req.body; // Array de strings ex: ["POSTGRES_PASSWORD=nova_senha", "KEY=val"]

  try {
    const container = docker.getContainer(id);
    const inspectData = await container.inspect();

    const name = inspectData.Name.replace('/', '');
    const image = inspectData.Config.Image;
    const portBindings = inspectData.HostConfig.PortBindings || {};

    try { await container.stop(); } catch (e) {}
    await container.remove({ force: true });

    const newContainer = await docker.createContainer({
      Image: image,
      name,
      Env: envVars || [],
      HostConfig: {
        PortBindings: portBindings,
        NetworkMode: 'jacare-network',
        RestartPolicy: { Name: 'always' }
      }
    });

    await newContainer.start();
    res.json({ success: true, message: `Variáveis de ambiente do serviço ${name} atualizadas com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alterar mapeamento de portas de um container (Stop -> Remove -> Recreate)
app.post('/api/containers/:id/rebind-port', async (req, res) => {
  const { id } = req.params;
  const { newHostPort, containerPort } = req.body;

  try {
    const container = docker.getContainer(id);
    const inspectData = await container.inspect();

    const name = inspectData.Name.replace('/', '');
    const image = inspectData.Config.Image;
    const env = inspectData.Config.Env;

    try { await container.stop(); } catch (e) {}
    await container.remove({ force: true });

    const newPortBindings = {};
    const targetContainerPort = containerPort || Object.keys(inspectData.HostConfig.PortBindings || {})[0] || '80/tcp';
    newPortBindings[targetContainerPort] = [{ HostPort: String(newHostPort) }];

    const newContainer = await docker.createContainer({
      Image: image,
      name,
      Env: env,
      HostConfig: {
        PortBindings: newPortBindings,
        NetworkMode: 'jacare-network',
        RestartPolicy: { Name: 'always' }
      }
    });

    await newContainer.start();
    res.json({ success: true, message: `Porta do container ${name} alterada para ${newHostPort}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Terminal SSH Exec
app.post('/api/terminal/exec', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Comando não fornecido.' });

  exec(command, { cwd: '/app' }, (err, stdout, stderr) => {
    res.json({ output: stdout || stderr || (err ? err.message : 'Executado.') });
  });
});

// Inspeção detalhada de container (Variáveis de ambiente e credenciais de conexão estilo Easypanel)
app.get('/api/containers/:id/inspect', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const data = await container.inspect();
    
    const envVars = data.Config.Env || [];
    const ports = data.HostConfig.PortBindings || {};
    const name = data.Name.replace('/', '');
    const image = data.Config.Image;

    // Tentar extrair string de conexão de bancos se for Postgres/MySQL/Redis
    let connectionStrings = [];
    const hostIp = process.env.PUBLIC_IP || '13.222.3.171';
    
    if (image.includes('postgres')) {
      const user = (envVars.find(e => e.startsWith('POSTGRES_USER=')) || '=jacare').split('=')[1];
      const pass = (envVars.find(e => e.startsWith('POSTGRES_PASSWORD=')) || '=').split('=')[1];
      const db = (envVars.find(e => e.startsWith('POSTGRES_DB=')) || '=jacare_db').split('=')[1];
      const hostPort = Object.keys(ports).length ? ports[Object.keys(ports)[0]][0].HostPort : '5432';
      connectionStrings.push(`postgresql://${user}:${pass}@${hostIp}:${hostPort}/${db}`);
    } else if (image.includes('mysql')) {
      const user = (envVars.find(e => e.startsWith('MYSQL_USER=')) || '=root').split('=')[1];
      const pass = (envVars.find(e => e.startsWith('MYSQL_PASSWORD=')) || envVars.find(e => e.startsWith('MYSQL_ROOT_PASSWORD=')) || '=').split('=')[1];
      const db = (envVars.find(e => e.startsWith('MYSQL_DATABASE=')) || '=').split('=')[1];
      const hostPort = Object.keys(ports).length ? ports[Object.keys(ports)[0]][0].HostPort : '3306';
      connectionStrings.push(`mysql://${user}:${pass}@${hostIp}:${hostPort}/${db}`);
    } else if (image.includes('redis')) {
      const hostPort = Object.keys(ports).length ? ports[Object.keys(ports)[0]][0].HostPort : '6379';
      connectionStrings.push(`redis://${hostIp}:${hostPort}`);
    }

    res.json({
      name,
      image,
      env: envVars,
      ports,
      connectionStrings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs do container
app.get('/api/containers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 80,
      timestamps: true
    });
    res.send(logs.toString('utf-8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSockets para estatísticas estilo Easypanel
io.on('connection', (socket) => {
  const emitMetrics = async () => {
    try {
      const [cpu, mem, currentLoad, fsSize, osInfo] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.currentLoad(),
        si.fsSize(),
        si.osInfo()
      ]);

      let containersList = [];
      try {
        const rawContainers = await docker.listContainers({ all: true });
        containersList = await Promise.all(rawContainers.map(async (c) => {
          let cpuPercent = '0.0';
          let memUsageMB = '0.0';
          
          if (c.State === 'running') {
            try {
              const containerObj = docker.getContainer(c.Id);
              const stats = await containerObj.stats({ stream: false });
              
              // Cálculo de RAM em MB
              const memoryBytes = stats.memory_stats.usage || 0;
              memUsageMB = (memoryBytes / (1024 * 1024)).toFixed(1);

              // Cálculo aproximado de CPU %
              const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats.cpu_usage ? stats.precpu_stats.cpu_usage.total_usage : 0);
              const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
              const numCpus = stats.cpu_stats.online_cpus || 1;
              if (systemDelta > 0 && cpuDelta > 0) {
                cpuPercent = ((cpuDelta / systemDelta) * numCpus * 100).toFixed(1);
              }
            } catch (e) {}
          }

          return {
            id: c.Id.substring(0, 12),
            name: c.Names[0] ? c.Names[0].replace('/', '') : 'Sem nome',
            image: c.Image,
            state: c.State,
            status: c.Status,
            created: c.Created,
            cpuPercent,
            memUsageMB,
            ports: c.Ports.map(p => `${p.PublicPort || ''}:${p.PrivatePort}`).filter(p => p !== ':')
          };
        }));
      } catch (e) {}

      socket.emit('metrics', {
        os: {
          hostname: osInfo.hostname,
          distro: `${osInfo.distro} ${osInfo.release}`,
          uptime: si.time().uptime
        },
        cpu: {
          load: currentLoad.currentLoad.toFixed(1),
          cores: cpu.cores
        },
        mem: {
          total: (mem.total / (1024 * 1024 * 1024)).toFixed(2),
          used: (mem.active / (1024 * 1024 * 1024)).toFixed(2),
          percent: ((mem.active / mem.total) * 100).toFixed(1)
        },
        disk: fsSize.map(d => ({
          usePercent: d.use.toFixed(1),
          used: (d.used / (1024 * 1024 * 1024)).toFixed(1),
          size: (d.size / (1024 * 1024 * 1024)).toFixed(1)
        })),
        containers: containersList
      });
    } catch (error) {
      console.error('Erro ao emitir métricas:', error.message);
    }
  };

  const interval = setInterval(emitMetrics, 3000);
  emitMetrics();

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐊 Jacaré VPS Engine & Hermes Agent rodando na porta ${PORT}`);
});
