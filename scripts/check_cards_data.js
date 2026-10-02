const http = require('http');

http.get('http://127.0.0.1:3000/api/cards', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Cards API response:', data);
  });
});
