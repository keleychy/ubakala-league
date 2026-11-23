import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../api/api';
import { callAdminApi } from '../api/adminApi';
import TeamProfilesAdmin from './TeamProfilesAdmin';

jest.mock('../api/api', () => ({
  api: { getTeams: jest.fn() }
}));

jest.mock('../api/adminApi', () => ({
  callAdminApi: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getTeams.mockResolvedValue([{
    id: 'team-1',
    name: 'Avodim United',
    profile_description: 'Existing description',
    profile_history: '',
    home_community: ''
  }]);
});

test('admin can edit a team profile and receives a save confirmation', async () => {
  callAdminApi.mockResolvedValue({
    id: 'team-1',
    name: 'Avodim United',
    profile_description: 'Updated team description',
    profile_history: 'Club history',
    home_community: 'Ubakala',
    logo: ''
  });

  render(
    <MemoryRouter>
      <TeamProfilesAdmin />
    </MemoryRouter>
  );

  const description = await screen.findByRole('textbox', {
    name: /Short team description/
  });
  fireEvent.change(description, { target: { value: 'Updated team description' } });
  fireEvent.change(screen.getByRole('textbox', {
    name: /Team history and achievements/
  }), {
    target: { value: 'Club history' }
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Home community' }), {
    target: { value: 'Ubakala' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save team profile' }));

  await waitFor(() => {
    expect(callAdminApi).toHaveBeenCalledWith('admin.teams.profile.update', {
      team_id: 'team-1',
      profile_description: 'Updated team description',
      profile_history: 'Club history',
      home_community: 'Ubakala',
      logo: ''
    });
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Team profile saved.');
});

test('shows missing or duplicate profile sheet headers before a save is attempted', async () => {
  api.getTeams.mockResolvedValue([{
    id: 'team-1',
    name: 'Avodim United',
    profile_description: 'Description',
    profile_history: 'History',
    home_community: 'Ubakala',
    team_profile_schema: {
      missing: ['profile_history'],
      duplicates: ['home_community']
    }
  }]);

  render(
    <MemoryRouter>
      <TeamProfilesAdmin />
    </MemoryRouter>
  );

  const setupWarning = await screen.findByRole('alert');
  expect(setupWarning).toHaveTextContent('profile_history');
  expect(setupWarning).toHaveTextContent('home_community');
  expect(screen.getByText('1 of 1 profiles complete')).toBeInTheDocument();
});

test('saves an authentic team badge image through the existing logo field', async () => {
  callAdminApi.mockResolvedValue({
    id: 'team-1',
    name: 'Avodim United',
    logo: 'https://example.com/avodim.jpg',
    profile_description: 'Description',
    profile_history: 'History',
    home_community: 'Ubakala'
  });

  render(
    <MemoryRouter>
      <TeamProfilesAdmin />
    </MemoryRouter>
  );

  fireEvent.change(await screen.findByRole('textbox', {
    name: 'Team badge or photo URL'
  }), {
    target: { value: 'https://example.com/avodim.jpg' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save team profile' }));

  await waitFor(() => {
    expect(callAdminApi).toHaveBeenCalledWith(
      'admin.teams.profile.update',
      expect.objectContaining({ logo: 'https://example.com/avodim.jpg' })
    );
  });
});
