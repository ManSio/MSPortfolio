import { useEffect, useRef } from 'react';

/**
 * Adds .is-visible to elements with .reveal when they enter the viewport.
 * A MutationObserver also picks up elements mounted AFTER the initial pass
 * (e.g. blog cards that render once the async metrics fetch resolves) —
 * otherwise they would stay at opacity:0 forever.
 * CSS-only animation (see index.css) — no animation library needed.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    const observeAll = () => {
      root.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    };
    observeAll();

    const mo = new MutationObserver(observeAll);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return ref;
}
