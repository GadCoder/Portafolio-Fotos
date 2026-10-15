import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPage from '../app/page';

const session = { authenticated: true, user: 'admin', csrf_token: 'token' };
const photo = { id: 7, is_horizontal: true, photo_url: 'https://images.test/rain.jpg', name: 'rain.jpg', width: 1200, height: 800, featured: false, featuredLayout: null, title: null, location: null, year: null, seriesSlug: null, created_at: '2026-01-01' };

function mockApi(uploadResults: unknown = { results: [] }) {
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/session')) return Response.json(session);
    if (url.endsWith('/photos') && (!init?.method || init.method === 'GET')) return Response.json([photo]);
    if (url.endsWith('/presentation')) return Response.json({ ...photo, ...JSON.parse(String(init?.body)) });
    if (url.endsWith('/upload')) return Response.json(uploadResults);
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json([]);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('admin gallery', () => {
  it('restores session, renders photos, and saves edited presentation fields', async () => {
    const fetch = mockApi();
    const user = userEvent.setup();
    render(<AdminPage />);
    expect(await screen.findByRole('heading', { name: 'rain.jpg' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /edit/i }));
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'After rain');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/presentation'))).toBe(true));
    const request = fetch.mock.calls.find(([url]) => String(url).endsWith('/presentation'))?.[1];
    expect(request?.headers).toMatchObject({ 'X-CSRF-Token': 'token' });
    expect(JSON.parse(String(request?.body))).toMatchObject({ title: 'After rain' });
  });

  it('uploads multiple files and shows every per-file API result', async () => {
    const fetch = mockApi({ results: [
      { filename: 'first.jpg', success: true, stored_name: 'stored-first.jpg' },
      { filename: 'second.jpg', success: false, error: 'Unsupported image' },
    ] });
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'rain.jpg' });
    await user.upload(screen.getByLabelText('Choose images'), [
      new File(['one'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'second.jpg', { type: 'image/jpeg' }),
    ]);
    await user.click(screen.getByRole('button', { name: 'Upload selected' }));
    const results = await screen.findByRole('list', { name: 'Per-file upload results' });
    expect(within(results).getByText('first.jpg')).toBeInTheDocument();
    expect(within(results).getByText('Success')).toBeInTheDocument();
    expect(within(results).getByText(/stored-first\.jpg/)).toBeInTheDocument();
    expect(within(results).getByText('second.jpg')).toBeInTheDocument();
    expect(within(results).getByText('Failed')).toBeInTheDocument();
    expect(within(results).getByText(/Unsupported image/)).toBeInTheDocument();
    expect(screen.queryByText('Upload finished. Per-file results are listed below.')).not.toBeInTheDocument();
    const request = fetch.mock.calls.find(([url]) => String(url).endsWith('/upload'))?.[1];
    expect(request?.headers).toMatchObject({ 'X-CSRF-Token': 'token' });
    expect((request?.body as FormData).getAll('files')).toHaveLength(2);
  });

  it('requires confirmation before deleting a photo', async () => {
    const fetch = mockApi();
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'rain.jpg' });
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/photos/7') && init?.method === 'DELETE')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Delete photo' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/photos/7') && init?.method === 'DELETE')).toBe(true));
  });
});
