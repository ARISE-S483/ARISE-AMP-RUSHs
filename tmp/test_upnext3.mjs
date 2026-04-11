import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const upnext = await yt.music.getUpNext('kJQP7kiw5Fk');
  
  const mapped = (upnext.contents || []).map(item => {
    return {
      type: item.type,
      title: item.title?.toString(),
      author: item.author?.name?.toString(),
      authors: Array.isArray(item.authors) ? item.authors.map(a => a.name) : undefined,
      artists: Array.isArray(item.artists) ? item.artists.map(a => a.name) : undefined,
      id: item.video_id || item.id,
      duration: item.duration?.seconds
    };
  });
  console.log(JSON.stringify(mapped.slice(0, 5), null, 2));
}
main().catch(console.error);
