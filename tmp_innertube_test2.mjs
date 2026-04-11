async function testClient(clientName, clientVersion) {
  const payload = {
    videoId: 'dQw4w9WgXcQ',
    context: {
      client: { clientName, clientVersion, hl: 'en', gl: 'US' }
    }
  };
  const r = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST', body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!data.streamingData) return console.log(clientName, '->', data.playabilityStatus?.status);
  const audio = (data.streamingData.adaptiveFormats || []).find(f => f.mimeType && f.mimeType.includes('audio'));
  if (audio?.url) console.log(clientName, '-> Direct URL!');
  else if (audio?.signatureCipher) console.log(clientName, '-> Ciphered');
}
async function run() {
  await testClient('WEB', '2.20230728.00.00');
  await testClient('ANDROID_MUSIC', '6.03.51');
  await testClient('ANDROID', '18.14.41');
  await testClient('IOS', '18.20.39');
}
run();
