import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

afterEach(() => {
  jest.restoreAllMocks();
});

test('shows a friendly fallback without exposing error details', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});

  function BrokenPage() {
    throw new Error('private diagnostic details');
  }

  render(
    <ErrorBoundary>
      <BrokenPage />
    </ErrorBoundary>
  );

  expect(screen.getByRole('alert')).toHaveTextContent(
    'An unexpected issue prevented this page from displaying.'
  );
  expect(screen.queryByText(/private diagnostic details/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to homepage' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

test('retry renders the page again after a transient error', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  let shouldThrow = true;

  function RecoverablePage() {
    if (shouldThrow) throw new Error('temporary render failure');
    return <p>Page recovered</p>;
  }

  render(
    <ErrorBoundary>
      <RecoverablePage />
    </ErrorBoundary>
  );

  shouldThrow = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(screen.getByText('Page recovered')).toBeInTheDocument();
});
