import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const upnext = await yt.music.getUpNext('kJQP7kiw5Fk');
  
  const mapped = (upnext.contents || []).slice(0, 5).map(item => {
    return `${item.title?.toString()} | ${item.video_id || item.id} | ${item.author?.name || item.authors?.[0]?.name}`;
  });
  console.log(mapped.join('\n'));
}
main().catch(console.error);
