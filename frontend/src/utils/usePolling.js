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
            try {
                await cbRef.current();
            } catch (e) {
                // swallow - callers handle their own errors
            }
            if (cancelled) return;
            timer = setTimeout(run, nextDelay());
        };

        if (immediate) run(); else timer = setTimeout(run, nextDelay());

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
        // only recreate when options change
    }, [interval, minInterval, maxInterval, immediate]);
}
