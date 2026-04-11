import { Innertube } from 'youtubei.js';

async function main() {
  console.log('Loading youtubei.js...');
  const yt = await Innertube.create({ clientType: 'YTMUSIC' });
  console.log('Getting explore...');
  const exp = await yt.music.getExplore();
  const trendingSection = exp.sections?.find(s => {
    const titleStr = s.header?.title?.text || s.title?.text || '';
    return titleStr.toLowerCase().includes('trending') && s.contents?.length > 0;
  });
  
  const target = trendingSection ? trendingSection.contents : exp.top_songs?.contents;
  if (target && target.length > 0) {
    const item = target[0];
    console.log("Found trending item!");
    console.log("KEYS:", Object.keys(item));
    console.log("THUMBNAILS:");
    console.dir(item.thumbnails || item.thumbnail, { depth: null });
  } else {
    console.log("No trending items found.");
  }
}
main().catch(console.error);
