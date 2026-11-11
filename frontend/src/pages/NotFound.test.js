import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

test('not-found page offers clear routes back into the site', () => {
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'That page isn’t here' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
  expect(screen.getByRole('link', { name: 'Standings' })).toHaveAttribute('href', '/standings');
});
