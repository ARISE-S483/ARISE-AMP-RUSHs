export const cobaltClient = {
  async getStreamUrl(videoId: string): Promise<string | null> {
    // List of public community Cobalt instances to bypass YouTube restrictions
    const instances = [
      'https://api.cobalt.tools',  // official (might require JWT soon, testing fallback)
      'https://api.cobalt.pepegang.in',
      'https://cobalt.q0ren.zone',
      'https://co.wuk.sh'
    ];

    for (const inst of instances) {
      try {
        const resp = await fetch(`${inst}/`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isAudioOnly: true,
            aFormat: 'mp3'
          }),
          signal: AbortSignal.timeout(6000), // Fast timeout to cycle through instances
        });

        if (resp.ok) {
          const data = await resp.json();
          // Cobalt returns { status: 'redirect', url: '...' } or { status: 'picker', url: '...' }
          if (data && data.url) {
            return data.url;
          }
        }
      } catch (e) {
        // Ignore and try next instance
      }
    }
    
    return null;
  }
};
