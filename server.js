const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const Docker = require('dockerode');
const path = require('path');

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
    else return res.status(400).json({ error: 'Ação inválida' });
    
    res.json({ success: true, message: `Container ${action} executado!` });
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
server.listen(PORT, () => {
  console.log(`🚀 VPS Lightweight Dashboard rodando na porta ${PORT}`);
});
