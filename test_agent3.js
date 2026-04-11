import ytdl from '@distube/ytdl-core';
import fs from 'fs';

async function test() {
  try {
    const agent = ytdl.createAgent();
    // Use iOS client to bypass n-sig
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      agent,
      client: 'IOS'
    });
    
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    if (!format) {
      console.log('No audio format found');
      return;
    }
    
    console.log('Streaming to test.webm...');
    const stream = ytdl.downloadFromInfo(info, { format, agent });
    
    stream.on('response', (res) => {
      console.log('Stream HTTP Status:', res.statusCode);
      if (res.statusCode === 200) {
        stream.destroy();
        console.log('SUCCESS: Stream bypassed 403 natively via pipeline!');
      }
    });
    
    stream.on('error', (err) => console.error('Stream Error:', err.message));
  } catch (err) {
    console.error('Info Error:', err.message || err);
  }
}
test();
