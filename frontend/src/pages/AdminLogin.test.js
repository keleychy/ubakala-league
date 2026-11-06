import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { callAdminApi } from '../api/adminApi';
import AdminLogin from './AdminLogin';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn()
}));

jest.mock('../api/firebaseClient', () => ({
  getFirebaseAuth: jest.fn(() => ({}))
}));

jest.mock('../api/adminApi', () => ({
  callAdminApi: jest.fn()
}));

jest.mock('../api/firebaseAuth', () => ({
  sendAdminPasswordReset: jest.fn(),
  signInAdmin: jest.fn(),
  signOutAdmin: jest.fn()
}));

function renderAdminLogin() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<div>Admin dashboard destination</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  onAuthStateChanged.mockImplementation((auth, callback) => {
    Promise.resolve().then(() => callback(null));
    return jest.fn();
  });
});

test('an already signed-in admin is redirected to the dashboard', async () => {
  onAuthStateChanged.mockImplementation((auth, callback) => {
    Promise.resolve().then(() => callback({ email: 'admin@example.com' }));
    return jest.fn();
  });
  callAdminApi.mockResolvedValue({ role: 'admin' });

  renderAdminLogin();

  expect(await screen.findByText('Admin dashboard destination')).toBeInTheDocument();
});

test('a signed-out visitor can still access the admin login form', async () => {
  renderAdminLogin();

  expect(await screen.findByRole('heading', { name: 'Admin Login' })).toBeInTheDocument();
});
