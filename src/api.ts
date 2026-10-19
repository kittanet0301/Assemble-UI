export async function api<T = any>(path: string, data?: unknown, method?: string): Promise<T> {
  const res = await fetch(path, {
    method: method ?? (data === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await res.text();
  let result: any;
  try {
    result = body ? JSON.parse(body) : {};
  } catch {
    const contentType = res.headers.get('content-type') ?? '';
    if (
      res.status === 404 &&
      (contentType.includes('text/html') || /the page could not be found/i.test(body))
    )
      throw new Error(`ไม่พบ API route ${path} บน Vercel (HTTP 404)`);
    throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON (${path} · HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(result.error ?? 'เชื่อมต่อไม่สำเร็จ');
  return result;
}
