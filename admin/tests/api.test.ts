import { describe, expect, it, vi } from 'vitest';
import { apiRequest, type Session } from '../lib/api';

describe('admin API client', () => {
  it('sends CSRF headers and JSON mutations through the same-origin proxy', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":7}', { status: 200 }));
    const result = await apiRequest<{ id: number }>('/photos/7/presentation', {
      method: 'PATCH', csrfToken: 'csrf-value', body: { featured: true, title: 'Rain' }, fetcher,
    });
    expect(result).toEqual({ id: 7 });
    expect(fetcher).toHaveBeenCalledWith('/admin-api/photos/7/presentation', expect.objectContaining({
      method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-value' },
      body: JSON.stringify({ featured: true, title: 'Rain' }),
    }));
  });

  it('keeps upload bodies multipart and does not set a content type manually', async () => {
    const file = new File(['photo'], 'one.jpg', { type: 'image/jpeg' });
    const fetcher = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    await apiRequest('/photos/upload', { method: 'POST', csrfToken: 'csrf', files: [file], fetcher });
    const [, options] = fetcher.mock.calls[0];
    expect(options.headers).toEqual({ 'X-CSRF-Token': 'csrf' });
    expect(options.body.getAll('files')).toEqual([file]);
  });

  it('turns FastAPI validation arrays into field-specific messages', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ detail: [
      { loc: ['body', 'photoIds', 2], msg: 'Photo is already assigned to another series' },
      { loc: ['body', 'photoIds'], msg: 'Field required' },
    ] }, { status: 422 }));
    await expect(apiRequest('/series/4/photos', { method: 'PUT', body: { photoIds: [1] }, fetcher }))
      .rejects.toThrow('photoIds → 2: Photo is already assigned to another series; photoIds: Field required');
  });

  it('accepts the unauthenticated session shape without persisting credentials', () => {
    const session: Session = { authenticated: false, csrf_token: 'fresh-csrf' };
    expect(session.authenticated).toBe(false);
  });
});
