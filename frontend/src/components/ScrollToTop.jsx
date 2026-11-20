import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map());
  const activeLocationKey = useRef(location.key);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const saveScrollPosition = () => {
      scrollPositions.current.set(
        activeLocationKey.current,
        window.scrollY || window.pageYOffset || 0
      );
    };

    window.addEventListener('scroll', saveScrollPosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    if (activeLocationKey.current === location.key) return;

    scrollPositions.current.set(
      activeLocationKey.current,
      window.scrollY || window.pageYOffset || 0
    );
    activeLocationKey.current = location.key;

    const top = navigationType === 'POP'
      ? scrollPositions.current.get(location.key) || 0
      : 0;
    window.scrollTo(0, top);
  }, [location.key, navigationType]);

  return null;
}
