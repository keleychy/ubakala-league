import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShareBar from '../components/ShareBar';
import { api } from '../api/api';
import { getNewsViewerId } from '../utils/newsViewer';
import './LeaguePolish.css';

const INLINE_TEXT_PATTERN =
    /(\[[^\]\n]+\]\((?:https?:\/\/|www\.)[^)\s]+\)|https?:\/\/[^\s<]+|www\.[^\s<]+|```[^`\n]+```|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|~~[^~\n]+~~|~[^~\n]+~)/;

function renderInlineText(text, keyPrefix = 'text') {
    const nodes = [];
    const pattern = new RegExp(INLINE_TEXT_PATTERN.source, 'g');
    let lastIndex = 0;
    let match;
    let nodeIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const token = match[0];
        const key = `${keyPrefix}-${nodeIndex++}`;
        const markdownLink = /^\[([^\]]+)\]\((.+)\)$/.exec(token);
        if (markdownLink) {
            const href = /^www\./i.test(markdownLink[2])
                ? `https://${markdownLink[2]}`
                : markdownLink[2];
            let isSafeLink = false;
            try {
                isSafeLink = ['http:', 'https:'].includes(new URL(href).protocol);
            } catch (error) {
                isSafeLink = false;
            }

            nodes.push(isSafeLink
                ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{renderInlineText(markdownLink[1], key)}</a>
                : token);
        } else if (/^(https?:\/\/|www\.)/i.test(token)) {
            const trailingPunctuation = token.match(/[.,!?;:)\]}]+$/)?.[0] || '';
            const url = token.slice(0, token.length - trailingPunctuation.length);
            const href = /^www\./i.test(url) ? `https://${url}` : url;
            nodes.push(
                <React.Fragment key={key}>
                    <a href={href} target="_blank" rel="noopener noreferrer">{url}</a>
                    {trailingPunctuation}
                </React.Fragment>
            );
        } else if (token.startsWith('```') || token.startsWith('`')) {
            const delimiterLength = token.startsWith('```') ? 3 : 1;
            nodes.push(<code key={key}>{token.slice(delimiterLength, -delimiterLength)}</code>);
        } else {
            const tag = token.startsWith('**') || token.startsWith('__') || token.startsWith('*')
                ? 'strong'
                : token.startsWith('_')
                    ? 'em'
                    : 'del';
            const delimiterLength = token.startsWith('**') ||
                token.startsWith('__') ||
                token.startsWith('~~')
                ? 2
                : 1;
            const content = token.slice(delimiterLength, -delimiterLength);
            const Tag = tag;
            nodes.push(
                <Tag key={key}>{renderInlineText(content, key)}</Tag>
            );
        }

        lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

function renderArticleParagraph(paragraph, keyPrefix) {
    const lines = paragraph.split(/\r?\n/);
    const blocks = [];
    let plainLines = [];
    let index = 0;

    const flushPlainLines = () => {
        if (!plainLines.length) return;
        blocks.push(
            <p key={`${keyPrefix}-text-${index++}`}>
                {plainLines.map((line, lineIndex) => (
                    <React.Fragment key={`${keyPrefix}-line-${lineIndex}`}>
                        {lineIndex > 0 && <br />}
                        {renderInlineText(line, `${keyPrefix}-${lineIndex}`)}
                    </React.Fragment>
                ))}
            </p>
        );
        plainLines = [];
    };

    while (index < lines.length) {
        const line = lines[index];
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);
        const quote = /^>\s?(.*)$/.exec(line);
        const unordered = /^(?:[-*+]|\u2022)\s+(.+)$/.exec(line);
        const ordered = /^\d+\.\s+(.+)$/.exec(line);

        if (heading) {
            flushPlainLines();
            const Heading = `h${heading[1].length}`;
            blocks.push(
                <Heading key={`${keyPrefix}-heading-${index}`}>
                    {renderInlineText(heading[2], `${keyPrefix}-heading-${index}`)}
                </Heading>
            );
            index += 1;
            continue;
        }

        if (quote) {
            flushPlainLines();
            const quoteLines = [];
            while (index < lines.length) {
                const currentQuote = /^>\s?(.*)$/.exec(lines[index]);
                if (!currentQuote) break;
                quoteLines.push(currentQuote[1]);
                index += 1;
            }
            blocks.push(
                <blockquote key={`${keyPrefix}-quote-${index}`}>
                    {quoteLines.map((quoteLine, quoteIndex) => (
                        <React.Fragment key={`${keyPrefix}-quote-line-${quoteIndex}`}>
                            {quoteIndex > 0 && <br />}
                            {renderInlineText(quoteLine, `${keyPrefix}-quote-${quoteIndex}`)}
                        </React.Fragment>
                    ))}
                </blockquote>
            );
            continue;
        }

        if (unordered || ordered) {
            flushPlainLines();
            const isOrdered = Boolean(ordered);
            const List = isOrdered ? 'ol' : 'ul';
            const items = [];
            while (index < lines.length) {
                const item = isOrdered
                    ? /^\d+\.\s+(.+)$/.exec(lines[index])
                    : /^(?:[-*+]|\u2022)\s+(.+)$/.exec(lines[index]);
                if (!item) break;
                items.push(item[1]);
                index += 1;
            }
            blocks.push(
                <List key={`${keyPrefix}-list-${index}`}>
                    {items.map((item, itemIndex) => (
                        <li key={`${keyPrefix}-item-${itemIndex}`}>
                            {renderInlineText(item, `${keyPrefix}-item-${itemIndex}`)}
                        </li>
                    ))}
                </List>
            );
            continue;
        }

        plainLines.push(line);
        index += 1;
    }

    flushPlainLines();
    return blocks;
}

