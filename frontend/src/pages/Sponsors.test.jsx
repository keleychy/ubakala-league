import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sponsors from './Sponsors';

test('shows every sponsor with their supplied category and portrait or placeholder', () => {
  render(
    <MemoryRouter>
      <Sponsors />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'Our Sponsors' }))
    .toBeInTheDocument();

  const expectedSponsors = [
    ['RTD. Commander Macdonald Ubah', 'Senior Boys', true],
    ['Engr. Nnamdi Ezeigbo', 'Junior Boys', true],
    ['Pastor Harrison Ugochukwu Asonye', 'Intermediate', true],
    ['Engr. Stanley Uche', 'Girls', true],
    ['Engr. Ezinna Ogbuokiri', 'Men Above 50 Years', true]
  ];

  expectedSponsors.forEach(([name, category, hasPhoto]) => {
    const card = screen.getByRole('heading', { name }).closest('article');
    expect(card).toHaveTextContent(category);
    if (hasPhoto) {
      expect(card.querySelector('.sponsor-portrait img')).toBeInTheDocument();
    }
  });
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)[0])
    .toBe('RTD. Commander Macdonald Ubah');

  expect(screen.getByRole('link', { name: /Back to homepage/ }))
    .toHaveAttribute('href', '/');
});
