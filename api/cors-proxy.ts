export default async function handler(req: any, res: any) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  function sendJSON(data: unknown, status = 200) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  try {
    const parsed = new URL(req.url, `http://${req.headers.host}`);
    const targetUrl = parsed.searchParams.get('url');
    if (!targetUrl) {
      sendJSON({ error: 'Missing "url" query parameter' }, 400);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Melodies-HealthCheck/1.0' },
      redirect: 'follow',
    }).catch(async () => {
      // HEAD may not be allowed, try GET
      return fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Melodies-HealthCheck/1.0' },
        redirect: 'follow',
      });
    });

    clearTimeout(timeout);

    sendJSON({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: targetUrl,
    });
  } catch (error: any) {
    sendJSON({
      ok: false,
      status: 0,
      statusText: error?.message || 'Network error',
      url: '',
    });
  }
}
