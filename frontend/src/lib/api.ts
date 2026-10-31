const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export class ApiRequestError extends Error {
  readonly status: number;
  constructor(status: number) { super(`API request failed (${status})`); this.status = status; }
}

type Envelope<T> = { data: T; total?: number; page?: number; pageSize?: number };

async function read<T>(path: string): Promise<Envelope<T>> {
  const response = await fetch(apiBase + path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ApiRequestError(response.status);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('data' in body)) throw new Error('Invalid API response');
  return body as Envelope<T>;
}

export async function getApiData<T>(path: string): Promise<T> {
  return (await read<T>(path)).data;
}

export async function getAllApiPages<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  for (let page = 1; ; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const response = await read<T[]>(`${path}${separator}page=${page}&pageSize=100`);
    if (!Array.isArray(response.data)) throw new Error('Invalid API list response');
    result.push(...response.data);
    if (response.total === undefined || result.length >= response.total || response.data.length === 0) return result;
  }
}
