import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Support from './Support';

test('renders the support page directly at its route with the supplied bank details', () => {
  render(
    <MemoryRouter initialEntries={['/support']}>
      <Routes>
        <Route path="/support" element={<Support />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', {
    name: 'SUPPORT THE UBakala UNITY CUP WEBSITE'
  })).toBeInTheDocument();
  expect(screen.getByText('Help Keep the Competition Online and Its History Preserved.'))
    .toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Nigerian bank transfer' }))
    .toBeInTheDocument();
  expect(screen.getByText('GTBank')).toBeInTheDocument();
  expect(screen.getByText('Ogbuehi Kelechi Timothy')).toBeInTheDocument();
  expect(screen.getByText('0177067096')).toBeInTheDocument();
  expect(screen.getByText('Online payment')).toBeInTheDocument();
  expect(screen.getByText('Not available yet')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'ABOUT THE DEVELOPER' }))
    .toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Ubakala Unity Cup website developer' }))
    .toBeInTheDocument();
});

test('does not show amount controls that cannot make a contribution', () => {
  render(
    <MemoryRouter initialEntries={['/support']}>
      <Routes>
        <Route path="/support" element={<Support />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.queryByRole('group', { name: 'Suggested contribution amounts' }))
    .not.toBeInTheDocument();
  expect(screen.queryByLabelText('Custom amount (NGN)')).not.toBeInTheDocument();
});
