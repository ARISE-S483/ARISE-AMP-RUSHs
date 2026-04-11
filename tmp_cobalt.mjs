async function run() {
  const r = await fetch('https://api.cobalt.tools/', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', isAudioOnly: true })
  });
  const data = await r.json();
  console.log('cobalt result:', data);
}
run();
