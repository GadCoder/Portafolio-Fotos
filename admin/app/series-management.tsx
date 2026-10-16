import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { apiRequest, type Photo, type Series, type SessionResponse } from '../lib/api';
import { adminPhotoUrl } from '../lib/photos';

type Props = { active: boolean; photos: Photo[]; session: Extract<SessionResponse, { authenticated: true }>; onChanged: () => Promise<unknown> };
const reorder = <T,>(items: T[], from: number, to: number) => { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; };

export default function SeriesManagement({ active: isActive, photos, session, onChanged }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selected, setSelected] = useState<Series | null>(null);
  const [title, setTitle] = useState(''); const [slug, setSlug] = useState(''); const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [createOpen, setCreateOpen] = useState(false); const [createTitle, setCreateTitle] = useState(''); const [createSlug, setCreateSlug] = useState(''); const [createDescription, setCreateDescription] = useState(''); const [createYear, setCreateYear] = useState(''); const [createError, setCreateError] = useState('');
  const [memberIds, setMemberIds] = useState<number[]>([]); const [previewIds, setPreviewIds] = useState<number[]>([]);
  const [bulkIds, setBulkIds] = useState<number[]>([]); const [bulkSeriesId, setBulkSeriesId] = useState(''); const [draggedSeries, setDraggedSeries] = useState<number | null>(null); const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null); const [draggedPreview, setDraggedPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const reorderLock = useRef(false);
  const createDialogRef = useRef<HTMLDialogElement>(null); const createTitleRef = useRef<HTMLInputElement>(null); const createOpenerRef = useRef<HTMLButtonElement>(null); const editorHeadingRef = useRef<HTMLHeadingElement>(null); const createdDraftRef = useRef(false);

  const load = useCallback(async () => { const result = await apiRequest<Series[]>('/series'); setSeries(result); return result; }, []);
  useEffect(() => {
    if (!isActive) return;
    let active = true;
    Promise.all([apiRequest<Series[]>('/series'), onChanged()]).then(([result]) => { if (active) setSeries(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load series.'); });
    return () => { active = false; };
  }, [isActive, onChanged]);
  useEffect(() => {
    const dialog = createDialogRef.current;
    if (createOpen && dialog && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => createTitleRef.current?.focus());
    } else if (!createOpen && dialog?.open) dialog.close();
  }, [createOpen]);
  const current = useMemo(() => series.find((item) => item.id === selected?.id) ?? selected, [series, selected]);
  const membershipChoices = photos.filter((photo) => photo.seriesId == null || photo.seriesId === current?.id);
  const unassigned = photos.filter((photo) => photo.seriesId == null);
  const homepagePhotoIds = memberIds.length <= 5 ? memberIds : previewIds;
  function edit(item: Series) { setSelected(item); setTitle(item.title); setSlug(item.slug); setDescription(item.description ?? ''); setYear(item.year?.toString() ?? ''); setMemberIds(item.photos.map((photo) => photo.id)); setPreviewIds(item.previewPhotos.map((photo) => photo.id)); setError(''); setNotice(''); setView('edit'); requestAnimationFrame(() => editorHeadingRef.current?.focus()); }
  function backToList() { setView('list'); setError(''); setNotice(''); requestAnimationFrame(() => document.getElementById('series-list-heading')?.focus()); }
  function closeCreateDialog() { if (busy) return; setCreateOpen(false); setCreateError(''); setCreateTitle(''); setCreateSlug(''); setCreateDescription(''); setCreateYear(''); requestAnimationFrame(() => createOpenerRef.current?.focus()); }
  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setCreateError('');
    try {
      const created = await apiRequest<Series>('/series', { method: 'POST', csrfToken: session.csrf_token, body: { title: createTitle.trim(), slug: createSlug.trim(), description: createDescription.trim() || null, year: createYear === '' ? null : Number(createYear), published: false } });
      const refreshed = await load();
      const draft = refreshed.find((item) => item.id === created.id) ?? created;
      createdDraftRef.current = true;
      setCreateOpen(false); setCreateTitle(''); setCreateSlug(''); setCreateDescription(''); setCreateYear('');
      setSelected(draft); setTitle(draft.title); setSlug(draft.slug); setDescription(draft.description ?? ''); setYear(draft.year?.toString() ?? ''); setMemberIds(draft.photos.map((photo) => photo.id)); setPreviewIds(draft.previewPhotos.map((photo) => photo.id)); setView('edit');
      requestAnimationFrame(() => editorHeadingRef.current?.focus());
    } catch (reason) { setCreateError(reason instanceof Error ? reason.message : 'Could not create series draft.'); }
    finally { setBusy(false); }
  }
  async function saveSeries(publish?: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (publish && memberIds.length > 5 && (previewIds.length < 1 || previewIds.length > 5)) throw new Error('Select between one and five homepage preview photos before publishing a series with more than five photos.');
      const finalPublished = publish ?? current?.published ?? false;
      if (finalPublished && memberIds.length > 5 && !previewIds.length) throw new Error('This published series needs a homepage preview. Unpublish it first, then update its membership and preview.');
      let item = current;
      const metadata = { title: title.trim(), slug: slug.trim(), description: description.trim() || null, year: year === '' ? null : Number(year) };
      if (!metadata.title || !metadata.slug) throw new Error('Add a title and URL slug before saving.');
      if (!item) { item = await apiRequest<Series>('/series', { method: 'POST', csrfToken: session.csrf_token, body: { ...metadata, published: false } }); setSelected(item); }
      else {
        const curationChanged = JSON.stringify(memberIds) !== JSON.stringify(item.photos.map((photo) => photo.id)) || JSON.stringify(previewIds) !== JSON.stringify(item.previewPhotos.map((photo) => photo.id));
        if (item.published && (publish === false || curationChanged)) await apiRequest(`/series/${item.id}`, { method: 'PATCH', csrfToken: session.csrf_token, body: { published: false } });
        await apiRequest(`/series/${item.id}`, { method: 'PATCH', csrfToken: session.csrf_token, body: metadata });
      }
      await apiRequest(`/series/${item.id}/photos`, { method: 'PUT', csrfToken: session.csrf_token, body: { photoIds: memberIds } });
      await apiRequest(`/series/${item.id}/preview`, { method: 'PUT', csrfToken: session.csrf_token, body: { photoIds: previewIds } });
      if (!item) throw new Error('Could not create the series.');
      if (publish !== undefined || (current?.published && (JSON.stringify(memberIds) !== JSON.stringify(current.photos.map((photo) => photo.id)) || JSON.stringify(previewIds) !== JSON.stringify(current.previewPhotos.map((photo) => photo.id))))) await apiRequest(`/series/${item.id}`, { method: 'PATCH', csrfToken: session.csrf_token, body: { published: finalPublished } });
      await load(); await onChanged();
      const refreshed = await apiRequest<Series[]>('/series'); const saved = refreshed.find((entry) => entry.id === item?.id); if (saved) edit(saved);
      setNotice(publish === undefined ? 'Series changes saved.' : publish ? 'Series published.' : 'Series saved as draft.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save series.'); }
    finally { setBusy(false); }
  }
  async function reorderSeries(next: Series[]) { if (busy || reorderLock.current) return; reorderLock.current = true; setBusy(true); setSeries(next); setError(''); try { await apiRequest('/series/order', { method: 'PUT', csrfToken: session.csrf_token, body: { seriesIds: next.map((item) => item.id) } }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not reorder series.'); await load(); } finally { reorderLock.current = false; setBusy(false); } }
  async function assignUnassigned() {
    const target = series.find((item) => item.id === Number(bulkSeriesId));
    if (!bulkIds.length || !target) return;
    if (!window.confirm(`Assign ${bulkIds.length} selected unassigned photo${bulkIds.length === 1 ? '' : 's'} to “${target.title}”?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const ids = [...target.photos.map((photo) => photo.id), ...bulkIds.filter((id) => !target.photos.some((photo) => photo.id === id))];
      await apiRequest(`/series/${target.id}/photos`, { method: 'PUT', csrfToken: session.csrf_token, body: { photoIds: ids } });
      setBulkIds([]); await load(); await onChanged(); setNotice(`Selected photos assigned to “${target.title}”.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not assign photos.'); }
    finally { setBusy(false); }
  }
  async function removeSeries() {
    if (!current || !window.confirm(`Delete “${current.title}”? Its photos will be detached from the series.`)) return;
    setBusy(true); setError(''); try { await apiRequest(`/series/${current.id}`, { method: 'DELETE', csrfToken: session.csrf_token }); setSelected(null); setView('list'); await load(); await onChanged(); setNotice('Series deleted; photos remain in the library.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete series.'); } finally { setBusy(false); }
  }

  const toggleId = (ids: number[], set: (next: number[]) => void, id: number, limit?: number) => {
    if (ids.includes(id)) set(ids.filter((value) => value !== id));
    else if (limit && ids.length >= limit) setError('Choose no more than five preview photos.');
    else set([...ids, id]);
  };
  return <section className="series-management" aria-labelledby={view === 'list' ? 'series-list-heading' : 'series-editor-heading'} hidden={!isActive}>
    {view === 'list' ? <>
      <div className="series-heading"><div><p className="eyebrow">CURATION</p><h2 id="series-list-heading" tabIndex={-1}>Series <span className="count">{series.length}</span></h2><p className="muted">Arrange published collections and continue editing drafts.</p></div><button ref={createOpenerRef} className="primary" disabled={busy} onClick={() => { setCreateError(''); setCreateOpen(true); }}>Create series</button></div>
      {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
      <div className="series-list" aria-label="Series ordering">
        {series.map((item, index) => {
          const cover = item.previewPhotos[0] ?? item.photos[0];
          return <article className="series-row" key={item.id} draggable={!busy} onDragStart={() => setDraggedSeries(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (busy || draggedSeries === null || draggedSeries === item.id) return; const from = series.findIndex((entry) => entry.id === draggedSeries); void reorderSeries(reorder(series, from, index)); setDraggedSeries(null); }}>
            <span className="drag-mark" aria-hidden="true">⠿</span>
            <div className="series-cover">{cover ? <img src={adminPhotoUrl(cover.photo_url, 240)} alt="" /> : <span aria-hidden="true">No cover</span>}</div>
            <div className="series-row-info"><h3>{item.title}</h3><p>{item.description || item.slug}</p><div><span className={item.published ? 'status published' : 'status'}>{item.published ? 'Published' : 'Draft'}</span><span className="series-count">{item.totalPhotos} photos</span>{item.year != null && <span className="series-count">{item.year}</span>}</div></div>
            <div className="series-row-actions"><button className="quiet" aria-label={`Move ${item.title} up`} disabled={busy || index === 0} onClick={() => void reorderSeries(reorder(series, index, index - 1))}>↑</button><button className="quiet" aria-label={`Move ${item.title} down`} disabled={busy || index === series.length - 1} onClick={() => void reorderSeries(reorder(series, index, index + 1))}>↓</button><button className="primary" disabled={busy} onClick={() => edit(item)}>Edit</button></div>
          </article>;
        })}
        {!series.length && <div className="series-empty"><h3>No series yet</h3><p>Create a draft series to start curating photos.</p></div>}
      </div>
      <details className="bulk-assignment"><summary>Assign unassigned photos</summary><p className="muted">Choose a destination series and the photos to add. You’ll confirm before the assignment is saved.</p>
        {series.length > 0 && <label className="bulk-series-select">Destination series<select disabled={busy} value={bulkSeriesId} onChange={(event) => setBulkSeriesId(event.target.value)}><option value="">Choose a series…</option>{series.map((item) => <option key={item.id} value={item.id}>{item.title}{item.published ? ' · Published' : ' · Draft'}</option>)}</select></label>}
        {!series.length && <p className="muted">Create a series before assigning photos.</p>}
        <div className="bulk-choices" aria-label="Unassigned photos">{unassigned.map((photo) => <label className="bulk-photo-choice" key={photo.id}><input type="checkbox" disabled={busy} checked={bulkIds.includes(photo.id)} onChange={() => toggleId(bulkIds, setBulkIds, photo.id)} /><img src={adminPhotoUrl(photo.photo_url, 180)} alt="" loading="lazy" /><span>{photo.title || photo.name}</span></label>)}{!unassigned.length && <p className="muted">All photos are assigned to a series.</p>}</div>
        <button className="quiet" disabled={!bulkIds.length || !bulkSeriesId || busy} onClick={() => void assignUnassigned()}>Assign {bulkIds.length || ''} selected {bulkSeriesId ? `to ${series.find((item) => item.id === Number(bulkSeriesId))?.title ?? 'series'}` : 'to series'}</button>
      </details>
    </> : <>
      <div className="series-editor-header"><button className="quiet" disabled={busy} onClick={backToList}>← Back to series</button><div><p className="eyebrow">SERIES EDITOR</p><h2 id="series-editor-heading" ref={editorHeadingRef} tabIndex={-1}>{current ? `Edit ${current.title}` : 'Series editor'}</h2><p className="muted">Changes are saved when you choose Save or Publish.</p></div></div>
      {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
      <div className="series-editor">
        <div className="series-metadata"><label>Title<input disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Slug<input disabled={busy} value={slug} onChange={(event) => setSlug(event.target.value)} /></label><label>Year<input type="number" min="1800" max="2200" disabled={busy} value={year} onChange={(event) => setYear(event.target.value)} /></label><label>Description<textarea disabled={busy} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div>
        <div className="series-curation-grid">
          <div className="curation-column"><h3>Full series order <span className="muted">({memberIds.length})</span></h3><p className="muted">Drag to reorder. Move buttons support keyboard access.</p>
            <div className="curation-list">{memberIds.map((id, index) => { const photo = photos.find((entry) => entry.id === id); if (!photo) return null; return <div className="curation-photo" key={id} draggable={!busy} onDragStart={() => setDraggedPhoto(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (busy || draggedPhoto === null || draggedPhoto === id) return; const from = memberIds.indexOf(draggedPhoto); setMemberIds(reorder(memberIds, from, index)); setDraggedPhoto(null); }}><img src={adminPhotoUrl(photo.photo_url, 150)} alt="" /><span>{photo.title || photo.name}{photo.featured ? <small className="featured-mark"> · Featured {photo.featuredLayout ?? 'wide'}</small> : null}</span><button className="quiet" aria-label={`Move ${photo.name} up`} disabled={busy || !index} onClick={() => setMemberIds(reorder(memberIds, index, index - 1))}>↑</button><button className="quiet" aria-label={`Move ${photo.name} down`} disabled={busy || index === memberIds.length - 1} onClick={() => setMemberIds(reorder(memberIds, index, index + 1))}>↓</button><button className="danger" disabled={busy} onClick={() => { setMemberIds(memberIds.filter((value) => value !== id)); setPreviewIds(previewIds.filter((value) => value !== id)); }}>Remove</button></div>; })}</div>
            <label>Add available photo<select disabled={busy} value="" onChange={(event) => { const id = Number(event.target.value); if (id && !memberIds.includes(id)) setMemberIds([...memberIds, id]); }}><option value="">Choose a photo…</option>{membershipChoices.filter((photo) => !memberIds.includes(photo.id)).map((photo) => <option key={photo.id} value={photo.id}>{photo.title || photo.name}</option>)}</select></label>
          </div>
          <div className="curation-column"><h3>Homepage preview <span className="muted">({previewIds.length}/5)</span></h3><p className="muted">Choose and order up to five. Featured styling carries through to the public gallery.</p>
            <div className="preview-tiles">{previewIds.map((id, index) => { const photo = photos.find((entry) => entry.id === id); return photo ? <div key={id} draggable={!busy} onDragStart={() => setDraggedPreview(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (busy || draggedPreview === null || draggedPreview === id) return; const from = previewIds.indexOf(draggedPreview); setPreviewIds(reorder(previewIds, from, index)); setDraggedPreview(null); }} className={`preview-tile ${photo.featured ? 'is-featured' : ''}`}><img src={adminPhotoUrl(photo.photo_url, 280)} alt={photo.title || photo.name} /><span>{photo.title || photo.name}</span>{photo.featured && <b>Featured · {photo.featuredLayout ?? 'wide'}</b>}<div><button className="quiet" disabled={busy || !index} aria-label={`Move ${photo.name} preview earlier`} onClick={() => setPreviewIds(reorder(previewIds, index, Math.max(0, index - 1)))}>←</button><button className="quiet" disabled={busy || index === previewIds.length - 1} aria-label={`Move ${photo.name} preview later`} onClick={() => setPreviewIds(reorder(previewIds, index, Math.min(previewIds.length - 1, index + 1)))}>→</button><button className="danger" disabled={busy} onClick={() => setPreviewIds(previewIds.filter((value) => value !== id))}>Remove</button></div></div> : null; })}</div>
            <div className="preview-choices" aria-label="Choose preview photos">{memberIds.filter((id) => !previewIds.includes(id)).map((id) => { const photo = photos.find((entry) => entry.id === id); return photo ? <label key={id} className="check-row"><input type="checkbox" checked={false} disabled={busy || previewIds.length >= 5} onChange={() => toggleId(previewIds, setPreviewIds, id, 5)} />{photo.title || photo.name}</label> : null; })}</div>
            <div className="preview-visual" aria-label="Homepage visual preview">{homepagePhotoIds.map((id) => { const photo = photos.find((entry) => entry.id === id); return photo ? <div key={id} className={photo.featured ? `visual-featured ${photo.featuredLayout === 'contained' ? 'visual-contained' : 'visual-wide'}` : ''}><img src={adminPhotoUrl(photo.photo_url, 220)} alt="" /><span>{photo.featured ? `Featured ${photo.featuredLayout ?? 'wide'}` : 'Regular'}</span></div> : null; })}</div>
          </div>
        </div>
        <div className="actions series-actions"><button className="primary" disabled={busy} onClick={() => void saveSeries()}>{busy ? 'Saving…' : current?.published ? 'Save changes' : 'Save draft'}</button>{!current?.published && <button className="primary" disabled={busy} onClick={() => void saveSeries(true)}>Publish</button>}{current?.published && <button className="quiet" disabled={busy} onClick={() => void saveSeries(false)}>Unpublish</button>}{current && <button className="danger" disabled={busy} onClick={() => void removeSeries()}>Delete series</button>}</div>
      </div>
    </>}
    <dialog ref={createDialogRef} className="create-series-dialog" aria-labelledby="create-series-heading" onCancel={(event) => { event.preventDefault(); closeCreateDialog(); }} onClose={() => { if (createdDraftRef.current) { createdDraftRef.current = false; return; } if (!createOpen) requestAnimationFrame(() => createOpenerRef.current?.focus()); }}>
      <form className="create-series-form" onSubmit={createDraft}><p className="eyebrow">NEW COLLECTION</p><h2 id="create-series-heading">Create series</h2><p className="muted">Create a draft first, then add and arrange its photos.</p>{createError && <p className="message error" role="alert">{createError}</p>}
        <label>Title<input ref={createTitleRef} required disabled={busy} value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} /></label><label>Slug<input required disabled={busy} value={createSlug} onChange={(event) => setCreateSlug(event.target.value)} /></label><label>Year<input type="number" min="1800" max="2200" disabled={busy} value={createYear} onChange={(event) => setCreateYear(event.target.value)} /></label><label>Description<textarea rows={3} disabled={busy} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} /></label>
        <div className="actions"><button className="primary" disabled={busy}>{busy ? 'Creating draft…' : 'Create draft'}</button><button className="quiet" type="button" disabled={busy} onClick={closeCreateDialog}>Cancel</button></div>
      </form>
    </dialog>
  </section>;
}
