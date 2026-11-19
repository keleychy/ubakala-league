import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Support from './Support';

test('renders the support page directly at its route with payment placeholders', () => {
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
  expect(screen.getByText(/No payment can be made through this page yet/))
    .toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'ABOUT THE DEVELOPER' }))
    .toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Developer photograph will be added' }))
    .toBeInTheDocument();
});

test('suggested and custom amounts are selectable without initiating payment', () => {
  render(
    <MemoryRouter initialEntries={['/support']}>
      <Routes>
        <Route path="/support" element={<Support />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: '₦2,500' }));
  expect(screen.getByRole('status')).toHaveTextContent('Selected amount: ₦2,500');
  expect(screen.getByRole('status')).toHaveTextContent('no payment has been made');

  fireEvent.change(screen.getByRole('spinbutton', { name: /Custom amount \(NGN\)/i }), {
    target: { value: '7300' }
  });
  expect(screen.getByRole('status')).toHaveTextContent('Selected amount: ₦7,300');
});
