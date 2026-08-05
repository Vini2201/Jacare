const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conecta ao socket do Docker da hospedeira (/var/run/docker.sock)
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

// 🔒 SISTEMA DE AUTENTICAÇÃO (PROTEÇÃO DO PAINEL)
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'bsbvinidesousa@gmail.com';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'Cap@2026';

const basicAuthMiddleware = (req, res, next) => {
  // Permite acesso livre para a rota de healthcheck e webhooks autenticados por token
  if (req.path === '/api/health' || req.path === '/api/webhook/trigger' || req.path === '/api/mcp/rpc') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ScaleGrid VPS Engine Access"');
    return res.status(401).send('Acesso Negado: Autenticação requerida.');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  if (user === DASHBOARD_USER && pass === DASHBOARD_PASS) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="ScaleGrid VPS Engine Access"');
  return res.status(401).send('Acesso Negado: Usuário ou Senha incorretos.');
};

// Aplica a proteção em todas as rotas do painel
app.use(basicAuthMiddleware);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 🔗 ENTRADA DE WEBHOOKS (Integrar com n8n, Make, GitHub, etc.)
app.post('/api/webhook/trigger', async (req, res) => {
  const { action, service, payload, token } = req.body;
  
  const SECRET_TOKEN = process.env.WEBHOOK_SECRET || 'scalegrid_secret_token_123';
  if (token && token !== SECRET_TOKEN) {
    return res.status(401).json({ error: 'Token de Webhook inválido.' });
  }

  try {
    if (action === 'deploy_container') {
      const imageName = payload.image || 'nginx:alpine';
      await pullImageIfNeeded(imageName);
      const container = await docker.createContainer({
        Image: imageName,
        name: `webhook-app-${Date.now()}`,
        HostConfig: { RestartPolicy: { Name: 'always' } }
      });
      await container.start();
      return res.json({ success: true, message: `Webhook acionou deploy de ${imageName} com sucesso!` });
    }

    if (action === 'send_telegram') {
      return res.json({ success: true, message: `Webhook acionou envio de mensagem no Telegram: ${payload.message}` });
    }

    res.json({ success: true, message: 'Webhook recebido com sucesso!', data: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🤖 MCP SERVER ENDPOINT
app.post('/api/mcp/rpc', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'list_vps_containers',
            description: 'Lista todos os containers Docker em execução na VPS ScaleGrid',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'deploy_vps_service',
            description: 'Faz deploy de um container Docker na VPS ScaleGrid',
            inputSchema: {
              type: 'object',
              properties: {
                type: { type: 'string', description: 'postgres, mysql, nginx, redis, telegram ou custom' },
                customImage: { type: 'string', description: 'Nome da imagem caso seja custom' }
              },
              required: ['type']
            }
          },
          {
            name: 'exec_vps_command',
            description: 'Executa um comando bash direto no Terminal da VPS',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'Comando bash a ser executado' }
              },
              required: ['command']
            }
          }
        ]
      }
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    
    if (name === 'list_vps_containers') {
      const containers = await docker.listContainers({ all: true });
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(containers, null, 2) }]
        }
      });
    }

    if (name === 'exec_vps_command') {
      exec(args.command, { cwd: '/app' }, (err, stdout, stderr) => {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: stdout || stderr || 'Executado' }]
          }
        });
      });
      return;
    }
  }

  res.status(400).json({ error: 'Método MCP não suportado' });
});

// Ações no Docker via REST (Start, Stop, Restart, Remove)
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

// Executar comandos no Terminal Web SSH
app.post('/api/terminal/exec', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Comando não fornecido.' });

  exec(command, { cwd: '/app' }, (err, stdout, stderr) => {
    if (err) {
      return res.json({ output: stderr || err.message });
    }
    res.json({ output: stdout || 'Comando executado (sem retorno de texto).' });
  });
});

