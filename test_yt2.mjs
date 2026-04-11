import YTMusic from 'ytmusic-api';
import fs from 'fs';

(async () => {
  const yt = new YTMusic();
  await yt.initialize({ gl: 'IN', hl: 'en' });
  
  const queries = [
    'Top 100 Songs Global',
    'Top 100 Songs India',
    'Bollywood Hot 50',
    'Punjabi Hot 50',
  ];

  let out = '';
  for (const q of queries) {
    try {
      const results = await yt.search(q, 'playlists');
      out += `\n--- ${q} ---\n`;
      if (results && results.length > 0) {
        results.slice(0, 5).forEach(r => {
          out += `${r.name} | ${r.playlistId} | ${r.artist?.name || 'YouTube Music'}\n`;
        });
      }
    } catch (err) {}
  }
  fs.writeFileSync('C:\\temp\\yt_playlists.txt', out);
})();
