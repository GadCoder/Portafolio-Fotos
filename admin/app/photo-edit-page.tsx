import { useState, type FormEvent } from 'react';
import { apiRequest, type Photo, type Presentation, type SessionResponse } from '../lib/api';
import { adminPhotoUrl } from '../lib/photos';

type EditState = Omit<Presentation, 'year'> & { year: number | null | string };
const emptyPresentation = (photo: Photo): EditState => ({
  featured: photo.featured, featuredLayout: photo.featuredLayout,
  title: photo.title ?? '', location: photo.location ?? '', year: photo.year,
  seriesSlug: photo.seriesSlug ?? '',
});

export default function PhotoEditPage({ photo, session }: { photo: Photo; session: Extract<SessionResponse, { authenticated: true }> }) {
  const [draft, setDraft] = useState<EditState>(() => emptyPresentation(photo));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const payload: Presentation = {
      ...draft,
      title: draft.title?.trim() || null,
      location: draft.location?.trim() || null,
      year: draft.year === '' || draft.year === null ? null : Number(draft.year),
      seriesSlug: draft.seriesSlug?.trim() || null,
    };
    try {
      await apiRequest<Photo>(`/photos/${photo.id}/presentation`, {
        method: 'PATCH', csrfToken: session.csrf_token, body: payload,
      });
      window.location.assign('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed.');
      setBusy(false);
    }
  }

  return <main className="admin-shell">
    <header className="topbar"><div><p className="eyebrow">PORTFOLIO MANAGEMENT</p><h1>Edit photo</h1></div><div className="account"><span>{session.user}</span><a className="quiet link-button" href="/">Photo library</a></div></header>
    <section className="editor-page">
      <div className="editor-preview"><img src={adminPhotoUrl(photo.photo_url)} alt={photo.title || photo.name} /><p>{photo.name}</p></div>
      <form className="edit-form editor-form" onSubmit={save}>
        <div><h2>Photo presentation</h2><p className="muted">Update how this image appears in the portfolio.</p></div>
        {error && <p className="message error" role="alert">{error}</p>}
        <label className="check-row"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked, featuredLayout: event.target.checked ? (draft.featuredLayout ?? 'wide') : null })} /> Feature photo</label>
        {draft.featured && <label>Featured layout<select value={draft.featuredLayout ?? 'wide'} onChange={(event) => setDraft({ ...draft, featuredLayout: event.target.value as Presentation['featuredLayout'] })}><option value="wide">Wide</option><option value="contained">Contained</option></select></label>}
        <label>Title<input value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Location<input value={draft.location ?? ''} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
        <label>Year<input type="number" min="1800" max="2200" value={draft.year ?? ''} onChange={(event) => setDraft({ ...draft, year: event.target.value === '' ? null : Number(event.target.value) })} /></label>
        <label>Series slug<input value={draft.seriesSlug ?? ''} onChange={(event) => setDraft({ ...draft, seriesSlug: event.target.value })} /></label>
        <div className="actions"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button><a className="quiet link-button" href="/">Cancel</a></div>
      </form>
    </section>
  </main>;
}
