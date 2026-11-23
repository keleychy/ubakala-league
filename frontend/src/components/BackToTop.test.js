import React, { act, fireEvent, render, screen } from '@testing-library/react';
import BackToTop from './BackToTop';

beforeEach(() => {
  let scrollY = 0;
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => scrollY
  });
  window.scrollTo = jest.fn(({ top }) => {
    scrollY = top;
  });
});

test('only appears after the visitor scrolls down the page', () => {
  render(<BackToTop />);

  expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();

  act(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 600 });
    window.dispatchEvent(new Event('scroll'));
  });

  expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
});

test('scrolls smoothly to the top when activated', () => {
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 700 });
  render(<BackToTop />);

  fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
});

test('uses non-animated scrolling when reduced motion is preferred', () => {
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 700 });
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  render(<BackToTop />);

  fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
});
