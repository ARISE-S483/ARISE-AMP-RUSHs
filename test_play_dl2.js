import play from 'play-dl';

async function test() {
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const stream = await play.stream_from_info(info);
    console.log('Play-dl Stream URL:', stream.url.slice(0, 50));
    const res = await fetch(stream.url, { method: 'HEAD' });
    console.log('Play-dl Stream HTTP:', res.status);
  } catch (err) {
    console.error('Play-dl error:', err.message);
  }
}
test();
