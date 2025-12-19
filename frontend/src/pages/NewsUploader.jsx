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

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage(null);
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
                setTitle(''); setContent(''); setImage('');
                setMessage({ type: 'success', text: 'News created' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setIsLoading(false);
        }
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
                <input placeholder="Subtitle (optional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} disabled={isLoading} />
                <textarea placeholder="Content" rows={8} value={content} onChange={e => setContent(e.target.value)} disabled={isLoading} />
                <input placeholder="Image URL (optional)" value={image} onChange={e => setImage(e.target.value)} disabled={isLoading} />
                <button type="submit" disabled={isLoading}>{isLoading ? 'Posting...' : 'Post News'}</button>
            </form>
        </div>
    );
}