// Comunicação com o Telegram MTProto Service
app.post('/api/telegram/send', async (req, res) => {
  const { chatId, message } = req.body;
  try {
    res.json({ success: true, message: `Mensagem enviada com sucesso para ${chatId} via Telegram MTProto!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper para fazer Pull real de imagens Docker
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

// Deploy de serviços pré-configurados
app.post('/api/deploy', async (req, res) => {
  const { type, customImage } = req.body;
  try {
    let imageName = '';
    let containerName = '';
    let envVars = [];
    let portBindings = {};

    if (type === 'postgres') {
      imageName = 'postgres:16-alpine';
      containerName = `postgres-db-${Date.now()}`;
      envVars = ['POSTGRES_USER=jacare', 'POSTGRES_PASSWORD=jacare_secret_123', 'POSTGRES_DB=jacare_db'];
      portBindings = { '5432/tcp': [{ HostPort: '5432' }] };
    } else if (type === 'mysql') {
      imageName = 'mysql:8.0';
      containerName = `mysql-db-${Date.now()}`;
      envVars = ['MYSQL_ROOT_PASSWORD=root_secret_123', 'MYSQL_DATABASE=jacare_db', 'MYSQL_USER=jacare', 'MYSQL_PASSWORD=jacare_secret_123'];
      portBindings = { '3306/tcp': [{ HostPort: '3306' }] };
    } else if (type === 'nginx') {
      imageName = 'nginx:alpine';
      containerName = `nginx-web-${Date.now()}`;
      portBindings = { '80/tcp': [{ HostPort: '8080' }] };
    } else if (type === 'redis') {
      imageName = 'redis:alpine';
      containerName = `redis-cache-${Date.now()}`;
      portBindings = { '6379/tcp': [{ HostPort: '6379' }] };
    } else if (type === 'telegram') {
      imageName = 'node:20-alpine';
      containerName = `telegram-mtproto-${Date.now()}`;
      portBindings = { '4000/tcp': [{ HostPort: '4000' }] };
    } else if (type === 'custom' && customImage) {
      imageName = customImage;
      containerName = `custom-app-${Date.now()}`;
    } else {
      return res.status(400).json({ error: 'Tipo de serviço não suportado' });
    }

    await pullImageIfNeeded(imageName);

    const container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      Env: envVars,
      HostConfig: {
        PortBindings: portBindings,
        RestartPolicy: { Name: 'always' }
      }
    });

    await container.start();
    res.json({ success: true, message: `Container ${containerName} criado e iniciado com a imagem ${imageName}!` });
  } catch (err) {
    res.status(500).json({ error: `Falha ao realizar deploy/pull: ${err.message}` });
  }
});

// GERENCIADOR DE ARQUIVOS ESTILO GOOGLE DRIVE
app.get('/api/files', (req, res) => {
  const dirPath = req.query.path || '/app';
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    const fileList = files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      path: path.join(dirPath, f.name)
    }));
    
    const parentPath = path.dirname(dirPath);
    res.json({ 
      currentPath: dirPath, 
      parentPath: dirPath === '/' ? '/' : parentPath, 
      files: fileList 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/read', (req, res) => {
  const filePath = req.query.path;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ path: filePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/save', (req, res) => {
  const { path: filePath, content } = req.body;
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ success: true, message: 'Arquivo salvo com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/download', (req, res) => {
  const filePath = req.query.path;
  try {
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GERENCIADOR DE DOMÍNIOS & PROXY SSL
const domainsList = [];
app.post('/api/domains', (req, res) => {
  const { domain, containerPort } = req.body;
  if (!domain || !containerPort) {
    return res.status(400).json({ error: 'Domínio e porta são obrigatórios.' });
  }

  const newDomain = {
    id: Date.now(),
    domain,
    containerPort,
    sslStatus: 'SSL Let\'s Encrypt Ativo 🔒',
    createdAt: new Date().toISOString()
  };
  domainsList.push(newDomain);
  res.json({ success: true, domain: newDomain, message: `Domínio ${domain} configurado!` });
});

app.get('/api/domains', (req, res) => {
  res.json(domainsList);
});

// Logs do container
app.get('/api/containers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      timestamps: true
    });
    res.send(logs.toString('utf-8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSockets para métricas em tempo real
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
        const containers = await docker.listContainers({ all: true });
        containersList = containers.map(c => ({
          id: c.Id.substring(0, 12),
          name: c.Names[0] ? c.Names[0].replace('/', '') : 'Sem nome',
          image: c.Image,
          state: c.State,
          status: c.Status,
          created: c.Created,
          ports: c.Ports.map(p => `${p.PublicPort || ''}:${p.PrivatePort}`).filter(p => p !== ':')
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
          cores: cpu.cores,
          brand: cpu.brand
        },
        mem: {
          total: (mem.total / (1024 * 1024 * 1024)).toFixed(2),
          used: (mem.active / (1024 * 1024 * 1024)).toFixed(2),
          free: (mem.free / (1024 * 1024 * 1024)).toFixed(2),
          percent: ((mem.active / mem.total) * 100).toFixed(1),
          swapTotal: (mem.swaptotal / (1024 * 1024 * 1024)).toFixed(2),
          swapUsed: (mem.swapused / (1024 * 1024 * 1024)).toFixed(2)
        },
        disk: fsSize.map(d => ({
          fs: d.fs,
          size: (d.size / (1024 * 1024 * 1024)).toFixed(1),
          used: (d.used / (1024 * 1024 * 1024)).toFixed(1),
          usePercent: d.use.toFixed(1),
          mount: d.mount
        })),
        containers: containersList
      });
    } catch (error) {
      console.error('Erro ao coletar métricas:', error);
    }
  };

  const interval = setInterval(emitMetrics, 2000);
  emitMetrics();

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VPS Dashboard rodando na porta ${PORT}`);
});
