import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC' });
  const upnext = await yt.music.getUpNext('kJQP7kiw5Fk');
  console.log(JSON.stringify(upnext.contents?.slice(0, 2), null, 2));
}
main().catch(console.error);
