const http = require('http');

// Assuming Subject ID 1 exists (English)
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/export/csv?subject_id=1',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
