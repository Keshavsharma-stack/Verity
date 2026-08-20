import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/cron/process-expirations',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer NOT_A_REAL_SECRET'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(`Status: ${res.statusCode}, Body: ${data}`));
});
req.on('error', console.error);
req.end();
