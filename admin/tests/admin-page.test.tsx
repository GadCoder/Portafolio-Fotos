import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPage from '../app/page';

const session = { authenticated: true, user: 'admin', csrf_token: 'token' };
const photo = { id: 7, is_horizontal: true, photo_url: 'https://images.test/rain.jpg', name: 'rain.jpg', width: 1200, height: 800, featured: false, featuredLayout: null, title: null, location: null, seriesSlug: null, created_at: '2026-01-01' };

function mockApi(
  uploadResults: unknown = { results: [] },
  deployResponse: Response = Response.json({ status: 'queued' }, { status: 202 }),
) {
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/session')) return Response.json(session);
    if (url.endsWith('/photos') && (!init?.method || init.method === 'GET')) return Response.json([photo]);
    if (url.endsWith('/presentation')) return Response.json({ ...photo, ...JSON.parse(String(init?.body)) });
    if (url.endsWith('/upload')) return Response.json(uploadResults);
    if (url.endsWith('/deploy')) return deployResponse;
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json([]);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('admin gallery', () => {
  it('switches between accessible Photos and Series tabs', async () => {
    mockApi();
    const user = userEvent.setup();
    render(<AdminPage />);
    const photosTab = await screen.findByRole('tab', { name: 'Photos' });
    const seriesTab = screen.getByRole('tab', { name: 'Series' });
    expect(photosTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Photos' })).toBeVisible();
    expect(document.getElementById('series-panel')).toHaveAttribute('hidden');

    await user.click(seriesTab);
    expect(seriesTab).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById('series-panel')).not.toHaveAttribute('hidden');
    expect(screen.getByRole('heading', { name: /Series 0/ })).toBeInTheDocument();

    seriesTab.focus();
    await user.keyboard('{ArrowLeft}');
    expect(photosTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(photosTab).toHaveFocus());
  });

  it.each([{}, { results: 'bad' }, { results: [{ filename: 'x.jpg' }] }])('rejects malformed upload response %j without completing upload', async (response) => {
    const fetch = mockApi(response);
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'rain.jpg' });
    const input = screen.getByLabelText('Choose images') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: 'Upload selected' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid upload response/i);
    expect(screen.queryByText(/uploaded successfully/i)).not.toBeInTheDocument();
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/photos') && !String(url).endsWith('/upload'))).toHaveLength(1);
    expect(input.files).toHaveLength(1);
  });

  it('restores session and sends edits from the dedicated presentation editor', async () => {
    const fetch = mockApi();
    const user = userEvent.setup();
    const originalPath = window.location.pathname;
    window.history.replaceState({}, '', '/photos/7/edit');
    try {
      render(<AdminPage />);
      const editor = await screen.findByRole('dialog');
      expect(within(editor).getByLabelText('Title')).toHaveValue('');
      fetch.mockResolvedValueOnce(Response.json({ detail: 'Save failed' }, { status: 500 }));
      const title = within(editor).getByLabelText('Title');
      await user.type(title, 'After rain');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
      const request = fetch.mock.calls.find(([url]) => String(url).endsWith('/presentation'))?.[1];
      expect(request?.headers).toMatchObject({ 'X-CSRF-Token': 'token' });
      expect(JSON.parse(String(request?.body))).toMatchObject({ title: 'After rain' });
    } finally {
      window.history.replaceState({}, '', originalPath);
    }
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

  it('requests a public gallery deployment and reports that it was queued', async () => {
    const fetch = mockApi();
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'rain.jpg' });
    await user.click(screen.getByRole('button', { name: 'Deploy public gallery' }));

    expect(await screen.findByText(/deployment queued/i)).toBeInTheDocument();
    const request = fetch.mock.calls.find(([url]) => String(url).endsWith('/deploy'))?.[1];
    expect(request?.method).toBe('POST');
    expect(request?.headers).toMatchObject({ 'X-CSRF-Token': 'token' });
  });

  it('reports deployment configuration errors without claiming success', async () => {
    mockApi(undefined, Response.json({ detail: 'Cloudflare Pages deploy hook is not configured' }, { status: 503 }));
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'rain.jpg' });
    await user.click(screen.getByRole('button', { name: 'Deploy public gallery' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/deploy hook is not configured/i);
    expect(screen.queryByText(/deployment queued/i)).not.toBeInTheDocument();
  });

  it('requires confirmation before deleting a photo', async () => {
    const fetch = mockApi();
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByRole('heading', { name: 'rain.jpg' });
    const opener = screen.getByRole('button', { name: /delete/i });
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
    const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); fireEvent(this, new Event('close')); });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModal });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(showModal).toHaveBeenCalled();
    expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/photos/7') && init?.method === 'DELETE')).toBe(false);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/photos/7') && init?.method === 'DELETE')).toBe(false);
    await waitFor(() => expect(opener).toHaveFocus());
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/photos/7') && init?.method === 'DELETE')).toBe(false);
    await waitFor(() => expect(opener).toHaveFocus());
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Delete photo' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/photos/7') && init?.method === 'DELETE')).toBe(true));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Photo library/ })).toHaveFocus());
  });
});
