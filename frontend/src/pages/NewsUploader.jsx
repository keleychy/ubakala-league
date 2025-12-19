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
            const res = await fetchWithAuth(`${API_URL}/news/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, subtitle, content, image_url: image })
            });
            if (!res.ok) {
                if (res.status === 403) {
                    setMessage({ type: 'error', text: 'Forbidden: you do not have permission to post news' });
                    return;
                }
                const err = await res.text();
                setMessage({ type: 'error', text: err || 'Failed to create news' });
            } else {
                setTitle(''); setContent(''); setImage(''); setSubtitle(''); setImgValid(null); setErrors({});
                setMessage({ type: 'success', text: 'News created' });
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

                <aside style={{ width: 320 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Preview</div>
                    <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, background: '#fff' }}>
                        {image ? (
                            <div style={{ marginBottom: 8 }}>
                                <img src={image} alt="thumbnail" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6 }} onError={(e) => { e.currentTarget.style.display = 'none'; setImgValid(false); }} />
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: 160, background: '#f3f4f6', borderRadius: 6, marginBottom: 8 }} />
                        )}
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3c72', marginBottom: 6 }}>{title || 'Title goes here'}</div>
                        <div style={{ color: '#6b7280', marginBottom: 8 }}>{subtitle || 'Subtitle or short summary'}</div>
                        <div style={{ color: '#374151', fontSize: 13 }}>{content ? (content.length > 160 ? content.slice(0, 160).trim() + '…' : content) : 'Short content preview will appear here.'}</div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
