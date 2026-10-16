import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, type Photo, type Presentation, type Series, type SessionResponse } from '../lib/api';
import { adminPhotoUrl } from '../lib/photos';

type EditState = Presentation;
const emptyPresentation = (photo: Photo): EditState => ({
  featured: photo.featured, featuredLayout: photo.featuredLayout,
  title: photo.title ?? '', location: photo.location ?? '',
  seriesSlug: photo.seriesSlug ?? '',
});

export default function PhotoEditPage({ photo, session, onCancel, onSaved }: {
  photo: Photo;
  session: Extract<SessionResponse, { authenticated: true }>;
  onCancel: () => void;
  onSaved: (photo: Photo) => void;
}) {
  const [draft, setDraft] = useState<EditState>(() => emptyPresentation(photo));
  const [series, setSeries] = useState<Series[]>([]);
  const [seriesError, setSeriesError] = useState('');
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<Series[]>('/series')
      .then((items) => { if (active) setSeries(items); })
      .catch((reason: unknown) => { if (active) setSeriesError(reason instanceof Error ? reason.message : 'Could not load available series.'); })
      .finally(() => { if (active) setLoadingSeries(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const payload: Presentation = {
      ...draft,
      title: draft.title?.trim() || null,
      location: draft.location?.trim() || null,
      seriesSlug: draft.seriesSlug?.trim() || null,
    };
    try {
      const updated = await apiRequest<Photo>(`/photos/${photo.id}/presentation`, {
        method: 'PATCH', csrfToken: session.csrf_token, body: payload,
      });
      onSaved(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed.');
      setBusy(false);
    }
  }

  return <section className="editor-page" aria-label="Edit photo">
      <div className="editor-preview"><img src={adminPhotoUrl(photo.photo_url, 1800)} alt={photo.title || photo.name} /><p>{photo.name}</p></div>
      <form className="edit-form editor-form" onSubmit={save}>
        <div className="edit-title"><div><p className="eyebrow">PORTFOLIO MANAGEMENT</p><h2 id="edit-heading">Edit photo</h2></div><button className="quiet edit-close" type="button" onClick={onCancel} aria-label="Close editor">×</button></div>
        <p className="muted">Update how this image appears in the portfolio.</p>
        {error && <p className="message error" role="alert">{error}</p>}
        <label className="check-row"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked, featuredLayout: event.target.checked ? (draft.featuredLayout ?? 'wide') : null })} /> Feature photo</label>
        {draft.featured && <label>Featured layout<select value={draft.featuredLayout ?? 'wide'} onChange={(event) => setDraft({ ...draft, featuredLayout: event.target.value as Presentation['featuredLayout'] })}><option value="wide">Wide</option><option value="contained">Contained</option></select></label>}
        <label>Title<input value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Location<input value={draft.location ?? ''} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
        <label>Series<select value={draft.seriesSlug ?? ''} disabled={loadingSeries || Boolean(seriesError)} onChange={(event) => setDraft({ ...draft, seriesSlug: event.target.value || null })}><option value="">No series</option>{series.map((item) => <option key={item.id} value={item.slug}>{item.title}{item.published ? ' · Published' : ' · Draft'}</option>)}</select></label>
        {loadingSeries && <p className="muted" role="status">Loading available series…</p>}
        {seriesError && <p className="message error" role="alert">Could not load series: {seriesError}</p>}
        <div className="actions"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button><button className="quiet" type="button" onClick={onCancel} disabled={busy}>Cancel</button></div>
      </form>
    </section>;
}
