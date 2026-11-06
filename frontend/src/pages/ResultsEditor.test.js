import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { callAdminApi } from '../api/adminApi';
import ResultsEditor from './ResultsEditor';

jest.mock('../api/adminApi', () => ({
  callAdminApi: jest.fn()
}));

const finishedMatch = {
  id: 'match-1',
  season: { id: 'season-1', category: 'junior_boys' },
  stage: 'SF',
  status: 'FINISHED',
  current_period: 'ENDED',
  home_team_name: 'Eagle FC',
  away_team_name: 'Rangers FC',
  home_score: 2,
  away_score: 1,
  match_date: '2026-10-01'
};

beforeEach(() => {
  jest.clearAllMocks();
  callAdminApi.mockImplementation(action => {
    if (action === 'admin.matches.list') return Promise.resolve([finishedMatch]);
    return Promise.resolve({});
  });
});

test('finished matches remain available with their category separate from stage', async () => {
  render(<ResultsEditor />);

  const teamName = await screen.findByText('Eagle FC', { selector: '.results-team-name' });
  const matchCard = teamName.closest('.results-match-card');

  expect(within(matchCard).getByText('Junior Boys', { selector: '.results-match-category' }))
    .toBeInTheDocument();
  expect(within(matchCard).getByText('Semifinals', { selector: '.results-match-stage' }))
    .toBeInTheDocument();
  expect(within(matchCard).getByText('Full Time')).toBeInTheDocument();

  fireEvent.change(matchCard.querySelector('select[id^="status-"]'), {
    target: { value: 'finished' }
  });
  expect(screen.getByText('Eagle FC', { selector: '.results-team-name' })).toBeInTheDocument();
});

test('score corrections on finished matches require a reason and preserve finished status', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<ResultsEditor />);

  await screen.findByText('Eagle FC', { selector: '.results-team-name' });
  const scoreInputs = screen.getAllByRole('spinbutton');
  fireEvent.change(scoreInputs[0], { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Reason for score correction'), {
    target: { value: 'Official score sheet correction' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Result' }));

  await waitFor(() => {
    expect(callAdminApi).toHaveBeenCalledWith('admin.matches.setResult', {
      match_id: 'match-1',
      home_score: 3,
      away_score: 1,
      reason: 'Official score sheet correction'
    });
  });
  expect(confirm).toHaveBeenCalled();
  confirm.mockRestore();
});

test('reopening a finished match records a reason and resets its status and period', async () => {
  render(<ResultsEditor />);

  await screen.findByText('Eagle FC', { selector: '.results-team-name' });
  fireEvent.click(screen.getByRole('button', { name: 'Reopen Match' }));
  fireEvent.change(screen.getByLabelText('Reason for reopening'), {
    target: { value: 'Match was marked finished by mistake' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Reopen' }));

  await waitFor(() => {
    expect(callAdminApi).toHaveBeenCalledWith('admin.matches.reopen', {
      match_id: 'match-1',
      reason: 'Match was marked finished by mistake'
    });
  });
});
