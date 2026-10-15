export interface Session {
  authenticated: false;
  csrf_token: string;
}
export interface AuthenticatedSession {
  authenticated: true;
  user: string;
  csrf_token: string;
}
export type SessionResponse = Session | AuthenticatedSession;
export interface Photo {
  id: number; is_horizontal: boolean; photo_url: string; name: string;
  width: number | null; height: number | null; featured: boolean;
  featuredLayout: 'wide' | 'contained' | null; title: string | null;
  location: string | null; year: number | null; seriesSlug: string | null; created_at: string;
}
export interface Presentation {
  featured: boolean; featuredLayout: 'wide' | 'contained' | null;
  title: string | null; location: string | null; year: number | null; seriesSlug: string | null;
}
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
      const payload = await response.json() as { detail?: string; message?: string };
      message = payload.detail ?? payload.message ?? message;
    } catch { /* Keep the status-based message for non-JSON errors. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
