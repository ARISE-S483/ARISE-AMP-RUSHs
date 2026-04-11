import YTMusic from 'ytmusic-api';

(async () => {
  const yt = new YTMusic();
  await yt.initialize({ gl: 'IN', hl: 'en' });
  
  const queries = [
    'Top 100 Songs Global',
    'Top 100 Songs India',
    'Latest Hindi Songs',
    'Latest Punjabi Songs',
  ];

  for (const q of queries) {
    try {
      console.log(`\nSearching: ${q}`);
      const results = await yt.search(q, 'playlists');
      if (results && results.length > 0) {
        console.log(`Top 3 for ${q}:`);
        results.slice(0, 3).forEach(r => {
          console.log(`- ${r.name} (${r.playlistId}) by ${r.artist?.name}`);
        });
      } else {
        console.log('No results.');
      }
    } catch (err) {
      console.error(`Error searching ${q}:`, err.message);
    }
  }
})();
