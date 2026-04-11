const videoId = 'dQw4w9WgXcQ';
const payload = {
  videoId: videoId,
  context: {
    client: {
      clientName: 'TVHTML5',
      clientVersion: '7.20230405.08.01',
      hl: 'en',
      gl: 'US'
    }
  }
};

fetch('https://www.youtube.com/youtubei/v1/player', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
  },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(data => {
  const streamingData = data.streamingData;
  if (!streamingData) {
    console.log('No streamingData:', data.playabilityStatus);
    return;
  }
  const formats = streamingData.adaptiveFormats || streamingData.formats;
  const audio = formats.filter(f => f.mimeType && f.mimeType.includes('audio'));
  console.log('Audio Formats Found:', audio.length);
  if (audio.length > 0) {
    console.log('Sample Audio URL available?', !!audio[0].url);
    if (!audio[0].url && audio[0].signatureCipher) {
      console.log('It needs deciphering! (signatureCipher present)');
    } else if (audio[0].url) {
      console.log('Direct URL obtained without cipher!');
      console.log('URL start:', audio[0].url.substring(0, 50));
    }
  }
}).catch(console.error);
