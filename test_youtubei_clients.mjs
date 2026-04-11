import { Innertube, UniversalCache } from 'youtubei.js';

async function testClient(clientType) {
  console.log('Testing client:', clientType);
  try {
    const yt = await Innertube.create({
      fetch: (input, init) => {
        // Add headers if needed
        return fetch(input, init);
      }
    });

    // We can also just switch the client by getting basic info with a specific client
    const info = await yt.getBasicInfo('dQw4w9WgXcQ', clientType);
    
    // Check adaptive formats
    const adaptiveFormats = info.streaming_data?.adaptive_formats || [];
    const audioFormats = adaptiveFormats.filter(f => f.mime_type?.startsWith('audio/'));
    
    if (audioFormats.length > 0) {
      console.log('Got audio formats for', clientType);
      const url = audioFormats[0].url || audioFormats[0].decipher?.(yt.session.player);
      if (typeof url === 'string') {
        console.log('Deciphered URL successfully.');
      } else {
        console.log('Failed to get URL string.');
      }
    } else {
      console.log('No audio formats for', clientType);
    }
  } catch (err) {
    console.error('Error with client', clientType, ':', err.message);
  }
}

async function run() {
  await testClient('WEB');
  await testClient('IOS');
  await testClient('ANDROID');
  await testClient('TV_EMBEDDED');
}
run();
