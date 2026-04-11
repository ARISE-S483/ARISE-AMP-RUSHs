import { videoInfo } from 'youtube-ext';

async function test() {
  try {
    const info = await videoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const audioFormats = info.audio;
    if (audioFormats && audioFormats.length > 0) {
      console.log('Success! Stream URL:', audioFormats[0].url.slice(0, 80));
      const r = await fetch(audioFormats[0].url, { method: 'HEAD' });
      console.log('HTTP Status:', r.status);
    } else {
      console.log('No audio formats found');
    }
  } catch (err) {
    console.error('youtube-ext error:', err.message);
  }
}
test();
