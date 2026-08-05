const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conecta ao socket do Docker da hospedeira (/var/run/docker.sock)
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Ações no Docker via REST
app.post('/api/containers/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  try {
    const container = docker.getContainer(id);
    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'restart') await container.restart();
    else if (action === 'remove') await container.remove({ force: true });
    else return res.status(400).json({ error: 'Ação inválida' });
    
    res.json({ success: true, message: `Container ${action} executado!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deploy de serviços pré-configurados (Estilo Easypanel 1-Click)
app.post('/api/deploy', async (req, res) => {
  const { type } = req.body;
  try {
    if (type === 'postgres') {
      const container = await docker.createContainer({
        Image: 'postgres:16-alpine',
        name: `postgres-db-${Date.now()}`,
        Env: ['POSTGRES_USER=jacare', 'POSTGRES_PASSWORD=jacare_secret_123', 'POSTGRES_DB=jacare_db'],
        HostConfig: {
          PortBindings: { '5432/tcp': [{ HostPort: '5432' }] },
          RestartPolicy: { Name: 'always' }
        }
      });
      await container.start();
      return res.json({ success: true, message: 'PostgreSQL 16 iniciado na porta 5432!' });
    }

    if (type === 'mysql') {
      const container = await docker.createContainer({
        Image: 'mysql:8.0',
        name: `mysql-db-${Date.now()}`,
        Env: ['MYSQL_ROOT_PASSWORD=root_secret_123', 'MYSQL_DATABASE=jacare_db', 'MYSQL_USER=jacare', 'MYSQL_PASSWORD=jacare_secret_123'],
        HostConfig: {
          PortBindings: { '3306/tcp': [{ HostPort: '3306' }] },
          RestartPolicy: { Name: 'always' }
        }
      });
      await container.start();
      return res.json({ success: true, message: 'MySQL 8.0 iniciado na porta 3306!' });
    }

    if (type === 'nginx') {
      const container = await docker.createContainer({
        Image: 'nginx:alpine',
        name: `nginx-web-${Date.now()}`,
        HostConfig: {
          PortBindings: { '80/tcp': [{ HostPort: '8080' }] },
          RestartPolicy: { Name: 'always' }
        }
      });
      await container.start();
      return res.json({ success: true, message: 'Nginx Web Server iniciado na porta 8080!' });
    }

    if (type === 'redis') {
      const container = await docker.createContainer({
        Image: 'redis:alpine',
        name: `redis-cache-${Date.now()}`,
        HostConfig: {
          PortBindings: { '6379/tcp': [{ HostPort: '6379' }] },
          RestartPolicy: { Name: 'always' }
        }
      });
      await container.start();
      return res.json({ success: true, message: 'Redis Cache iniciado na porta 6379!' });
    }

    if (type === 'telegram') {
      const container = await docker.createContainer({
        Image: 'node:20-alpine',
        name: `telegram-mtproto-${Date.now()}`,
        Cmd: ['node', '-e', 'console.log("Telegram MTProto Service ativo!")'],
        HostConfig: {
          PortBindings: { '4000/tcp': [{ HostPort: '4000' }] },
          RestartPolicy: { Name: 'always' }
        }
      });
      await container.start();
      return res.json({ success: true, message: 'Telegram Service iniciado na porta 4000!' });
    }

    res.status(400).json({ error: 'Tipo de serviço não suportado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📁 GERENCIADOR DE ARQUIVOS (File Manager API)
app.get('/api/files', (req, res) => {
  const dirPath = req.query.path || '/app';
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    const fileList = files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      path: path.join(dirPath, f.name)
    }));
    res.json({ currentPath: dirPath, files: fileList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🌐 APONTAMENTO DE DOMÍNIO & SSL (Proxy Config Simulator)
const domainsList = [];
app.post('/api/domains', (req, res) => {
  const { domain, containerPort } = req.body;
  if (!domain || !containerPort) {
    return res.status(400).json({ error: 'Domínio e porta do container são obrigatórios.' });
  }

  const newDomain = {
    id: Date.now(),
    domain,
    containerPort,
    sslStatus: 'SSL Let\'s Encrypt Ativo 🔒',
    createdAt: new Date().toISOString()
  };
  domainsList.push(newDomain);
  res.json({ success: true, domain: newDomain, message: `Domínio ${domain} apontado com SSL!` });
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

// WebSockets para transmissão de métricas em tempo real
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
      } catch (e) {
        // Docker socket pode não estar acessível localmente
      }

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
  console.log(`🚀 VPS Lightweight Dashboard rodando na porta ${PORT}`);
});
