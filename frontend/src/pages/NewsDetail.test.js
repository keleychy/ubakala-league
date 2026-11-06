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
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(api.recordNewsView).toHaveBeenCalledWith(
    'story-1',
    expect.stringMatching(/^[A-Za-z0-9_-]{20,128}$/)
  );
});

test('renders optional in-article images after their selected paragraph without a hero image', async () => {
  api.getNewsById.mockResolvedValue({
    id: 'story-2',
    title: 'Match report',
    content: 'First paragraph.\n\nSecond paragraph.',
    image_url: '',
    inline_images: [{
      url: 'https://example.com/action.jpg',
      caption: 'Action from the match',
      after_paragraph: 1
    }],
    published: true,
    views: 0
  });
  api.recordNewsView.mockResolvedValue({ views: 1 });

  render(
    <MemoryRouter initialEntries={['/news/story-2']}>
      <Routes>
        <Route path="/news/:id" element={<NewsDetail />} />
      </Routes>
    </MemoryRouter>
  );

  const image = await screen.findByRole('img', { name: 'Action from the match' });
  const articleBody = image.closest('.news-article-body');
  expect(articleBody.children[0]).toHaveTextContent('First paragraph.');
  expect(articleBody.children[1]).toContainElement(image);
  expect(articleBody.children[2]).toHaveTextContent('Second paragraph.');
  expect(screen.getByText('Action from the match')).toBeInTheDocument();
  expect(document.querySelector('.news-article-figure')).not.toBeInTheDocument();
});
