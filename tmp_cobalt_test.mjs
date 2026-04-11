const https = require('https');

async function testCobalt(videoId) {
  const url = `https://api.cobalt.tools/api/json`;
  const body = JSON.stringify({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    isAudioOnly: true,
    aFormat: 'mp3'
  });

  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  
  console.log('Sending request to Cobalt API...');
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

testCobalt('v3y7a8-pknk').then(res => console.log(res)).catch(e => console.error(e));
