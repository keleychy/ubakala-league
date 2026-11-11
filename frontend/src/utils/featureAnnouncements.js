import { useEffect, useState } from 'react';

const PREDICTIONS_ANNOUNCEMENT_START = new Date(
  '2026-11-11T13:18:19.960+01:00'
).getTime();
const PREDICTIONS_ANNOUNCEMENT_END =
  PREDICTIONS_ANNOUNCEMENT_START + 7 * 24 * 60 * 60 * 1000;

export function isPredictionsAnnouncementActive(now = Date.now()) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  return timestamp >= PREDICTIONS_ANNOUNCEMENT_START &&
    timestamp < PREDICTIONS_ANNOUNCEMENT_END;
}

export function usePredictionsAnnouncement() {
  const [isActive, setIsActive] = useState(isPredictionsAnnouncementActive);

  useEffect(() => {
    if (!isActive) return undefined;

    const timeout = setTimeout(
      () => setIsActive(false),
      Math.max(0, PREDICTIONS_ANNOUNCEMENT_END - Date.now())
    );
    return () => clearTimeout(timeout);
  }, [isActive]);

  return isActive;
}
