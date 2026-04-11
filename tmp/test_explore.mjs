import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const explore = await yt.music.getExplore();
  console.log("Top songs:", explore.top_songs?.contents?.length);
  console.log("Trending:", explore.trending?.contents?.length);
  
  // Try to find a trending songs playlist/section
  if (explore.top_songs && explore.top_songs.contents) {
     const mapped = explore.top_songs.contents.slice(0, 3).map(item => {
         return {
             type: item.type,
             title: item.title,
             author: item.author?.name || item.authors?.[0]?.name,
             id: item.video_id || item.id,
         };
     });
     console.log(JSON.stringify(mapped, null, 2));
  }
}
main().catch(console.error);
