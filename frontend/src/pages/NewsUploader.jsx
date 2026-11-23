import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { callAdminApi } from '../api/adminApi';
import { signOutAdmin } from '../api/firebaseAuth';
import FormattedArticle from '../components/FormattedArticle';
import './LeaguePolish.css';

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function getExcerpt(content, length = 140) {
    const plainText = String(content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.length > length
        ? `${plainText.slice(0, length).trim()}…`
        : plainText;
}

function getArticleParagraphs(content) {
    return String(content || '')
        .split(/\r?\n(?:[ \t]*\r?\n)+/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean);
}

export default function NewsUploader() {
    const nav = useNavigate();
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState('');
    const [inlineImages, setInlineImages] = useState([]);
    const [author, setAuthor] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [message, setMessage] = useState(null);
    const [errors, setErrors] = useState({});
    const [imgValid, setImgValid] = useState(null);
    const [newsList, setNewsList] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const contentRef = useRef(null);
    const [selectionToRestore, setSelectionToRestore] = useState(null);

    useLayoutEffect(() => {
        if (!selectionToRestore || !contentRef.current) return;
        contentRef.current.focus();
        contentRef.current.setSelectionRange(
            selectionToRestore.start,
            selectionToRestore.end
        );
        setSelectionToRestore(null);
    }, [content, selectionToRestore]);

    function wrapContentSelection(before, after, placeholder) {
        const textarea = contentRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.slice(start, end) || placeholder;
        const nextContent = content.slice(0, start) +
            before + selectedText + after +
            content.slice(end);

        setContent(nextContent);
        setSelectionToRestore({
            start: start + before.length,
            end: start + before.length + selectedText.length
        });
    }

    function prefixContentLines(prefix, placeholder) {
        const textarea = contentRef.current;
        if (!textarea) return;

        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        const hasSelection = selectionStart !== selectionEnd;
        const start = hasSelection
            ? selectionStart
            : content.lastIndexOf('\n', selectionStart - 1) + 1;
        const nextLineBreak = content.indexOf('\n', selectionStart);
        const end = hasSelection || nextLineBreak === -1
            ? selectionEnd === selectionStart ? content.length : selectionEnd
            : nextLineBreak;
        const selectedLines = content.slice(start, end) || placeholder;
        const prefixedLines = selectedLines
            .split('\n')
            .map(line => `${prefix}${line}`)
            .join('\n');

        setContent(content.slice(0, start) + prefixedLines + content.slice(end));
        setSelectionToRestore({
            start: start + prefix.length,
            end: start + prefixedLines.length
        });
    }

    function handleFormatting(action) {
        if (action === 'bold') wrapContentSelection('**', '**', 'bold text');
        if (action === 'italic') wrapContentSelection('_', '_', 'italic text');
        if (action === 'link') {
            wrapContentSelection('[', '](https://example.com)', 'link text');
        }
        if (action === 'heading') prefixContentLines('## ', 'Heading');
        if (action === 'list') prefixContentLines('- ', 'List item');
        if (action === 'quote') prefixContentLines('> ', 'Quote');
    }

    function clearForm() {
        setTitle('');
        setSubtitle('');
        setContent('');
        setImage('');
        setInlineImages([]);
        setAuthor('');
        setErrors({});
        setImgValid(null);
        setEditingId(null);
    }

    async function loadNews() {
        setLoadingPosts(true);
        try {
            const items = await callAdminApi('admin.news.list');
            setNewsList(Array.isArray(items) ? items : []);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to load news' });
        } finally {
            setLoadingPosts(false);
        }
    }

    useEffect(() => {
        loadNews();
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage(null);

        const validationErrors = {};
        if (!title.trim()) validationErrors.title = 'Title is required';
        if (content.trim().length < 20) {
            validationErrors.content = 'Content must be at least 20 characters';
        }
        if (image.trim()) {
            try {
                const imageUrl = new URL(image);
                if (!['http:', 'https:'].includes(imageUrl.protocol)) {
                    validationErrors.image = 'Image URL must use HTTP or HTTPS';
                }
            } catch {
                validationErrors.image = 'Image must be a valid URL';
            }
        }
        inlineImages.forEach((inlineImage, index) => {
            if (!inlineImage.url.trim()) {
                validationErrors[`inlineImage${index}`] = 'Enter an image URL or remove this image.';
                return;
            }
            try {
                const imageUrl = new URL(inlineImage.url);
                if (!['http:', 'https:'].includes(imageUrl.protocol)) {
                    validationErrors[`inlineImage${index}`] = 'Image URL must use HTTP or HTTPS';
                }
            } catch {
                validationErrors[`inlineImage${index}`] = 'Image must be a valid URL';
            }
            if (!Number.isInteger(Number(inlineImage.after_paragraph)) ||
                Number(inlineImage.after_paragraph) < 1 ||
                Number(inlineImage.after_paragraph) > getArticleParagraphs(content).length) {
                validationErrors[`inlineImage${index}`] = 'Choose a paragraph for this image.';
            }
        });

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsLoading(true);
        try {
            const action = editingId ? 'admin.news.update' : 'admin.news.create';
            await callAdminApi(action, {
                ...(editingId ? { id: editingId } : {}),
                title,
                subtitle,
                content,
                image_url: image,
                inline_images: inlineImages.map(inlineImage => ({
                    ...inlineImage,
                    after_paragraph: Number(inlineImage.after_paragraph),
                })),
                author,
            });
            clearForm();
            setMessage({
                type: 'success',
                text: editingId ? 'News article updated successfully.' : 'News article published successfully.',
            });
            await loadNews();
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'News update failed' });
        } finally {
            setIsLoading(false);
        }
    }

    function handleImageValidation(source) {
        if (!source) {
            setImgValid(null);
            return;
        }
        try {
            const imageUrl = new URL(source);
            if (!['http:', 'https:'].includes(imageUrl.protocol)) {
                setImgValid(false);
                return;
            }
        } catch {
            setImgValid(false);
            return;
        }
        const previewImage = new Image();
        previewImage.onload = () => setImgValid(true);
        previewImage.onerror = () => setImgValid(false);
        previewImage.src = source;
    }

    function handleEdit(item) {
        setEditingId(item.id);
        setTitle(item.title || '');
        setSubtitle(item.subtitle || '');
        setContent(item.content || '');
        setImage(item.image_url || '');
        setInlineImages(Array.isArray(item.inline_images) ? item.inline_images : []);
        setAuthor(item.author || '');
        handleImageValidation(item.image_url || '');
        setErrors({});
        setMessage(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this news item?')) return;
        setMessage(null);
        try {
            await callAdminApi('admin.news.delete', { id });
            if (editingId === id) clearForm();
            setMessage({ type: 'success', text: 'News article deleted.' });
            await loadNews();
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to delete news' });
        }
    }

    return (
        <div className="league-polish-page news-uploader-page">
            <main className="league-polish-content">
                <header className="league-page-header news-uploader-header">
                    <div className="league-page-header__copy">
                        <div className="league-page-eyebrow">Content management</div>
                        <h1 className="league-page-title">News Uploader</h1>
                        <p className="league-page-subtitle">
                            Publish league updates and manage your existing articles.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="news-uploader-logout"
                        onClick={async () => {
                            await signOutAdmin();
                            nav('/admin');
                        }}
                    >
                        Log out
                    </button>
                </header>

                {message && (
                    <div
                        className={`news-uploader-message news-uploader-message--${message.type}`}
                        role={message.type === 'error' ? 'alert' : 'status'}
                    >
                        <span aria-hidden="true">{message.type === 'error' ? '!' : '✓'}</span>
                        {message.text}
                    </div>
                )}

                <section className="news-uploader-compose">
                    <div className="news-uploader-section-heading">
                        <div>
                            <span className="news-uploader-kicker">
                                {editingId ? 'Update article' : 'Create a story'}
                            </span>
                            <h2>{editingId ? 'Edit news article' : 'Write a news article'}</h2>
                            <p>Fields marked with * are required.</p>
                        </div>
                        {editingId && (
                            <button
                                type="button"
                                className="news-uploader-cancel"
                                onClick={clearForm}
                                disabled={isLoading}
                            >
                                Cancel editing
                            </button>
                        )}
                    </div>

                    <form className="news-uploader-form" onSubmit={handleSubmit} noValidate>
                        <label className="news-uploader-field news-uploader-field--wide">
                            <span>Headline <b>*</b></span>
                            <input
                                type="text"
                                placeholder="Give your story a clear headline"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                disabled={isLoading}
                                aria-invalid={Boolean(errors.title)}
                            />
                            {errors.title && <small className="news-uploader-field-error">{errors.title}</small>}
                        </label>

                        <label className="news-uploader-field news-uploader-field--wide">
                            <span>Subtitle <small>Optional</small></span>
                            <input
                                type="text"
                                placeholder="Add a short summary below the headline"
                                value={subtitle}
                                onChange={(event) => setSubtitle(event.target.value)}
                                disabled={isLoading}
                            />
                        </label>

                        <label className="news-uploader-field">
                            <span>Author <small>Optional</small></span>
                            <input
                                type="text"
                                placeholder="Author name"
                                value={author}
                                onChange={(event) => setAuthor(event.target.value)}
                                disabled={isLoading}
                            />
                        </label>

                        <label className="news-uploader-field">
                            <span>Image URL <small>Optional</small></span>
                            <input
                                type="url"
                                placeholder="https://example.com/image.jpg"
                                value={image}
                                onChange={(event) => {
                                    setImage(event.target.value);
                                    handleImageValidation(event.target.value);
                                }}
                                disabled={isLoading}
                                aria-invalid={Boolean(errors.image || imgValid === false)}
                            />
                            {errors.image && <small className="news-uploader-field-error">{errors.image}</small>}
                            {!errors.image && imgValid === false && (
                                <small className="news-uploader-field-error">This image could not be loaded.</small>
                            )}
                        </label>

                        {imgValid && image && (
                            <div className="news-uploader-image-preview">
                                <img src={image} alt="Selected article artwork" />
                                <span>Image preview</span>
                            </div>
                        )}

                        <div className="news-uploader-field news-uploader-field--wide news-uploader-content-field">
                            <label htmlFor="news-article-content">
                                Article content <b>*</b>
                            </label>
                            <div className="news-uploader-toolbar" role="toolbar" aria-label="Article formatting">
                                {[
                                    { action: 'bold', label: 'Bold', marker: 'B' },
                                    { action: 'italic', label: 'Italic', marker: 'I' },
                                    { action: 'heading', label: 'Heading', marker: 'H2' },
                                    { action: 'list', label: 'Bulleted list', marker: '• List' },
                                    { action: 'quote', label: 'Quote', marker: '“ Quote' },
                                    { action: 'link', label: 'Insert link', marker: 'Link' }
                                ].map(({ action, label, marker }) => (
                                    <button
                                        key={action}
                                        type="button"
                                        aria-label={label}
                                        title={label}
                                        disabled={isLoading}
                                        onMouseDown={event => event.preventDefault()}
                                        onClick={() => handleFormatting(action)}
                                    >
                                        {marker}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                id="news-article-content"
                                ref={contentRef}
                                placeholder="Write the full announcement, report or league update..."
                                rows={10}
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                disabled={isLoading}
                                aria-invalid={Boolean(errors.content)}
                            />
                            <small className="news-uploader-help">
                                Select text before using a button to format it. Links open in a new tab; pasted URLs become clickable.
                            </small>
                            {errors.content && <small className="news-uploader-field-error">{errors.content}</small>}
                        </div>

                        <section className="news-uploader-live-preview news-uploader-field--wide" aria-label="Live article preview">
                            <div className="news-uploader-live-preview-heading">
                                <span>Live preview</span>
                                <small>Updates as you edit</small>
                            </div>
                            <article className="news-uploader-preview-article">
                                <h2>{title.trim() || 'Your article headline'}</h2>
                                {subtitle.trim() && (
                                    <p className="news-article-subtitle">{subtitle}</p>
                                )}
                                {content.trim()
                                    ? <FormattedArticle content={content} />
                                    : <p className="news-uploader-preview-placeholder">
                                        Your formatted article content will appear here.
                                    </p>}
                            </article>
                        </section>

                        <div className="news-uploader-inline-images news-uploader-field--wide">
                            <div className="news-uploader-inline-images-heading">
                                <span>In-article images <small>Optional</small></span>
                                <button
                                    type="button"
                                    onClick={() => setInlineImages(current => [
                                        ...current,
                                        { url: '', caption: '', after_paragraph: 1 },
                                    ])}
                                    disabled={isLoading || inlineImages.length >= 10}
                                >
                                    Add image
                                </button>
                            </div>
                            <small className="news-uploader-help">
                                Add images to appear between paragraphs. Skip this if you do not need any.
                            </small>
                            {inlineImages.map((inlineImage, index) => (
                                <div className="news-uploader-inline-image" key={index}>
                                    <label className="news-uploader-field">
                                        <span>Image URL</span>
                                        <input
                                            type="url"
                                            value={inlineImage.url}
                                            placeholder="https://example.com/image.jpg"
                                            onChange={event => setInlineImages(current =>
                                                current.map((item, itemIndex) => itemIndex === index
                                                    ? { ...item, url: event.target.value }
                                                    : item)
                                            )}
                                            disabled={isLoading}
                                            aria-invalid={Boolean(errors[`inlineImage${index}`])}
                                        />
                                        {errors[`inlineImage${index}`] && (
                                            <small className="news-uploader-field-error">
                                                {errors[`inlineImage${index}`]}
                                            </small>
                                        )}
                                    </label>
                                    <label className="news-uploader-field">
                                        <span>Place after</span>
                                        <select
                                            value={inlineImage.after_paragraph}
                                            onChange={event => setInlineImages(current =>
                                                current.map((item, itemIndex) => itemIndex === index
                                                    ? { ...item, after_paragraph: Number(event.target.value) }
                                                    : item)
                                            )}
                                            disabled={isLoading || getArticleParagraphs(content).length === 0}
                                        >
                                            {getArticleParagraphs(content).map((_, paragraphIndex) => (
                                                <option key={paragraphIndex + 1} value={paragraphIndex + 1}>
                                                    Paragraph {paragraphIndex + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="news-uploader-field news-uploader-inline-image-caption">
                                        <span>Caption <small>Optional</small></span>
                                        <input
                                            type="text"
                                            value={inlineImage.caption || ''}
                                            onChange={event => setInlineImages(current =>
                                                current.map((item, itemIndex) => itemIndex === index
                                                    ? { ...item, caption: event.target.value }
                                                    : item)
                                            )}
                                            disabled={isLoading}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className="news-uploader-inline-image-remove"
                                        onClick={() => setInlineImages(current =>
                                            current.filter((_, itemIndex) => itemIndex !== index)
                                        )}
                                        disabled={isLoading}
                                        aria-label={`Remove in-article image ${index + 1}`}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="news-uploader-form-actions">
                            <button type="submit" disabled={isLoading}>
                                {isLoading
                                    ? 'Saving article…'
                                    : editingId ? 'Save changes' : 'Publish article'}
                            </button>
                            <button
                                type="button"
                                className="news-uploader-clear"
                                onClick={clearForm}
                                disabled={isLoading}
                            >
                                {editingId ? 'Cancel' : 'Clear form'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="news-uploader-posts">
                    <div className="news-uploader-section-heading">
                        <div>
                            <span className="news-uploader-kicker">Your content</span>
                            <h2>Published articles</h2>
                            <p>
                                {newsList.length} {newsList.length === 1 ? 'article' : 'articles'}
                            </p>
                        </div>
                    </div>

                    {loadingPosts ? (
                        <div className="news-uploader-empty" role="status">Loading your articles…</div>
                    ) : newsList.length === 0 ? (
                        <div className="news-uploader-empty">
                            <h3>No articles published yet</h3>
                            <p>Your published articles will appear here so you can edit or remove them.</p>
                        </div>
                    ) : (
                        <div className="news-uploader-post-list">
                            {newsList.map((item) => {
                                const date = formatDate(item.published_at || item.created_at);
                                return (
                                    <article
                                        className={`news-uploader-post${item.image_url ? '' : ' news-uploader-post--no-image'}`}
                                        key={item.id}
                                    >
                                        {item.image_url && (
                                        <div className="news-uploader-post-image">
                                            <img
                                                src={item.image_url}
                                                alt=""
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.closest('.news-uploader-post')
                                                        ?.classList.add('news-uploader-post--no-image');
                                                    event.currentTarget.parentElement.hidden = true;
                                                }}
                                            />
                                        </div>
                                        )}
                                        <div className="news-uploader-post-copy">
                                            <div className="news-uploader-post-meta">
                                                <span>{item.author || 'Ubakala Football League'}</span>
                                                {date && <time dateTime={item.published_at || item.created_at}>{date}</time>}
                                            </div>
                                            <h3>{item.title || 'Untitled article'}</h3>
                                            {item.subtitle && <p className="news-uploader-post-subtitle">{item.subtitle}</p>}
                                            <p className="news-uploader-post-excerpt">{getExcerpt(item.content)}</p>
                                        </div>
                                        <div className="news-uploader-post-actions">
                                            <Link to={`/news/${item.id}`} target="_blank" rel="noreferrer">
                                                View
                                            </Link>
                                            <button type="button" onClick={() => handleEdit(item)}>
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="news-uploader-delete"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
