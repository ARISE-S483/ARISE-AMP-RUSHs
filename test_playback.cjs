const { chromium } = require('playwright');
async function run() {
  console.log('1. Launching Chromium with autoplay enabled...');
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG [' + msg.type() + ']:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  page.on('request', req => {
    const u = req.url();
    if (u.includes('videoplayback') || u.includes('/stream') || u.includes('cors-proxy') || u.includes('invidious'))
      console.log('REQUESS:', req.method(), u.slice(0, 150));
  });
  page.on('response', res => {
    const u = res.url();
    if (u.includes('videoplayback') || u.includes('/stream') || u.includes('cors-proxy') || res.status() >= 400)
      console.log('RESPONSE:', res.status(), u.slice(0, 150));
  });
  console.log('2. Navigating to https://arise-amp-rush.vercel.app/ ...');
  await page.goto('https://arise-amp-rush.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('3. Page loaded. Checking audio element...');
  await page.waitForTimeout(2000);
  console.log('4. Searching for Levitating...');
  const input = await page.waitForSelector('input', { timeout: 10000 });
  await input.fill('Levitating');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  console.log('5. Clicking song item...');
  const song = await page.waitForSelector('[data-track-id], button:has(svg), .group', { timeout: 5000 });
  if (song) await song.click();
  console.log('6. Waiting 8 seconds for playback...');
  await page.waitForTimeout(8000);
  const audioState = await page.evaluate(() => {
    const a = document.querySelector('audio');
    if (!a) return { error: 'No audio element found' };
    return {
      src: a.src ? a.src.slice(0, 150) + '...' : 'empty',
      paused: a.paused,
      currentTime: a.currentTime,
      duration: a.duration,
      readyState: a.readyState,
      networkState: a.networkState,
      error: a.error ? { code: a.error.code, message: a.error.message } : null
    };
  });
  console.log('7. AUDIO STATE:');
  console.log(JSON.stringify(audioState, null, 2));
  await browser.close();
}
run().catch(console.error);