import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminSessionTimeout from './AdminSessionTimeout';
import { signOutAdmin } from '../api/firebaseAuth';
import { ADMIN_SESSION_ACTIVITY_KEY } from '../utils/adminSession';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

jest.mock('../api/firebaseAuth', () => ({
  signOutAdmin: jest.fn()
}));

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  jest.clearAllMocks();
  signOutAdmin.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

test('warns after 15 minutes idle and allows the admin to extend the session', () => {
  render(<AdminSessionTimeout><div>Protected admin content</div></AdminSessionTimeout>);

  act(() => {
    jest.advanceTimersByTime(15 * 60 * 1000);
  });
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Session Expiring Soon');

  fireEvent.click(screen.getByRole('button', { name: 'Continue session' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(window.localStorage.getItem(ADMIN_SESSION_ACTIVITY_KEY)).toBe(String(Date.now()));
});

test('signs out an idle administrator after the warning period', async () => {
  render(<AdminSessionTimeout><div>Protected admin content</div></AdminSessionTimeout>);

  act(() => {
    jest.advanceTimersByTime(17 * 60 * 1000);
  });

  await waitFor(() => {
    expect(signOutAdmin).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
  });
  expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument();
});

test('expires a session immediately when a suspended page resumes past the deadline', async () => {
  window.localStorage.setItem(
    ADMIN_SESSION_ACTIVITY_KEY,
    String(Date.now() - 18 * 60 * 1000)
  );
  render(<AdminSessionTimeout><div>Protected admin content</div></AdminSessionTimeout>);

  await waitFor(() => {
    expect(signOutAdmin).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
  });
});
