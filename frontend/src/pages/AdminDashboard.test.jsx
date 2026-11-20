import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { callAdminApi } from '../api/adminApi';

jest.mock('../api/adminApi', () => ({
  callAdminApi: jest.fn()
}));

jest.mock('../api/firebaseAuth', () => ({
  signOutAdmin: jest.fn()
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );
}

test('loads the support click count for the admin role', async () => {
  callAdminApi.mockImplementation(action => Promise.resolve(
    action === 'admin.me'
      ? { email: 'admin@example.com', role: 'admin' }
      : { click_count: 23 }
  ));

  renderDashboard();

  expect(await screen.findByText('23 total button clicks')).toBeInTheDocument();
  expect(callAdminApi).toHaveBeenCalledWith('admin.support.clickCount');
});

test('does not request or display the support click count for a results editor', async () => {
  callAdminApi.mockResolvedValue({ email: 'editor@example.com', role: 'ResultsEditor' });

  renderDashboard();

  expect(await screen.findByText('Results Editor')).toBeInTheDocument();
  expect(callAdminApi).toHaveBeenCalledTimes(1);
  expect(callAdminApi).not.toHaveBeenCalledWith('admin.support.clickCount');
  expect(screen.queryByText('Homepage Support clicks')).not.toBeInTheDocument();
});
