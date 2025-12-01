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
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
