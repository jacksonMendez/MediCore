import http from 'node:http';

const server = http.createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});
  const isApi = req.url.startsWith('/api/');
  const targetPort = isApi ? 8000 : 5173;
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  req.pipe(proxyReq, { end: true });
  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy Error: ' + err.message);
    }
  });
});

server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: 5173,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:5173' },
  });
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    proxySocket.on('error', () => {});
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', () => {
    socket.destroy();
  });
  proxyReq.end();
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(8080, '127.0.0.1', () => {
  console.log('Listening on http://127.0.0.1:8080 forwarding to 5173');
});
