import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
  try {
    // Generate a client. We can use ANDROID or IOS to bypass n-sig entirely if needed 
    // but youtubei.js usually handles the web client signature natively
    const yt = await Innertube.create({
      cache: new UniversalCache(true)
    });
    const info = await yt.getBasicInfo('dQw4w9WgXcQ');
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (!format) {
      console.log('No audio format found');
      return;
    }
    const url = format.decipher(yt.session.player);
    console.log('youtubei Stream URL:', url.slice(0, 80));
    
    // Check if it's 403
    const r = await fetch(url, { method: 'HEAD' });
    console.log('HTTP Status:', r.status);
  } catch (err) {
    console.error('youtubei error:', err.message);
  }
}
test();
