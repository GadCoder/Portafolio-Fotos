import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, type Photo, type SessionResponse } from '../lib/api';
import { adminPhotoUrl } from '../lib/photos';
import PhotoEditPage from './photo-edit-page';

export default function AdminPage() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [credentials, setCredentials] = useState({ user: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [editTarget, setEditTarget] = useState<Photo | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResults, setUploadResults] = useState<Array<{ filename: string; success: boolean; message: string }>>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (editTarget && dialog && !dialog.open) dialog.showModal();
  }, [editTarget]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function closeEditDialog() {
    editDialogRef.current?.close();
    setEditTarget(null);
    requestAnimationFrame(() => {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
      else galleryHeadingRef.current?.focus();
    });
  }

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

  async function deployGallery() {
    if (!session?.authenticated || deploying) return;
    setDeploying(true); setError(''); setNotice('');
    try {
      await apiRequest<{ status: 'queued' }>('/deploy', {
        method: 'POST', csrfToken: session.csrf_token,
      });
      setNotice('Public gallery deployment queued. It may take a few minutes to appear.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not request a gallery deployment.');
    } finally { setDeploying(false); }
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
      <div><h2 ref={galleryHeadingRef} tabIndex={-1}>Photo library <span className="count">{photos.length}</span></h2><p className="muted">Saved changes publish automatically. Deploy now to publish sooner.</p></div>
      <div className="toolbar-actions">
        <button className="quiet" type="button" onClick={() => void deployGallery()} disabled={deploying}>
          {deploying ? 'Requesting deployment…' : 'Deploy public gallery'}
        </button>
        <form className="upload-form" onSubmit={upload}><label className="file-picker">Choose images<input name="files" type="file" accept="image/*" multiple /></label><button className="primary" disabled={busy}>Upload selected</button></form>
      </div>
    </section>
    {uploadProgress && <p className="message" role="status" aria-live="polite">{uploadProgress}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    {uploadResults.length > 0 && <ul className="upload-results" aria-label="Per-file upload results" aria-live="polite">{uploadResults.map((result, index) => <li key={`${index}-${result.filename}`} className={result.success ? 'upload-success' : 'upload-failure'}><strong>{result.filename}</strong>: <span>{result.success ? 'Success' : 'Failed'}</span> — {result.message}</li>)}</ul>}
    {!photos.length ? <section className="empty"><h2>No photos yet</h2><p>Upload images to begin building your portfolio.</p></section> :
      <section className="gallery" aria-label="Photos">
        {photos.map((photo) => <article className="photo-card" key={photo.id}>
          <div className="image-wrap"><img src={adminPhotoUrl(photo.photo_url, 640)} alt={photo.title || photo.name} width={photo.width ?? 1200} height={photo.height ?? 800} loading="lazy" decoding="async" /><div className="photo-actions"><button className="quiet" onClick={(event) => { openerRef.current = event.currentTarget; setEditTarget(photo); }}>Edit</button><button className="danger" onClick={(event) => { openerRef.current = event.currentTarget; setDeleteTarget(photo); }}>Delete</button></div>{photo.featured && <span className="badge">Featured</span>}</div>
          <div className="photo-content"><div className="photo-heading"><h2>{photo.title || photo.name}</h2><span>{photo.width ?? '—'} × {photo.height ?? '—'}</span></div>
            {(photo.location || photo.year || photo.seriesSlug) && <p className="meta">{[photo.location, photo.year, photo.seriesSlug].filter(Boolean).join(' · ')}</p>}
          </div>
        </article>)}
      </section>}
    <dialog ref={dialogRef} className="dialog" aria-labelledby="delete-heading" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); dialogRef.current?.close(); closeDeleteDialog(); }} onClose={() => { if (deleteTarget && !busy) { setDeleteTarget(null); requestAnimationFrame(() => { const opener = openerRef.current; if (opener?.isConnected) opener.focus(); else galleryHeadingRef.current?.focus(); }); } }}>
      {deleteTarget && <><h2 id="delete-heading">Delete this photo?</h2><p id="delete-description">“{deleteTarget.name}” will be permanently removed from the portfolio.</p><div className="actions"><button className="danger" onClick={() => void removePhoto()} disabled={busy}>Delete photo</button><button className="quiet" onClick={() => { dialogRef.current?.close(); closeDeleteDialog(); }} disabled={busy}>Cancel</button></div></>}
    </dialog>
    <dialog ref={editDialogRef} className="edit-dialog" aria-labelledby="edit-heading" onCancel={(event) => { event.preventDefault(); closeEditDialog(); }} onClose={() => {
      if (editTarget) {
        setEditTarget(null);
        requestAnimationFrame(() => {
          const opener = openerRef.current;
          if (opener?.isConnected) opener.focus();
          else galleryHeadingRef.current?.focus();
        });
      }
    }}>
      {editTarget && <PhotoEditPage key={editTarget.id} photo={editTarget} session={session} onCancel={closeEditDialog} onSaved={(updated) => {
        setPhotos((items) => items.map((item) => item.id === updated.id ? updated : item));
        setToast('Photo saved successfully.');
        closeEditDialog();
      }} />}
    </dialog>
  </main>;
}
