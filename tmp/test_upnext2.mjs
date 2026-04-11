import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create({ clientType: 'YTMUSIC', fetch: fetch });
  const upnext = await yt.music.getUpNext('kJQP7kiw5Fk');
  for (const item of upnext.contents || []) {
      console.log(`Type: ${item.type}`);
      if (item.type === 'PlaylistPanelVideo') {
          console.log(`Title:`, item.title, "Author:", item.author?.name || item.authors?.[0]?.name, "Authors:", item.authors, "VideoId:", item.video_id);
      }
  }
}
main().catch(console.error);
