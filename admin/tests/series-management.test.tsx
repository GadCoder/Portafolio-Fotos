import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeriesManagement from '../app/series-management';
import type { Photo, Series } from '../lib/api';

const session = { authenticated: true as const, user: 'admin', csrf_token: 'csrf' };
const photo: Photo = { id: 7, is_horizontal: true, photo_url: 'https://images.test/rain.jpg', name: 'rain.jpg', width: 1200, height: 800, featured: true, featuredLayout: 'contained', title: 'After rain', location: null, seriesSlug: null, created_at: '2026-01-01', seriesId: null, seriesPosition: null, showInPreview: false, previewPosition: null };

describe('series management', () => {
  it('opens and cancels the creation dialog without a request, then creates a draft and opens its editor', async () => {
    let entries: Series[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/series') && (!init?.method || init.method === 'GET')) return Response.json(entries);
      if (url.endsWith('/series') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const draft: Series = { id: 22, ...body, position: 0, published: false, totalPhotos: 0, previewPhotos: [], photos: [] };
        entries = [draft];
        return Response.json(draft, { status: 201 });
      }
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    render(<SeriesManagement active photos={[]} session={session} onChanged={async () => undefined} />);
    const opener = screen.getByRole('button', { name: 'Create series' });

    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Create series' });
    expect(screen.getByLabelText('Title')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    expect(opener).toHaveFocus();
    expect(fetcher.mock.calls.some(([url, init]) => String(url).endsWith('/series') && init?.method === 'POST')).toBe(false);

    await user.click(opener);
    await user.type(screen.getByLabelText('Title'), 'Night walks');
    await user.type(screen.getByLabelText('Slug'), 'night-walks');
    await user.type(screen.getByLabelText('Description'), 'A collection after dark.');
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByRole('heading', { name: 'Edit Night walks' })).toBeInTheDocument();
    const createRequest = fetcher.mock.calls.find(([url, init]) => String(url).endsWith('/series') && init?.method === 'POST')?.[1];
    expect(JSON.parse(String(createRequest?.body))).toEqual({ title: 'Night walks', slug: 'night-walks', description: 'A collection after dark.', published: false });
    expect(fetcher.mock.calls.some(([url, init]) => /\/series\/22\/(photos|preview)$/.test(String(url)) && init?.method === 'PUT')).toBe(false);

    await user.click(screen.getByRole('button', { name: '← Back to series' }));
    expect(screen.getByRole('heading', { name: /Series 1/ })).toBeInTheDocument();
    expect(screen.getByText('Night walks')).toBeInTheDocument();
  });

  it('reorders the full-width series list and persists the complete order', async () => {
    const entry = (id: number, title: string): Series => ({ id, slug: title.toLowerCase(), title, description: null, position: id, published: false, totalPhotos: 0, previewPhotos: [], photos: [] });
    const entries = [entry(1, 'Alpha'), entry(2, 'Beta')];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/series') && (!init?.method || init.method === 'GET')) return Response.json(entries);
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    render(<SeriesManagement active photos={[]} session={session} onChanged={async () => undefined} />);
    await screen.findByText('Alpha');
    expect(document.querySelector('.series-layout')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move Beta up' }));
    await waitFor(() => expect(fetcher.mock.calls.some(([url, init]) => String(url).endsWith('/series/order') && init?.method === 'PUT')).toBe(true));
    const request = fetcher.mock.calls.find(([url, init]) => String(url).endsWith('/series/order') && init?.method === 'PUT')?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({ seriesIds: [2, 1] });
  });

  it('requires explicit confirmation before assigning unassigned photos to Street Photography', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/series') && (!init?.method || init.method === 'GET')) return Response.json([]);
      if (url.endsWith('/series') && init?.method === 'POST') return Response.json({ id: 11, slug: 'street-photography', title: 'Street Photography', description: null, position: 0, published: false, totalPhotos: 0, previewPhotos: [], photos: [] });
      if (url.endsWith('/photos') && init?.method === 'PUT') return new Response(null, { status: 204 });
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetcher);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<SeriesManagement active photos={[photo]} session={session} onChanged={async () => undefined} />);
    await user.click(await screen.findByLabelText('After rain'));
    await user.click(screen.getByRole('button', { name: /assign 1 selected to street photography/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Assign 1 selected unassigned photo'));
    expect(fetcher.mock.calls.some(([url, init]) => String(url).endsWith('/photos') && init?.method === 'PUT')).toBe(false);

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /assign 1 selected to street photography/i }));
    await waitFor(() => expect(fetcher.mock.calls.some(([url, init]) => String(url).endsWith('/series/11/photos') && init?.method === 'PUT')).toBe(true));
    const assignment = fetcher.mock.calls.find(([url, init]) => String(url).endsWith('/series/11/photos') && init?.method === 'PUT')?.[1];
    expect(JSON.parse(String(assignment?.body))).toEqual({ photoIds: [7] });
    expect(screen.getByText(/assigned to street photography/i)).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('orders preview photos independently and unpublishes before applying an empty preview', async () => {
    const photos = Array.from({ length: 6 }, (_, index): Photo => ({ ...photo, id: index + 1, name: `photo-${index + 1}.jpg`, title: `Photo ${index + 1}`, seriesId: 3, seriesPosition: index, showInPreview: index < 2, previewPosition: index < 2 ? index : null }));
    const series = { id: 3, slug: 'streets', title: 'Street scenes', description: null, position: 0, published: true, totalPhotos: 6, photos, previewPhotos: photos.slice(0, 2) };
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/series') && (!init?.method || init.method === 'GET')) return Response.json([series]);
      if (init?.method === 'PUT' || init?.method === 'PATCH') return new Response(null, { status: 204 });
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    render(<SeriesManagement active photos={photos} session={session} onChanged={async () => undefined} />);
    await user.click(await screen.findByRole('button', { name: 'Edit' }));

    const tiles = document.querySelectorAll('.preview-tile');
    fireEvent.dragStart(tiles[0]); fireEvent.dragOver(tiles[1]); fireEvent.drop(tiles[1]);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fetcher.mock.calls.some(([url, init]) => String(url).endsWith('/series/3/preview') && init?.method === 'PUT')).toBe(true));
    let previewRequest = fetcher.mock.calls.find(([url, init]) => String(url).endsWith('/series/3/preview') && init?.method === 'PUT')?.[1];
    expect(JSON.parse(String(previewRequest?.body))).toEqual({ photoIds: [2, 1] });

    const visibleTiles = document.querySelectorAll('.preview-tile');
    for (const tile of Array.from(visibleTiles)) {
      const remove = tile.querySelector('button.danger');
      if (remove) await user.click(remove);
    }
    const beforeUnpublish = fetcher.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(fetcher.mock.calls.slice(beforeUnpublish).some(([url, init]) => String(url).endsWith('/series/3/photos') && init?.method === 'PUT')).toBe(true));
    const changes = fetcher.mock.calls.slice(beforeUnpublish);
    expect(changes[0][1]?.method).toBe('PATCH');
    expect(JSON.parse(String(changes[0][1]?.body))).toEqual({ published: false });
    previewRequest = changes.find(([url, init]) => String(url).endsWith('/series/3/preview') && init?.method === 'PUT')?.[1];
    expect(JSON.parse(String(previewRequest?.body))).toEqual({ photoIds: [] });
  });

  it('rejects dragging an unselected photo into a full homepage preview', async () => {
    const photos = Array.from({ length: 6 }, (_, index): Photo => ({ ...photo, id: index + 1, name: `photo-${index + 1}.jpg`, title: `Photo ${index + 1}`, seriesId: 3, seriesPosition: index, showInPreview: index < 5, previewPosition: index < 5 ? index : null }));
    const series: Series = { id: 3, slug: 'streets', title: 'Street scenes', description: null, position: 0, published: false, totalPhotos: 6, photos, previewPhotos: photos.slice(0, 5) };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json([series]));
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    render(<SeriesManagement active photos={photos} session={session} onChanged={async () => undefined} />);
    await user.click(await screen.findByRole('button', { name: 'Edit' }));

    const source = document.querySelectorAll('.curation-drag-handle')[5];
    const preview = document.querySelector('.preview-tiles');
    const firstTile = document.querySelector('.preview-tile');
    expect(source).toBeTruthy(); expect(preview).toBeTruthy(); expect(firstTile).toBeTruthy();
    fireEvent.dragStart(source!);
    fireEvent.dragOver(preview!);
    expect(await screen.findByRole('status')).toHaveTextContent('Preview is full. Remove a photo before adding another.');
    expect(preview).toHaveClass('is-full');
    fireEvent.drop(firstTile!);
    expect(document.querySelectorAll('.preview-tile')).toHaveLength(5);
    fireEvent.dragEnd(source!);
    await waitFor(() => expect(screen.queryByText(/Preview is full/)).not.toBeInTheDocument());
    expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });
});
