import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, type Photo, type Presentation, type SessionResponse } from '../lib/api';
import { adminPhotoUrl } from '../lib/photos';

type EditState = Omit<Presentation, 'year'> & { year: number | null | string };
const emptyPresentation = (photo: Photo): EditState => ({
  featured: photo.featured, featuredLayout: photo.featuredLayout,
  title: photo.title ?? '', location: photo.location ?? '', year: photo.year,
  seriesSlug: photo.seriesSlug ?? '',
});

export default function AdminPage() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [credentials, setCredentials] = useState({ user: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResults, setUploadResults] = useState<Array<{ filename: string; success: boolean; message: string }>>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const galleryHeadingRef = useRef<HTMLHeadingElement>(null);

  const loadPhotos = useCallback(async () => {
    const result = await apiRequest<Photo[]>('/photos');
    setPhotos(result);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<SessionResponse>('/session').then(async (current) => {
      if (!active) return;
      setSession(current);
      if (current.authenticated) await loadPhotos();
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not restore session.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadPhotos]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (deleteTarget && dialog && !dialog.open) dialog.showModal();
  }, [deleteTarget]);

  function closeDeleteDialog(removed = false) {
    setDeleteTarget(null);
    requestAnimationFrame(() => {
      const opener = openerRef.current;
      if (!removed && opener?.isConnected) opener.focus();
      else galleryHeadingRef.current?.focus();
    });
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || session.authenticated) return;
    setBusy(true); setError('');
    try {
      const authenticated = await apiRequest<SessionResponse>('/login', {
        method: 'POST', csrfToken: session.csrf_token, body: credentials,
      });
      setSession(authenticated);
      setCredentials({ user: '', password: '' });
      if (authenticated.authenticated) await loadPhotos();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!session?.authenticated) return;
    setBusy(true); setError('');
    try {
      await apiRequest('/logout', { method: 'POST', csrfToken: session.csrf_token });
      const fresh = await apiRequest<SessionResponse>('/session');
      setSession(fresh); setPhotos([]); setNotice('Signed out.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign out failed.'); }
    finally { setBusy(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.authenticated) return;
    const input = event.currentTarget.elements.namedItem('files') as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) { setError('Choose one or more image files first.'); return; }
    setBusy(true); setError(''); setNotice(''); setUploadResults([]); setUploadProgress(`Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`);
    try {
      const results = await apiRequest<unknown>('/photos/upload', {
        method: 'POST', csrfToken: session.csrf_token, files,
      });
      if (!results || typeof results !== 'object' || !('results' in results) || !Array.isArray(results.results) || !results.results.every((item) => item && typeof item === 'object' && 'success' in item && typeof item.success === 'boolean')) {
        throw new Error('Invalid upload response: expected { results: [{ success: boolean, ... }] }.');
      }
      const parsed = results.results.map((result, index) => {
        const item = result as Record<string, unknown>;
        const filename = typeof item.filename === 'string' ? item.filename : `File ${index + 1}`;
        const success = item.success as boolean;
        const detail = success ? item.stored_name : item.error;
        return { filename, success, message: typeof detail === 'string' ? detail : (success ? 'Uploaded' : 'Upload failed.') };
      });
      setUploadResults(parsed);
      await loadPhotos();
      if (parsed.length) {
        const succeeded = parsed.filter((result) => result.success).length;
        setNotice(`${succeeded} of ${parsed.length} file${parsed.length === 1 ? '' : 's'} uploaded successfully.`);
      }
      input.value = '';
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Upload failed.'); }
    finally { setBusy(false); setUploadProgress(''); }
  }

  async function savePhoto(id: number) {
    if (!session?.authenticated || !draft) return;
    setBusy(true); setError(''); setNotice('');
    const payload: Presentation = {
      ...draft,
      title: draft.title?.trim() || null,
      location: draft.location?.trim() || null,
      year: draft.year === '' || draft.year === null ? null : Number(draft.year),
      seriesSlug: draft.seriesSlug?.trim() || null,
    };
    try {
      const updated = await apiRequest<Photo>(`/photos/${id}/presentation`, {
        method: 'PATCH', csrfToken: session.csrf_token, body: payload,
      });
      setPhotos((items) => items.map((item) => item.id === id ? updated : item));
      setEditing(null); setDraft(null); setNotice('Photo presentation saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  async function removePhoto() {
    if (!session?.authenticated || !deleteTarget) return;
    setBusy(true); setError('');
    try {
      await apiRequest(`/photos/${deleteTarget.id}`, { method: 'DELETE', csrfToken: session.csrf_token });
      setPhotos((items) => items.filter((item) => item.id !== deleteTarget.id));
      setNotice('Photo deleted.');
      closeDeleteDialog(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Delete failed.'); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="loading-screen" aria-busy="true">Loading admin…</main>;
  if (!session?.authenticated) return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={signIn}>
        <p className="eyebrow">PRIVATE WORKSPACE</p><h1>Photography admin</h1>
        <p className="muted">Sign in to curate and manage the portfolio.</p>
        {error && <p className="message error" role="alert">{error}</p>}
        <label>User<input autoComplete="username" required value={credentials.user} onChange={(event) => setCredentials({ ...credentials, user: event.target.value })} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );

  return <main className="admin-shell">
    <header className="topbar"><div><p className="eyebrow">PORTFOLIO MANAGEMENT</p><h1>Photography admin</h1></div><div className="account"><span>{session.user}</span><button className="quiet" onClick={signOut} disabled={busy}>Sign out</button></div></header>
    <section className="toolbar" aria-label="Photo management">
      <div><h2 ref={galleryHeadingRef} tabIndex={-1}>Photo library <span className="count">{photos.length}</span></h2><p className="muted">Manage your images and editorial presentation.</p></div>
      <form className="upload-form" onSubmit={upload}><label className="file-picker">Choose images<input name="files" type="file" accept="image/*" multiple /></label><button className="primary" disabled={busy}>Upload selected</button></form>
    </section>
    {uploadProgress && <p className="message" role="status" aria-live="polite">{uploadProgress}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}
    {uploadResults.length > 0 && <ul className="upload-results" aria-label="Per-file upload results" aria-live="polite">{uploadResults.map((result, index) => <li key={`${index}-${result.filename}`} className={result.success ? 'upload-success' : 'upload-failure'}><strong>{result.filename}</strong>: <span>{result.success ? 'Success' : 'Failed'}</span> — {result.message}</li>)}</ul>}
    {!photos.length ? <section className="empty"><h2>No photos yet</h2><p>Upload images to begin building your portfolio.</p></section> :
      <section className="gallery" aria-label="Photos">
        {photos.map((photo) => <article className="photo-card" key={photo.id}>
          <div className="image-wrap"><img src={adminPhotoUrl(photo.photo_url)} alt={photo.title || photo.name} width={photo.width ?? 1200} height={photo.height ?? 800} loading="lazy" decoding="async" />{photo.featured && <span className="badge">Featured</span>}</div>
          <div className="photo-content"><div className="photo-heading"><h2>{photo.title || photo.name}</h2><span>{photo.width ?? '—'} × {photo.height ?? '—'}</span></div>
            {(photo.location || photo.year || photo.seriesSlug) && <p className="meta">{[photo.location, photo.year, photo.seriesSlug].filter(Boolean).join(' · ')}</p>}
            {editing === photo.id && draft ? <form className="edit-form" onSubmit={(event) => { event.preventDefault(); void savePhoto(photo.id); }}>
              <label className="check-row"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked, featuredLayout: event.target.checked ? (draft.featuredLayout ?? 'wide') : null })} /> Feature photo</label>
              {draft.featured && <label>Featured layout<select value={draft.featuredLayout ?? 'wide'} onChange={(event) => setDraft({ ...draft, featuredLayout: event.target.value as Presentation['featuredLayout'] })}><option value="wide">Wide</option><option value="contained">Contained</option></select></label>}
              <label>Title<input value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label>Location<input value={draft.location ?? ''} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
              <label>Year<input type="number" min="1800" max="2200" value={draft.year ?? ''} onChange={(event) => setDraft({ ...draft, year: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              <label>Series slug<input value={draft.seriesSlug ?? ''} onChange={(event) => setDraft({ ...draft, seriesSlug: event.target.value })} /></label>
              <div className="actions"><button className="primary" disabled={busy}>Save changes</button><button type="button" className="quiet" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</button></div>
            </form> : <div className="actions"><button className="quiet" onClick={() => { setEditing(photo.id); setDraft(emptyPresentation(photo)); }}>Edit</button><button className="danger" onClick={(event) => { openerRef.current = event.currentTarget; setDeleteTarget(photo); }}>Delete</button></div>}
          </div>
        </article>)}
      </section>}
    <dialog ref={dialogRef} className="dialog" aria-labelledby="delete-heading" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); dialogRef.current?.close(); closeDeleteDialog(); }} onClose={() => { if (deleteTarget && !busy) { setDeleteTarget(null); requestAnimationFrame(() => { const opener = openerRef.current; if (opener?.isConnected) opener.focus(); else galleryHeadingRef.current?.focus(); }); } }}>
      {deleteTarget && <><h2 id="delete-heading">Delete this photo?</h2><p id="delete-description">“{deleteTarget.name}” will be permanently removed from the portfolio.</p><div className="actions"><button className="danger" onClick={() => void removePhoto()} disabled={busy}>Delete photo</button><button className="quiet" onClick={() => { dialogRef.current?.close(); closeDeleteDialog(); }} disabled={busy}>Cancel</button></div></>}
    </dialog>
  </main>;
}
