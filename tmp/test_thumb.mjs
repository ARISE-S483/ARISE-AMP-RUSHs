import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const home = await yt.music.getHome();
  
  if (home.sections && home.sections.length > 0) {
    const firstSection = home.sections[0];
    console.log("Section:", firstSection.header?.title?.text || firstSection.title?.text);
    if (firstSection.contents && firstSection.contents.length > 0) {
      const item = firstSection.contents[0];
      console.log("TITLE:", item.title?.text || item.title || item.name);
      console.log("THUMBNAIL DATA:", JSON.stringify(item.thumbnails || item.thumbnail, null, 2));
    }
  }
}
main().catch(console.error);
