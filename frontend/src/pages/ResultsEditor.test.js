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
  home_team_id: 'team-home',
  away_team_id: 'team-away',
  status: 'FINISHED',
  current_period: 'ENDED',
  home_team_name: 'Eagle FC',
  away_team_name: 'Rangers FC',
  home_score: 2,
  away_score: 1,
  match_date: '2026-10-01'
};

const scheduledMatch = {
  ...finishedMatch,
  status: 'SCHEDULED',
  current_period: 'NOT_STARTED',
  home_score: 1,
  away_score: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
  callAdminApi.mockImplementation(action => {
    if (action === 'admin.matches.list') return Promise.resolve([finishedMatch]);
    return Promise.resolve({});
  });
});

function renderScheduledMatch(match = scheduledMatch, apiImplementation) {
  if (apiImplementation) {
    callAdminApi.mockImplementation(apiImplementation);
  } else {
    callAdminApi.mockImplementation(action => {
      if (action === 'admin.matches.list') return Promise.resolve([match]);
      return Promise.resolve({});
    });
  }
  render(<ResultsEditor />);
}

function getMatchStatusSelect() {
  return document.querySelector('select[id^="status-"]');
}

function getMatchStatusUpdateButton() {
  return document.querySelector('.results-control-group .results-small-button');
}

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
  fireEvent.change(screen.getByLabelText('Reason for result correction'), {
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

test('saves FIFA fair-play card categories for both teams', async () => {
  const groupMatch = {
    ...finishedMatch,
    stage: 'GROUP',
    status: 'SCHEDULED',
    current_period: 'NOT_STARTED',
    home_score: null,
    away_score: null,
  };
  callAdminApi.mockImplementation(action => {
    if (action === 'admin.matches.list') return Promise.resolve([groupMatch]);
    return Promise.resolve({});
  });

  render(<ResultsEditor />);
  await screen.findByText('Eagle FC', { selector: '.results-team-name' });
  fireEvent.click(screen.getByText('Fair-play cards (optional)'));

  const cardCounts = {
    'Eagle FC Yellow only': '1',
    'Eagle FC Second yellow red': '0',
    'Eagle FC Direct red': '0',
    'Eagle FC Yellow + direct red': '0',
    'Rangers FC Yellow only': '0',
    'Rangers FC Second yellow red': '1',
    'Rangers FC Direct red': '0',
    'Rangers FC Yellow + direct red': '0',
  };
  Object.entries(cardCounts).forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
  fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '1' } });
  fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Result' }));

  await waitFor(() => {
    expect(callAdminApi).toHaveBeenCalledWith('admin.matches.setResult', expect.objectContaining({
      match_id: 'match-1',
      home_score: 1,
      away_score: 0,
      home_fair_play_yellow_only: 1,
      home_fair_play_second_yellow_red: 0,
      home_fair_play_direct_red: 0,
      home_fair_play_yellow_direct_red: 0,
      away_fair_play_yellow_only: 0,
      away_fair_play_second_yellow_red: 1,
      away_fair_play_direct_red: 0,
      away_fair_play_yellow_direct_red: 0,
    }));
  });
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

  test('finalizing a normal match saves the entered score as FINISHED', async () => {
    renderScheduledMatch();
    await screen.findByText('Eagle FC', { selector: '.results-team-name' });

    fireEvent.change(getMatchStatusSelect(), {
      target: { value: 'FINISHED' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

    await waitFor(() => {
      expect(callAdminApi).toHaveBeenCalledWith('admin.matches.markFinished', {
        match_id: 'match-1',
        status: 'FINISHED',
        home_score: 1,
        away_score: 2
      });
    });
  });

  test('walkover award saves a 3–0 score for the selected winner with award metadata', async () => {
    renderScheduledMatch();
    await screen.findByText('Eagle FC', { selector: '.results-team-name' });

    fireEvent.change(getMatchStatusSelect(), {
      target: { value: 'AWARDED' }
    });
    fireEvent.change(screen.getByLabelText('Award reason'), {
      target: { value: 'WALKOVER' }
    });
    fireEvent.change(screen.getByLabelText('Awarded winner'), {
      target: { value: 'team-away' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

    await waitFor(() => {
      expect(callAdminApi).toHaveBeenCalledWith('admin.matches.markFinished', expect.objectContaining({
        match_id: 'match-1',
        status: 'AWARDED',
        home_score: 0,
        away_score: 3,
        result_type: 'WALKOVER',
        awarded_winner_team_id: 'team-away',
        award_reason: 'WALKOVER'
      }));
    });
    expect(screen.getByText('Awarded', { selector: '.results-status-badge' })).toBeInTheDocument();
  });

  test('protest award saves the selected winner, committee score, and decision reason', async () => {
    renderScheduledMatch();
    await screen.findByText('Eagle FC', { selector: '.results-team-name' });

    fireEvent.change(getMatchStatusSelect(), {
      target: { value: 'AWARDED' }
    });
    fireEvent.change(screen.getByLabelText('Award reason'), {
      target: { value: 'PROTEST' }
    });
    fireEvent.change(screen.getByLabelText('Awarded winner'), {
      target: { value: 'team-home' }
    });
    fireEvent.change(screen.getByLabelText('Award decision details'), {
      target: { value: 'Protest Committee ruling 04/2026' }
    });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], {
      target: { value: '2' }
    });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], {
      target: { value: '0' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

    await waitFor(() => {
      expect(callAdminApi).toHaveBeenCalledWith('admin.matches.markFinished', expect.objectContaining({
        status: 'AWARDED',
        home_score: 2,
        away_score: 0,
        result_type: 'PROTEST',
        awarded_winner_team_id: 'team-home',
        award_reason: 'Protest Committee ruling 04/2026'
      }));
    });
  });

  test.each(['CANCELLED', 'ABANDONED', 'VOID'])(
    '%s does not add an automatic score or declare an award winner',
    async status => {
      renderScheduledMatch();
      await screen.findByText('Eagle FC', { selector: '.results-team-name' });

      fireEvent.change(getMatchStatusSelect(), {
        target: { value: status }
      });
      fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

      await waitFor(() => {
        expect(callAdminApi).toHaveBeenCalledWith('admin.matches.markFinished', {
          match_id: 'match-1',
          status
        });
      });
    }
  );

  test('Mark Match Finished preserves AWARDED instead of overwriting it as FINISHED', async () => {
    renderScheduledMatch();
    await screen.findByText('Eagle FC', { selector: '.results-team-name' });

    fireEvent.change(getMatchStatusSelect(), {
      target: { value: 'AWARDED' }
    });
    fireEvent.change(screen.getByLabelText('Award reason'), {
      target: { value: 'WALKOVER' }
    });
    fireEvent.change(screen.getByLabelText('Awarded winner'), {
      target: { value: 'team-home' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

    await waitFor(() => {
      expect(callAdminApi).toHaveBeenCalledWith('admin.matches.markFinished', expect.objectContaining({
        status: 'AWARDED'
      }));
    });
    expect(callAdminApi).not.toHaveBeenCalledWith('admin.matches.markFinished', expect.objectContaining({
      status: 'FINISHED'
    }));
  });

  test.each(['PENDING', 'SCHEDULED', 'LIVE', 'POSTPONED'])(
    '%s cannot be finalized but can be saved as a status-only update',
    async status => {
      renderScheduledMatch();
      await screen.findByText('Eagle FC', { selector: '.results-team-name' });

      fireEvent.change(getMatchStatusSelect(), { target: { value: status } });
      fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

      expect(await screen.findByText(
        new RegExp(`A ${status.toLowerCase()} match cannot be finalized`)
      )).toBeInTheDocument();
      expect(callAdminApi).not.toHaveBeenCalledWith(
        'admin.matches.markFinished',
        expect.anything()
      );
      fireEvent.click(getMatchStatusUpdateButton());
      await waitFor(() => {
        expect(callAdminApi).toHaveBeenCalledWith('admin.matches.setStatus', {
          match_id: 'match-1',
          status
        });
      });
    }
  );

  test.each([
    'PENDING',
    'SCHEDULED',
    'LIVE',
    'POSTPONED',
    'CANCELLED',
    'ABANDONED',
    'VOID'
  ])(
    'status selector persists %s without finalizing or changing the score',
    async status => {
      renderScheduledMatch();
      await screen.findByText('Eagle FC', { selector: '.results-team-name' });

      fireEvent.change(getMatchStatusSelect(), {
        target: { value: status }
      });
      fireEvent.click(getMatchStatusUpdateButton());

      await waitFor(() => {
        expect(callAdminApi).toHaveBeenCalledWith('admin.matches.setStatus', {
          match_id: 'match-1',
          status
        });
      });
      expect(callAdminApi).not.toHaveBeenCalledWith(
        'admin.matches.markFinished',
        expect.anything()
      );
    }
  );

  test('reloading after finalization displays the saved status and score', async () => {
    let storedMatch = { ...scheduledMatch };
    renderScheduledMatch(scheduledMatch, (action, payload) => {
      if (action === 'admin.matches.list') return Promise.resolve([{ ...storedMatch }]);
      if (action === 'admin.matches.markFinished') {
        storedMatch = { ...storedMatch, ...payload, current_period: 'ENDED' };
        return Promise.resolve(storedMatch);
      }
      return Promise.resolve({});
    });
    await screen.findByText('Eagle FC', { selector: '.results-team-name' });

    fireEvent.change(getMatchStatusSelect(), {
      target: { value: 'FINISHED' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Match Finished' }));

    expect(await screen.findByText('Full Time')).toBeInTheDocument();
    await waitFor(() => {
      expect(callAdminApi).toHaveBeenCalledWith('admin.matches.list', {});
      expect(storedMatch.status).toBe('FINISHED');
      expect(storedMatch.home_score).toBe(1);
      expect(storedMatch.away_score).toBe(2);
    });
  });
