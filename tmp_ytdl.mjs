import ytdl from '@distube/ytdl-core';
async function run() {
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
    console.log('ytdl-core success:', format.url.substring(0, 100));
  } catch(e) {
    console.error('ytdl-core error:', e.message);
  }
}
run();
