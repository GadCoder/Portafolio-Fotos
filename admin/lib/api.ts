import type { AdminSeriesDto, PhotoDto, PhotoPresentation, SessionDto } from '@portfolio-photos/contracts';

export type Session = Extract<SessionDto, { authenticated: false }>;
export type AuthenticatedSession = Extract<SessionDto, { authenticated: true }>;
export type SessionResponse = SessionDto;
export type Photo = PhotoDto;
export type Series = AdminSeriesDto;
export type Presentation = Pick<PhotoPresentation, 'featured' | 'featuredLayout' | 'title' | 'location' | 'seriesSlug'>;
type RequestOptions = {
  method?: string; csrfToken?: string; body?: unknown; files?: File[];
  fetcher?: typeof fetch;
};

export async function apiRequest<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', csrfToken, body, files, fetcher = fetch } = options;
  const headers: Record<string, string> = {};
  let requestBody: BodyInit | undefined;
  if (files) {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    requestBody = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetcher(`/admin-api${path.startsWith('/') ? path : `/${path}`}`, {
    method, credentials: 'same-origin', headers, body: requestBody,
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json() as { detail?: unknown; message?: unknown };
      const detail = payload.detail;
      if (typeof detail === 'string') message = detail;
      else if (Array.isArray(detail)) message = detail.map((issue) => {
        if (!issue || typeof issue !== 'object') return String(issue);
        const item = issue as { loc?: unknown[]; msg?: unknown };
        const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== 'body').join(' → ') : '';
        return `${field ? `${field}: ` : ''}${typeof item.msg === 'string' ? item.msg : 'Invalid value'}`;
      }).join('; ');
      else if (typeof payload.message === 'string') message = payload.message;
    } catch { /* Keep the status-based message for non-JSON errors. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
