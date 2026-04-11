import ytdl from '@distube/ytdl-core';
const start = Date.now();
try {
  const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
  console.log('ytdl-core URL:', format.url.substring(0, 30));
  console.log('ytdl-core Time:', Date.now() - start, 'ms');
} catch(e) { console.log('ytdl-core Err:', e.message); }