function NewsImage({ src, alt, caption, className }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return null;

    return (
        <figure className={className}>
            <img src={src} alt={alt || ''} onError={() => setFailed(true)} />
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function NewsDetail() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewError, setViewError] = useState('');

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        setViewError('');
        api.getNewsById(id).then((data) => {
            if (!mounted) return;
            setItem(data);
            setLoading(false);
            if (data) {
                Promise.resolve().then(() => api.recordNewsView(id, getNewsViewerId())).then((result) => {
                    if (mounted) {
                        setItem(current => current ? { ...current, views: result.views } : current);
                    }
                }).catch((viewRequestError) => {
                    if (mounted) {
                        setViewError(viewRequestError.message || 'Unable to update article views.');
                    }
                });
            }
        }).catch((err) => {
            if (!mounted) return;
            setError(err.message || 'Failed to load news');
            setLoading(false);
        });
        return () => { mounted = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="league-polish-page">
                <main className="league-polish-content news-detail-page">
                    <div className="league-page-empty" role="status">Loading article…</div>
                </main>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="league-polish-page">
                <main className="league-polish-content news-detail-page">
                    {error ? (
                        <div className="league-page-status league-page-status--error" role="alert">
                            Error: {error}
                        </div>
                    ) : (
                        <div className="league-page-empty">News article not found.</div>
                    )}
                    <Link to="/news" className="news-back-link">← Back to news</Link>
                </main>
            </div>
        );
    }

    const date = formatDate(item.published_at || item.created_at);
    const paragraphs = String(item.content || '')
        .split(/\r?\n(?:[ \t]*\r?\n)+/)
        .filter(paragraph => paragraph.trim());
    const inlineImages = Array.isArray(item.inline_images) ? item.inline_images : [];

    return (
        <div className="league-polish-page">
            <main className="league-polish-content news-detail-page">
                <Link to="/news" className="news-back-link">← All news</Link>

                <article className="news-article">
                    <header className="news-article-header">
                        <div className="league-page-eyebrow">From the league</div>
                        <h1>{item.title || 'Untitled article'}</h1>
                        {item.subtitle && <p className="news-article-subtitle">{item.subtitle}</p>}
                        <div className="news-article-byline">
                            <span>{item.author || 'Ubakala Football League'}</span>
                            {date && <time dateTime={item.published_at || item.created_at}>{date}</time>}
                            <span className="news-article-views" aria-label={`${item.views || 0} views`}>
                                {item.views || 0} views
                            </span>
                        </div>
                        {viewError && (
                            <p className="news-view-error" role="status">{viewError}</p>
                        )}
                        <div className="news-article-share">
                            <ShareBar url={window.location.href} title={item.title} />
                        </div>
                    </header>

                    <NewsImage
                        src={item.image_url}
                        alt={item.title || ''}
                        className="news-article-figure"
                    />

                    <div className="news-article-content">
                        <div
                            className="news-article-body"
                        >
                            {paragraphs.map((paragraph, index) => (
                                <React.Fragment key={index}>
                                    {renderArticleParagraph(paragraph, `paragraph-${index}`)}
                                    {inlineImages
                                        .filter(image => Number(image.after_paragraph) === index + 1)
                                        .map((image, imageIndex) => (
                                            <NewsImage
                                                key={`${index}-${image.url}-${imageIndex}`}
                                                src={image.url}
                                                alt={image.caption || item.title || ''}
                                                caption={image.caption}
                                                className="news-inline-figure"
                                            />
                                        ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
}
