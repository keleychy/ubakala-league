import React, { useState } from 'react';
import { fetchWithAuth, logout } from '../api/auth';
import { API_URL } from '../api/api';
import { useNavigate } from 'react-router-dom';

export default function NewsUploader() {
    const nav = useNavigate();
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [errors, setErrors] = useState({});
    const [imgValid, setImgValid] = useState(null);
    const [newsList, setNewsList] = useState([]);
    const [editingId, setEditingId] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage(null);
        const v = {};
        if (!title || !title.trim()) v.title = 'Title is required';
        if (!content || content.trim().length < 20) v.content = 'Content must be at least 20 characters';
        if (image && image.trim()) {
            try { new URL(image); } catch (err) { v.image = 'Image must be a valid URL'; }
        }
        if (Object.keys(v).length) { setErrors(v); return; }
        setErrors({});
        setIsLoading(true);
        try {
            const url = editingId ? `${API_URL}/news/${editingId}/` : `${API_URL}/news/`;
            const method = editingId ? 'PATCH' : 'POST';
            const res = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, subtitle, content, image_url: image, author })
            });
            if (!res.ok) {
                // Try to provide the server response to help debugging
                let bodyText = '';
                try {
                    const json = await res.json();
                    bodyText = JSON.stringify(json);
                } catch (e) {
                    bodyText = await res.text();
                }
                console.error('News upload failed', res.status, bodyText);
                if (res.status === 403) {
                    setMessage({ type: 'error', text: 'Forbidden: you do not have permission to post news' });
                    return;
                }
                setMessage({ type: 'error', text: bodyText || `Failed (${res.status})` });
            } else {
                setTitle(''); setContent(''); setImage(''); setSubtitle(''); setImgValid(null); setErrors({});
                setEditingId(null);
                setMessage({ type: 'success', text: editingId ? 'News updated' : 'News created' });
                await loadNews();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setIsLoading(false);
        }
    }

    function handleImageValidation(src) {
        if (!src) { setImgValid(null); return; }
        try { new URL(src); } catch (e) { setImgValid(false); return; }
        const img = new Image();
        img.onload = () => setImgValid(true);
        img.onerror = () => setImgValid(false);
        img.src = src;
    }

    async function loadNews() {
        try {
            const data = await fetch(`${API_URL}/news/`);
            if (!data.ok) return;
            const json = await data.json();
            setNewsList(Array.isArray(json) ? json : []);
        } catch (e) {
            // ignore
        }
    }

    async function handleEdit(item) {
        setEditingId(item.id);
        setTitle(item.title || '');
        setSubtitle(item.subtitle || '');
        setContent(item.content || '');
        setImage(item.image_url || '');
        setAuthor(item.author || '');
        handleImageValidation(item.image_url || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this news item?')) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/news/${id}/`, { method: 'DELETE' });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Deleted' });
                await loadNews();
            } else {
                setMessage({ type: 'error', text: 'Failed to delete' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Network error' });
        }
    }

    React.useEffect(() => { loadNews(); }, []);

    const [author, setAuthor] = useState('');

    return (
        <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
            <h2>Upload News</h2>
            <div style={{ textAlign: 'right', marginBottom: 8 }}>
                <button onClick={() => { logout(); nav('/admin'); }} style={{ padding: '6px 10px' }}>Logout</button>
            </div>
            {message && (
                <div style={{ padding: 12, borderRadius: 8, background: message.type === 'error' ? '#fee2e2' : '#ecfdf5', color: message.type === 'error' ? '#b91c1c' : '#065f46' }}>
                    {message.text}
                </div>
            )}
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <label>
                        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Title *</div>
                        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
                        {errors.title && <div style={{ color: '#b91c1c', fontSize: 12 }}>{errors.title}</div>}
                    </label>
                    <label>
                        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Subtitle</div>
                        <input placeholder="Subtitle (optional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} disabled={isLoading} />
                    </label>
                    <label>
                        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Author</div>
                        <input placeholder="Author name" value={author} onChange={e => setAuthor(e.target.value)} disabled={isLoading} />
                    </label>
                    <label>
                        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Content *</div>
                        <textarea placeholder="Content" rows={8} value={content} onChange={e => setContent(e.target.value)} disabled={isLoading} />
                        {errors.content && <div style={{ color: '#b91c1c', fontSize: 12 }}>{errors.content}</div>}
                    </label>
                    <label>
                        <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}>Image URL</div>
                        <input placeholder="Image URL (optional)" value={image} onChange={e => { setImage(e.target.value); handleImageValidation(e.target.value); }} disabled={isLoading} />
                        {errors.image && <div style={{ color: '#b91c1c', fontSize: 12 }}>{errors.image}</div>}
                        {imgValid === false && <div style={{ color: '#b91c1c', fontSize: 12 }}>Image URL did not load</div>}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" disabled={isLoading}>{isLoading ? 'Posting...' : 'Post News'}</button>
                        <button type="button" onClick={() => { setTitle(''); setSubtitle(''); setContent(''); setImage(''); setErrors({}); setImgValid(null); }} disabled={isLoading}>Clear</button>
                    </div>
                </form>

                {/* Preview removed for streamlined uploader UI */}
            </div>
            {/* Admin list of existing news for edit/delete */}
            <div style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Your Posts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {newsList.map(n => (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid #eee', borderRadius: 8 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>{n.title}</div>
                                <div style={{ color: '#666', fontSize: 13 }}>{n.author || 'Unknown'} • {new Date(n.published_at).toLocaleString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => handleEdit(n)}>Edit</button>
                                <button onClick={() => handleDelete(n.id)} style={{ background: '#fee2e2' }}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
