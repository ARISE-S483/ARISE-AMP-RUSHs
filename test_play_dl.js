import play from 'play-dl';

async function test() {
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Success! Stream type:', stream.type, 'URL:', stream.url.slice(0, 80));
  } catch (err) {
    console.error('Play-dl error:', err.message);
  }
}
test();
