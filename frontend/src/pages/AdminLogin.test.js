import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { callAdminApi } from '../api/adminApi';
import { signInAdmin, signOutAdmin } from '../api/firebaseAuth';
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
  signOutAdmin.mockResolvedValue(undefined);
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

test('administrator sign-in shows a friendly message for Firebase credential errors', async () => {
  signInAdmin.mockRejectedValue(Object.assign(
    new Error('Firebase: Error (auth/invalid-credential).'),
    { code: 'auth/invalid-credential' }
  ));

  renderAdminLogin();

  fireEvent.change(await screen.findByLabelText('Email'), {
    target: { value: 'admin@example.com' }
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'incorrect-password' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));

  expect(await screen.findByText('The email or password is incorrect.')).toBeInTheDocument();
  expect(screen.queryByText(/auth\/invalid-credential/)).not.toBeInTheDocument();
});
