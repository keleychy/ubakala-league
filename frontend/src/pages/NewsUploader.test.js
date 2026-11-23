import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { callAdminApi } from '../api/adminApi';
import NewsUploader from './NewsUploader';

jest.mock('../api/adminApi', () => ({
  callAdminApi: jest.fn()
}));

jest.mock('../api/firebaseAuth', () => ({
  signOutAdmin: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  callAdminApi.mockImplementation(action =>
    action === 'admin.news.list' ? Promise.resolve([]) : Promise.resolve({})
  );
});

test('publishes optional in-article images at their selected paragraph positions', async () => {
  render(
    <MemoryRouter>
      <NewsUploader />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText('Give your story a clear headline'), {
    target: { value: 'A new match report' }
  });
  fireEvent.change(screen.getByPlaceholderText('Write the full announcement, report or league update...'), {
    target: { value: 'First paragraph of the report.\n\nSecond paragraph with more details.' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
  fireEvent.change(screen.getAllByPlaceholderText('https://example.com/image.jpg')[1], {
    target: { value: 'https://example.com/action.jpg' }
  });
  fireEvent.change(screen.getByLabelText('Place after'), {
    target: { value: '2' }
  });
  fireEvent.change(screen.getByLabelText('Caption Optional'), {
    target: { value: 'Action from the second half' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Publish article' }));

  await waitFor(() => {
    expect(callAdminApi).toHaveBeenCalledWith('admin.news.create', expect.objectContaining({
      inline_images: [{
        url: 'https://example.com/action.jpg',
        caption: 'Action from the second half',
        after_paragraph: 2
      }]
    }));
  });
});

test('formats selected article text and shows the same formatting in the live preview', async () => {
  render(
    <MemoryRouter>
      <NewsUploader />
    </MemoryRouter>
  );

  const content = screen.getByPlaceholderText('Write the full announcement, report or league update...');
  fireEvent.change(content, { target: { value: 'Hello world' } });
  content.setSelectionRange(0, 5);
  fireEvent.select(content);
  fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

  expect(content).toHaveValue('**Hello** world');
  expect(screen.getByText('Hello', { selector: 'strong' })).toBeInTheDocument();

  content.setSelectionRange(10, 15);
  fireEvent.select(content);
  fireEvent.click(screen.getByRole('button', { name: 'Insert link' }));

  expect(content).toHaveValue('**Hello** [world](https://example.com)');
  expect(screen.getByRole('link', { name: 'world' }))
    .toHaveAttribute('href', 'https://example.com');
});

test('inserts a heading marker at the cursor and previews the heading', async () => {
  render(
    <MemoryRouter>
      <NewsUploader />
    </MemoryRouter>
  );

  const content = screen.getByPlaceholderText('Write the full announcement, report or league update...');
  fireEvent.click(screen.getByRole('button', { name: 'Heading' }));

  expect(content).toHaveValue('## Heading');
  expect(screen.getByRole('heading', { name: 'Heading', level: 2 }))
    .toBeInTheDocument();
});
