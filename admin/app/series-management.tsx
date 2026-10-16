import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { apiRequest, type Photo, type Series, type SessionResponse } from '../lib/api';
import { adminPhotoUrl } from '../lib/photos';
import { galleryRows, imageDimensions } from '../lib/gallery-preview';

type Props = { active: boolean; photos: Photo[]; session: Extract<SessionResponse, { authenticated: true }>; onChanged: () => Promise<unknown> };
const reorder = <T,>(items: T[], from: number, to: number) => { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; };

export default function SeriesManagement({ active: isActive, photos, session, onChanged }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selected, setSelected] = useState<Series | null>(null);
  const [title, setTitle] = useState(''); const [slug, setSlug] = useState(''); const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [createOpen, setCreateOpen] = useState(false); const [createTitle, setCreateTitle] = useState(''); const [createSlug, setCreateSlug] = useState(''); const [createDescription, setCreateDescription] = useState(''); const [createYear, setCreateYear] = useState(''); const [createError, setCreateError] = useState('');
  const [addPhotosOpen, setAddPhotosOpen] = useState(false); const [addPhotoIds, setAddPhotoIds] = useState<number[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<number[]>([]); const [previewIds, setPreviewIds] = useState<number[]>([]);
  const [bulkIds, setBulkIds] = useState<number[]>([]); const [bulkSeriesId, setBulkSeriesId] = useState(''); const [draggedSeries, setDraggedSeries] = useState<number | null>(null); const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null); const [draggedPreview, setDraggedPreview] = useState<number | null>(null); const [dropTargetPhotoId, setDropTargetPhotoId] = useState<number | null>(null); const [dropTargetPreviewId, setDropTargetPreviewId] = useState<number | null>(null); const [justDroppedId, setJustDroppedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [toast, setToast] = useState('');
  const reorderLock = useRef(false);
  const createDialogRef = useRef<HTMLDialogElement>(null); const createTitleRef = useRef<HTMLInputElement>(null); const createOpenerRef = useRef<HTMLButtonElement>(null); const editorHeadingRef = useRef<HTMLHeadingElement>(null); const createdDraftRef = useRef(false);
  const addPhotosDialogRef = useRef<HTMLDialogElement>(null); const addPhotosOpenerRef = useRef<HTMLButtonElement>(null);
  const previewDialogRef = useRef<HTMLDialogElement>(null); const previewOpenerRef = useRef<HTMLButtonElement>(null);

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
  useEffect(() => {
    const dialog = addPhotosDialogRef.current;
    if (addPhotosOpen && dialog && !dialog.open) dialog.showModal();
    else if (!addPhotosOpen && dialog?.open) dialog.close();
  }, [addPhotosOpen]);
  useEffect(() => {
    const dialog = previewDialogRef.current;
    if (previewOpen && dialog && !dialog.open) dialog.showModal();
    else if (!previewOpen && dialog?.open) dialog.close();
  }, [previewOpen]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const current = useMemo(() => series.find((item) => item.id === selected?.id) ?? selected, [series, selected]);
  const unassigned = photos.filter((photo) => photo.seriesId == null);
  const homepagePhotoIds = memberIds.length <= 5 ? memberIds : previewIds;
  const homepagePhotos = homepagePhotoIds.map((id) => photos.find((photo) => photo.id === id)).filter((photo): photo is Photo => Boolean(photo));
  const draggedPhotoBlocked = draggedPhoto !== null && previewIds.length >= 6 && !previewIds.includes(draggedPhoto);
  function edit(item: Series) { setSelected(item); setTitle(item.title); setSlug(item.slug); setDescription(item.description ?? ''); setYear(item.year?.toString() ?? ''); setMemberIds(item.photos.map((photo) => photo.id)); setPreviewIds(item.previewPhotos.map((photo) => photo.id)); setError(''); setNotice(''); setView('edit'); requestAnimationFrame(() => editorHeadingRef.current?.focus()); }
  function backToList() { setView('list'); setError(''); setNotice(''); requestAnimationFrame(() => document.getElementById('series-list-heading')?.focus()); }
  function closeCreateDialog() { if (busy) return; setCreateOpen(false); setCreateError(''); setCreateTitle(''); setCreateSlug(''); setCreateDescription(''); setCreateYear(''); requestAnimationFrame(() => createOpenerRef.current?.focus()); }
  function closeAddPhotosDialog() { setAddPhotosOpen(false); setAddPhotoIds([]); requestAnimationFrame(() => addPhotosOpenerRef.current?.focus()); }
  function addSelectedPhotos() {
    const availableIds = new Set(unassigned.map((photo) => photo.id));
    const additions = addPhotoIds.filter((id) => availableIds.has(id) && !memberIds.includes(id));
    setMemberIds((existing) => [...existing, ...additions]);
    setAddPhotosOpen(false); setAddPhotoIds([]);
    if (additions.length) {
      const message = `${additions.length} photo${additions.length === 1 ? '' : 's'} added to the series draft. Save changes to keep them.`;
      setNotice(message); setToast(message);
    }
    requestAnimationFrame(() => addPhotosOpenerRef.current?.focus());
  }
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
      if (publish && memberIds.length > 5 && (previewIds.length < 1 || previewIds.length > 6)) throw new Error('Select between one and six homepage preview photos before publishing a series with more than five photos.');
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
      const successMessage = publish === undefined ? 'Series changes saved.' : publish ? 'Series published.' : 'Series saved as draft.';
      setNotice(successMessage); setToast(successMessage);
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
    else if (limit && ids.length >= limit) setError('Choose no more than six preview photos.');
    else set([...ids, id]);
  };
  function dropIntoPreview(id: number, index = previewIds.length) {
    if (busy) return;
    if (!previewIds.includes(id) && previewIds.length >= 6) return;
    if (previewIds.includes(id)) {
      const from = previewIds.indexOf(id);
      setPreviewIds(reorder(previewIds, from, Math.min(index, previewIds.length - 1)));
    } else if (previewIds.length < 6) {
      const next = [...previewIds];
      next.splice(index, 0, id);
      setPreviewIds(next);
    }
    setJustDroppedId(id);
    setDraggedPhoto(null);
    setDraggedPreview(null);
    setDropTargetPhotoId(null);
    setDropTargetPreviewId(null);
  }
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
          <div className="curation-column"><div className="curation-column-heading"><h3>Full series order <span className="muted">({memberIds.length})</span></h3><button ref={addPhotosOpenerRef} className="quiet add-series-photos-opener" disabled={busy || !unassigned.some((photo) => !memberIds.includes(photo.id))} onClick={() => { setAddPhotoIds([]); setAddPhotosOpen(true); }}>Add new photos</button></div><p className="muted">Drag photos to reorder them, or drag one into the homepage preview.</p>
            <div className="curation-list">{memberIds.map((id, index) => { const photo = photos.find((entry) => entry.id === id); if (!photo) return null; return <div className={`curation-photo ${draggedPhoto === id ? 'is-dragging' : ''} ${dropTargetPhotoId === id ? 'is-drop-target' : ''} ${justDroppedId === id ? 'just-dropped' : ''}`} key={id} onAnimationEnd={() => { if (justDroppedId === id) setJustDroppedId(null); }} onDragOver={(event) => { event.preventDefault(); if (draggedPhoto !== null && draggedPhoto !== id) { setDropTargetPhotoId(id); setDropTargetPreviewId(null); } }} onDrop={(event) => { event.preventDefault(); if (busy || draggedPhoto === null || draggedPhoto === id) return; const from = memberIds.indexOf(draggedPhoto); setMemberIds(reorder(memberIds, from, index)); setJustDroppedId(draggedPhoto); setDraggedPhoto(null); setDropTargetPhotoId(null); }}><span className="curation-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="curation-drag-handle" role="img" aria-label={`Drag ${photo.name} to reorder or add to homepage preview`} title="Drag to reorder or add to homepage preview" draggable={!busy} onDragStart={(event) => { setDraggedPhoto(id); if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(id)); const row = event.currentTarget.closest('.curation-photo'); if (row) event.dataTransfer.setDragImage(row, Math.min(30, row.clientWidth / 2), row.clientHeight / 2); } }} onDragEnd={() => { setDraggedPhoto(null); setDropTargetPhotoId(null); setDropTargetPreviewId(null); }}>⠿</span><img src={adminPhotoUrl(photo.photo_url, 240)} alt="" /><span className="curation-photo-title">{photo.title || photo.name}{photo.featured ? <small className="featured-mark"> · Featured {photo.featuredLayout ?? 'wide'}</small> : null}</span><button className="danger" disabled={busy} onClick={() => { setMemberIds(memberIds.filter((value) => value !== id)); setPreviewIds(previewIds.filter((value) => value !== id)); }}>Remove</button></div>; })}</div>
          </div>
          <div className="curation-column homepage-preview-column"><div className="curation-column-heading"><h3>Homepage preview <span className="muted">({previewIds.length}/6)</span></h3><button ref={previewOpenerRef} className="quiet" onClick={() => setPreviewOpen(true)}>Preview</button></div><p className="muted">Choose and order up to six. Featured styling carries through to the public gallery.</p>
            <div className={`preview-tiles ${draggedPhoto !== null && !draggedPhotoBlocked ? 'is-drop-target' : ''} ${draggedPhotoBlocked ? 'is-full' : ''}`} onDragOver={(event) => { if (draggedPhotoBlocked) { if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'; setDropTargetPhotoId(null); setDropTargetPreviewId(null); return; } if (draggedPhoto !== null) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; setDropTargetPhotoId(null); setDropTargetPreviewId(null); } }} onDrop={(event) => { event.preventDefault(); if (draggedPhoto !== null && !draggedPhotoBlocked) dropIntoPreview(draggedPhoto); }}>
              {draggedPhotoBlocked && <p className="preview-limit-notice" role="status"><span aria-hidden="true">⊘</span> Preview is full. Remove a photo before adding another.</p>}
              {previewIds.map((id, index) => { const photo = photos.find((entry) => entry.id === id); return photo ? <div key={id} draggable={!busy} onDragStart={(event) => { setDraggedPreview(id); if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(id)); } }} onDragEnd={() => { setDraggedPreview(null); setDropTargetPreviewId(null); }} onAnimationEnd={() => { if (justDroppedId === id) setJustDroppedId(null); }} onDragOver={(event) => { if (draggedPhotoBlocked) { if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'; return; } if ((draggedPhoto !== null && draggedPhoto !== id) || (draggedPreview !== null && draggedPreview !== id)) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; setDropTargetPreviewId(id); setDropTargetPhotoId(null); } }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedPhoto !== null && !draggedPhotoBlocked) dropIntoPreview(draggedPhoto, index); else if (draggedPreview !== null && draggedPreview !== id) { setPreviewIds(reorder(previewIds, previewIds.indexOf(draggedPreview), index)); setJustDroppedId(draggedPreview); setDraggedPreview(null); setDropTargetPreviewId(null); } }} className={`preview-tile ${photo.featured ? 'is-featured' : ''} ${dropTargetPreviewId === id ? 'is-drop-target' : ''} ${draggedPreview === id ? 'is-dragging' : ''} ${justDroppedId === id ? 'just-dropped' : ''}`}><img src={adminPhotoUrl(photo.photo_url, 280)} alt={photo.title || photo.name} /><span>{photo.title || photo.name}</span>{photo.featured && <b>Featured · {photo.featuredLayout ?? 'wide'}</b>}<div><button className="danger" disabled={busy} onClick={() => setPreviewIds(previewIds.filter((value) => value !== id))}>Remove</button></div></div> : null; })}
              {!previewIds.length && <p className="preview-drop-hint">Drop photos here from the full series order.</p>}
            </div>
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
    <dialog ref={addPhotosDialogRef} className="add-series-photos-dialog" aria-label="Add new photos" onCancel={(event) => { event.preventDefault(); closeAddPhotosDialog(); }} onClose={() => { if (!addPhotosOpen) requestAnimationFrame(() => addPhotosOpenerRef.current?.focus()); }}>
      {addPhotosOpen && <div className="add-series-photos-content"><p className="eyebrow">SERIES PHOTOS</p><h2 id="add-series-photos-heading">Add new photos</h2><p className="muted">Select unassigned photos to add to the end of this series order. Save changes to keep them.</p>
        <div className="add-series-photos-list" aria-label="Available unassigned photos">{unassigned.filter((photo) => !memberIds.includes(photo.id)).map((photo) => <label className={`add-series-photo-choice ${addPhotoIds.includes(photo.id) ? 'is-selected' : ''}`} key={photo.id}><input type="checkbox" disabled={busy} checked={addPhotoIds.includes(photo.id)} onChange={() => toggleId(addPhotoIds, setAddPhotoIds, photo.id)} /><img src={adminPhotoUrl(photo.photo_url, 320)} alt="" loading="lazy" /><span>{photo.title || photo.name}</span></label>)}{!unassigned.some((photo) => !memberIds.includes(photo.id)) && <p className="muted">There are no unassigned photos available.</p>}</div>
        <div className="actions"><button className="primary" disabled={busy || !addPhotoIds.length} onClick={addSelectedPhotos}>Add {addPhotoIds.length ? `${addPhotoIds.length} ` : ''}selected</button><button className="quiet" disabled={busy} onClick={closeAddPhotosDialog}>Cancel</button></div>
      </div>}
    </dialog>
    <dialog ref={previewDialogRef} className="gallery-preview-dialog" aria-labelledby="gallery-preview-heading" onCancel={(event) => { event.preventDefault(); setPreviewOpen(false); }} onClose={() => { if (!previewOpen) requestAnimationFrame(() => previewOpenerRef.current?.focus()); }}>
      {previewOpen && <div className="gallery-preview-content"><header className="gallery-preview-header"><div><p className="eyebrow">PORTFOLIO PREVIEW</p><h2 id="gallery-preview-heading">{title || 'Untitled series'}{year && <span>{year}</span>}</h2>{description && <p>{description}</p>}</div><button className="quiet" aria-label="Close preview" onClick={() => setPreviewOpen(false)}>Close</button></header>
        <div className="gallery-preview-gallery" aria-label="Preview of the public gallery">{galleryRows(homepagePhotos).map((row) => {
          const rowPhotos = row.indices.map((index) => homepagePhotos[index]);
          if (row.featured && rowPhotos.length > 1) return <div className="gallery-preview-feature-row" key={rowPhotos[0].id}><figure style={{ aspectRatio: `${imageDimensions(rowPhotos[0]).width} / ${imageDimensions(rowPhotos[0]).height}` }}><img src={adminPhotoUrl(rowPhotos[0].photo_url, 1200)} alt={rowPhotos[0].name} /></figure><div className="gallery-preview-companions">{rowPhotos.slice(1).map((photo) => { const dimensions = imageDimensions(photo); return <figure key={photo.id} style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}><img src={adminPhotoUrl(photo.photo_url, 900)} alt={photo.name} /></figure>; })}</div></div>;
          return <div className="gallery-preview-regular-row" key={rowPhotos[0].id}>{rowPhotos.map((photo) => { const dimensions = imageDimensions(photo); return <figure key={photo.id} style={{ flexGrow: dimensions.width / dimensions.height, aspectRatio: `${dimensions.width} / ${dimensions.height}` }}><img src={adminPhotoUrl(photo.photo_url, 1200)} alt={photo.name} /></figure>; })}</div>;
        })}{!homepagePhotos.length && <p className="gallery-preview-empty">Choose photos from the full series order to preview the public gallery.</p>}</div>
      </div>}
    </dialog>
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </section>;
}
