import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const upnext = await yt.music.getUpNext('kJQP7kiw5Fk');
  
  const mapped = (upnext.contents || []).slice(0, 2).map(item => {
    return {
       title: item.title,
       authorKeys: item.author ? Object.keys(item.author) : null,
       authorType: item.author ? typeof item.author : null,
       authorsKeys: item.authors ? Object.keys(item.authors[0] || {}) : null,
       artistKeys: item.artist ? Object.keys(item.artist) : null,
       artistsKeys: item.artists ? Object.keys(item.artists[0] || {}) : null,
    };
  });
  console.log(JSON.stringify(mapped));
}
main().catch(console.error);
