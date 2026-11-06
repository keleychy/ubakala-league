import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../api/api';
import News from './News';

jest.mock('../api/api', () => ({
  api: {
    getNews: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('news cards show views and paginate nine stories at a time', async () => {
  api.getNews.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({
    id: `story-${index + 1}`,
    title: `Story ${index + 1}`,
    content: `Article content ${index + 1}`,
    published: true,
    views: index
  })));

  render(
    <MemoryRouter>
      <News />
    </MemoryRouter>
  );

  expect(await screen.findByRole('link', { name: 'Read Story 1' })).toBeInTheDocument();
  expect(screen.getByText('0 views')).toBeInTheDocument();
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Read Story 10' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByRole('link', { name: 'Read Story 10' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Read Story 1' })).not.toBeInTheDocument();
});
