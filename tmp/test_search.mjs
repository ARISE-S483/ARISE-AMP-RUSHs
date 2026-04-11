import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC' });
  const searchResults = await yt.music.search('Khuda Jaane', { type: 'song' });
  if (searchResults.songs?.contents?.length > 0) {
    const item = searchResults.songs.contents[0];
    console.log("ITEM KEYS:", Object.keys(item));
    console.log("item.thumbnails:", JSON.stringify(item.thumbnails, null, 2));
    console.log("item.thumbnail:", JSON.stringify(item.thumbnail, null, 2));
  }
}
main().catch(console.error);
