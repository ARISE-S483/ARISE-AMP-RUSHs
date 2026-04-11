import ytdl from '@distube/ytdl-core';

async function test() {
  try {
    const agent = ytdl.createAgent();
    // In newer versions, ytdl-core gets around 403 by using iOS client or specific proxies.
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      agent,
      client: 'IOS'
    });
    console.log(info.videoDetails.title);
  } catch (err) {
    console.error(err.message || err);
  }
}
test();
