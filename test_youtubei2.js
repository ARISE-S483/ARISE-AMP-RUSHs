import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
  try {
    const yt = await Innertube.create({
      clientType: 'ANDROID',
      generate_session_locally: true,
    });
    const info = await yt.getBasicInfo('dQw4w9WgXcQ');
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (!format) {
      console.log('No audio format found');
      return;
    }
    const url = format.decipher(yt.session.player);
    console.log('youtubei ANDROID Stream URL:', url.slice(0, 80));
    
    const r = await fetch(url, { method: 'HEAD' });
    console.log('HTTP Status:', r.status);
  } catch (err) {
    console.error('youtubei error:', err.message || err);
  }
}
test();
