import React from 'react';

export default function Pagination({ page, pageSize, total, onPageChange, label }) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;
  const currentPage = Math.min(page, pageCount);
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, total);

  return (
    <nav className="predictions-pagination" aria-label={`${label} pagination`}>
      <button
        type="button"
        className="predictions-button predictions-button--secondary"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      <span aria-live="polite">
        Showing {firstItem}-{lastItem} of {total} · Page {currentPage} of {pageCount}
      </span>
      <button
        type="button"
        className="predictions-button predictions-button--secondary"
        disabled={currentPage === pageCount}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
