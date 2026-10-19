const forwardedRequestHeaders = [
  'accept',
  'content-type',
  'cookie',
  'origin',
  'user-agent',
  'x-forwarded-for',
];

const forwardedResponseHeaders = [
  'cache-control',
  'content-type',
  'location',
  'vary',
  'www-authenticate',
];

async function readBody(request) {
  if (request.body !== undefined) {
    if (Buffer.isBuffer(request.body)) return request.body;
    if (typeof request.body === 'string') return Buffer.from(request.body);
    return Buffer.from(JSON.stringify(request.body));
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export const config = { api: { bodyParser: false } };

export default async function handler(request, response) {
  const configuredOrigin = process.env.ASSEMBLE_BACKEND_ORIGIN;
  if (!configuredOrigin) {
    response.status(503).json({ error: 'ยังไม่ได้ตั้งค่า backend ของ Assemble บน Vercel' });
    return;
  }

  let backend;
  try {
    backend = new URL(configuredOrigin);
    if (
      backend.protocol !== 'https:' ||
      backend.pathname !== '/' ||
      backend.search ||
      backend.hash ||
      backend.username ||
      backend.password
    )
      throw new Error('invalid origin');
  } catch {
    response.status(500).json({ error: 'ASSEMBLE_BACKEND_ORIGIN ต้องเป็น HTTPS origin' });
    return;
  }

  let incoming;
  try {
    incoming = new URL(request.url ?? '/', 'https://vercel.invalid');
    if (incoming.origin !== 'https://vercel.invalid' || !incoming.pathname.startsWith('/api/'))
      throw new Error('invalid request path');
  } catch {
    response.status(400).json({ error: 'เส้นทาง API ไม่ถูกต้อง' });
    return;
  }
  const target = new URL(`${incoming.pathname}${incoming.search}`, backend);
  const headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers[name];
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(', '));
  }
  headers.set('x-forwarded-host', request.headers.host ?? '');
  headers.set('x-forwarded-proto', 'https');

  try {
    const method = request.method ?? 'GET';
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(request);
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(9000),
    });

    response.statusCode = upstream.status;
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    if (cookies.length) response.setHeader('set-cookie', cookies);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.status(502).json({ error: 'เชื่อมต่อ Assemble API ไม่ได้ กรุณาลองอีกครั้ง' });
  }
}
