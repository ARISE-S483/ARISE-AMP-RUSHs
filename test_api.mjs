import YTMusic from 'ytmusic-api';
async function test() {
  const yt = new YTMusic();
  await yt.initialize();
  const res = await yt.searchSongs('JAB TAK');
  console.log(JSON.stringify(res[0], null, 2));
}
test();
