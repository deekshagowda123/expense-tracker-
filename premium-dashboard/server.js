const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 4000;
const PUBLIC = path.join(__dirname, 'public');

function send(res, filePath, contentType){
  fs.readFile(path.join(PUBLIC, filePath), (err, data)=>{
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req,res)=>{
  let url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') return send(res, 'index.html', 'text/html');
  if (url.endsWith('.css')) return send(res, url.slice(1), 'text/css');
  if (url.endsWith('.js')) return send(res, url.slice(1), 'application/javascript');
  if (url.endsWith('.json')) return send(res, url.slice(1), 'application/json');
  // fallback
  return send(res, 'index.html', 'text/html');
});

server.listen(PORT, ()=>console.log(`Premium dashboard serving http://localhost:${PORT}`));
