import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const exp = await yt.music.getExplore();
  
  const trendingSection = exp.sections.find(s => {
    const title = s.header?.title?.text || s.title?.text || '';
    return title.toLowerCase().includes('trending') && s.contents?.length > 0;
  });
  
  if (trendingSection) {
      console.log(trendingSection.contents[0].type); // What type are the trending contents?
  } else {
      console.log('No trending section found');
  }
}
main().catch(console.error);
