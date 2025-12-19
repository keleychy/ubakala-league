import React from 'react';

export default function ShareBar({ url, title }) {
    const shareUrl = url || window.location.href;

    const onWhatsApp = () => {
        const text = encodeURIComponent((title ? title + ' - ' : '') + shareUrl);
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
    };

    const onFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
    };

    const onPrint = () => window.print();

    const containerStyle = {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginTop: 8,
        flexWrap: 'wrap'
    };

    const btn = {
        padding: '6px 10px',
        borderRadius: 8,
        border: '1px solid rgba(2,6,23,0.06)',
        background: 'transparent',
        cursor: 'pointer',
        color: '#0b1220',
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.12s ease, transform 0.08s ease'
    };

    const btnHoverStyle = { background: 'rgba(99,102,241,0.06)' };

    const IconFacebook = ({ width = 16, height = 16 }) => (
        <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M22 12C22 6.477 17.523 2 12 2S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.99H7.898v-2.888h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.772-1.63 1.562v1.875h2.773l-.443 2.888h-2.33v6.99C18.343 21.128 22 16.991 22 12z" fill="#1877F2" />
        </svg>
    );

    const IconWhatsApp = ({ width = 16, height = 16 }) => (
        <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M20.52 3.48A11.95 11.95 0 0012 0C5.373 0 .002 5.373 0 12c0 2.11.55 4.08 1.6 5.84L0 24l6.4-1.6A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12 0-3.2-1.25-6.15-3.48-8.52z" fill="#25D366" />
            <path d="M17.2 14.2c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15s-.78.98-.96 1.18c-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.48-.89-.78-1.48-1.74-1.65-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2 0-.35-.02-.5-.02-.15-.68-1.64-.94-2.25-.25-.58-.5-.5-.68-.5-.17 0-.36 0-.55 0-.18 0-.47.07-.72.35-.25.28-.98.96-.98 2.34s1 2.72 1.14 2.9c.15.18 1.97 3.02 4.78 4.22 3.1 1.3 3.1.87 3.66.82.57-.05 1.9-.78 2.17-1.53.28-.75.28-1.4.2-1.54-.08-.15-.28-.24-.58-.39z" fill="#fff" />
        </svg>
    );

    const IconPrint = ({ width = 16, height = 16 }) => (
        <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M19 8H5a2 2 0 00-2 2v6h4v4h10v-4h4v-6a2 2 0 00-2-2zM17 20H7v-5h10v5zM21 3H3v4h18V3z" fill="#0f172a" />
        </svg>
    );

    return (
        <div style={containerStyle} aria-label="Share">
            <button style={btn} onMouseOver={e => Object.assign(e.currentTarget.style, btnHoverStyle)} onMouseOut={e => Object.assign(e.currentTarget.style, btn)} onClick={onFacebook} aria-label="Share on Facebook"><IconFacebook />Facebook</button>
            <button style={btn} onMouseOver={e => Object.assign(e.currentTarget.style, btnHoverStyle)} onMouseOut={e => Object.assign(e.currentTarget.style, btn)} onClick={onWhatsApp} aria-label="Share on WhatsApp"><IconWhatsApp />WhatsApp</button>
            <button style={btn} onMouseOver={e => Object.assign(e.currentTarget.style, btnHoverStyle)} onMouseOut={e => Object.assign(e.currentTarget.style, btn)} onClick={onPrint} aria-label="Print article"><IconPrint />Print</button>
        </div>
    );
}
