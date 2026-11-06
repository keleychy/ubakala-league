import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api/api';
import NewsDetail from './NewsDetail';

jest.mock('../api/api', () => ({
  api: {
    getNewsById: jest.fn(),
    recordNewsView: jest.fn()
  }
}));

jest.mock('../components/ShareBar', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
});

test('opening a published story records a view for the browser and displays the updated count', async () => {
  api.getNewsById.mockResolvedValue({
    id: 'story-1',
    title: 'Cup Update',
    content: 'Published story content.',
    published: true,
    views: 3
  });
  api.recordNewsView.mockResolvedValue({ views: 4 });

  render(
    <MemoryRouter initialEntries={['/news/story-1']}>
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: 'Cup Update' })).toBeInTheDocument();
  expect(await screen.findByText('4 views')).toBeInTheDocument();
  expect(api.recordNewsView).toHaveBeenCalledWith(
    'story-1',
    expect.stringMatching(/^[A-Za-z0-9_-]{20,128}$/)
  );
});
