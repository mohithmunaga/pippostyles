const https = require('https');
https.get('https://k95.it/en/works', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const head = data.substring(0, data.indexOf('</head>'));
    console.log(head);
  });
});
