import ytdl from '@distube/ytdl-core';

async function test() {
  try {
    const agent = ytdl.createAgent();
    // Using iOS client to bypass 'n' signature
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      agent,
      client: 'IOS'
    });
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    if (!format) {
      console.log('No format found');
      return;
    }
    const res = await fetch(format.url, { method: 'HEAD' });
    console.log('Stream HTTP status:', res.status);
  } catch (err) {
    console.error(err.message || err);
  }
}
test();
