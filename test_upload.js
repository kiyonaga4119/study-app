const http = require('http');
const fs = require('fs');
const path = require('path');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = path.join(__dirname, 'test_questions.csv');
const fileContent = fs.readFileSync(filePath);

const postDataStart = `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="test_questions.csv"\r\n` +
  `Content-Type: text/csv\r\n\r\n`;
const postDataEnd = `\r\n--${boundary}--\r\n`;

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/upload/csv',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(postDataStart) + fileContent.length + Buffer.byteLength(postDataEnd)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postDataStart);
req.write(fileContent);
req.write(postDataEnd);
req.end();
