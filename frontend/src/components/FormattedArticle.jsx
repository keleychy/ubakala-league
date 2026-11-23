import React from 'react';

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

export function renderArticleParagraph(paragraph, keyPrefix) {
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

export default function FormattedArticle({ content, className = 'news-article-body' }) {
    const paragraphs = String(content || '')
        .split(/\r?\n(?:[ \t]*\r?\n)+/)
        .filter(paragraph => paragraph.trim());

    return (
        <div className={className}>
            {paragraphs.map((paragraph, index) => (
                <React.Fragment key={index}>
                    {renderArticleParagraph(paragraph, `article-${index}`)}
                </React.Fragment>
            ))}
        </div>
    );
}
