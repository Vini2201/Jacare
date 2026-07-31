import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  const filePath = path.join(process.cwd(), req.url === '/' ? 'dashboard.html' : req.url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('404 Not Found');
  }
});

server.listen(8085, () => {
  console.log('Server running on http://localhost:8085');
});
