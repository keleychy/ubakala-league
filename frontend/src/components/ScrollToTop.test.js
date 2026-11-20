import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

function NavigationControls() {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate('/second')}>Open second page</button>
      <button type="button" onClick={() => navigate(-1)}>Go back</button>
    </>
  );
}

beforeEach(() => {
  let scrollY = 0;
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => scrollY
  });
  window.scrollTo = jest.fn((x, y) => {
    scrollY = y;
  });
});

test('new route navigation starts at the top', () => {
  render(
    <MemoryRouter initialEntries={['/first']}>
      <ScrollToTop />
      <NavigationControls />
      <Routes>
        <Route path="/first" element={<div>First page</div>} />
        <Route path="/second" element={<div>Second page</div>} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Open second page' }));

  expect(screen.getByText('Second page')).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
});

test('browser back restores the previous route scroll position', () => {
  render(
    <MemoryRouter initialEntries={['/first']}>
      <ScrollToTop />
      <NavigationControls />
      <Routes>
        <Route path="/first" element={<div>First page</div>} />
        <Route path="/second" element={<div>Second page</div>} />
      </Routes>
    </MemoryRouter>
  );

  act(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 540 });
    window.dispatchEvent(new Event('scroll'));
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open second page' }));

  act(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 120 });
    window.dispatchEvent(new Event('scroll'));
  });
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

  expect(screen.getByText('First page')).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenLastCalledWith(0, 540);
});
