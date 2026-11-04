import React from 'react';
import { act, render } from '@testing-library/react';
import usePolling from './usePolling';

const PollingProbe = ({ callback, options }) => {
  usePolling(callback, options);
  return null;
};

describe('usePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pauses scheduled polling while hidden and refreshes when visible', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <PollingProbe callback={callback} options={{ interval: 100 }} />
    );

    expect(callback).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
    });

    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(callback).toHaveBeenCalledTimes(2);
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('waits while initially hidden and polls immediately when shown', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    const callback = jest.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <PollingProbe
        callback={callback}
        options={{ interval: 100, immediate: false }}
      />
    );

    expect(callback).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(callback).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
  });
});
