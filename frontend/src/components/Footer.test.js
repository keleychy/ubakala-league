import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

test('footer quick links point to the matching application routes', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
  expect(screen.getByRole('link', { name: 'Standings' })).toHaveAttribute('href', '/standings');
  expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  expect(screen.getByRole('link', { name: 'Rules & Regulations' }))
    .toHaveAttribute('href', '/rules-regulations');
});
