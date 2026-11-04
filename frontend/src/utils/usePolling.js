import { useEffect, useRef } from 'react';

/**
 * usePolling - call an async callback repeatedly.
 *
 * callback: async function to run
 * options: { interval, minInterval, maxInterval, immediate }
 * - if minInterval && maxInterval are provided a random delay between them is used
 * - otherwise `interval` (ms) is used (default 7000)
 */
export default function usePolling(callback, options = {}) {
    const { interval = 7000, minInterval = null, maxInterval = null, immediate = true } = options || {};
    const cbRef = useRef(callback);

    useEffect(() => { cbRef.current = callback; }, [callback]);

    useEffect(() => {
        let cancelled = false;
        let timer = null;
        let running = false;
        let runImmediatelyAfterCurrent = false;

        const isVisible = () =>
            typeof document === 'undefined' ||
            document.visibilityState !== 'hidden';

        const nextDelay = () => {
            if (minInterval != null && maxInterval != null) {
                const min = Number(minInterval);
                const max = Number(maxInterval);
                if (!isNaN(min) && !isNaN(max) && max >= min) {
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                }
            }
            return Number(interval) || 7000;
        };

        const run = async () => {
            if (cancelled || !isVisible() || running) return;

            running = true;
            try {
                await cbRef.current();
            } catch (e) {
                // swallow - callers handle their own errors
            } finally {
                running = false;
            }

            if (cancelled || !isVisible()) return;

            if (runImmediatelyAfterCurrent) {
                runImmediatelyAfterCurrent = false;
                run();
                return;
            }

            timer = setTimeout(run, nextDelay());
        };

        const onVisibilityChange = () => {
            if (!isVisible()) {
                if (timer) clearTimeout(timer);
                timer = null;
                runImmediatelyAfterCurrent = false;
                return;
            }

            if (running) {
                runImmediatelyAfterCurrent = true;
                return;
            }

            runImmediatelyAfterCurrent = false;
            run();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        if (immediate) run(); else timer = setTimeout(run, nextDelay());

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
        // only recreate when options change
    }, [interval, minInterval, maxInterval, immediate]);
}
