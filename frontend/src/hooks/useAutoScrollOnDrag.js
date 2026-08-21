import { useEffect, useRef } from 'react';

/**
 * useAutoScrollOnDrag
 * Smoothly auto-scrolls a container horizontally (and vertically if enabled)
 * when a user drags an item near the edges of the container viewport.
 *
 * @param {React.RefObject} containerRef - Ref to the scrollable container
 * @param {boolean} isDragging - True when a card/item is actively being dragged
 * @param {object} options - Configuration options
 */
export function useAutoScrollOnDrag(containerRef, isDragging, options = {}) {
  const {
    edgeThreshold = 120,
    maxSpeed = 22,
    enableVertical = false,
  } = options;

  const animFrameRef = useRef(null);
  const scrollSpeedXRef = useRef(0);
  const scrollSpeedYRef = useRef(0);

  useEffect(() => {
    if (!isDragging) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      scrollSpeedXRef.current = 0;
      scrollSpeedYRef.current = 0;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const startScrollLoop = () => {
      if (!animFrameRef.current) {
        const loop = () => {
          if (containerRef.current && (scrollSpeedXRef.current !== 0 || scrollSpeedYRef.current !== 0)) {
            if (scrollSpeedXRef.current !== 0) {
              containerRef.current.scrollLeft += scrollSpeedXRef.current;
            }
            if (enableVertical && scrollSpeedYRef.current !== 0) {
              containerRef.current.scrollTop += scrollSpeedYRef.current;
            }
            animFrameRef.current = requestAnimationFrame(loop);
          } else {
            animFrameRef.current = null;
          }
        };
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    const handleDragOver = (e) => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const rect = containerEl.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      let speedX = 0;
      let speedY = 0;

      // Horizontal edge detection
      // Left edge zone
      if (clientX < rect.left + edgeThreshold && clientX >= rect.left - 60) {
        const distance = Math.max(0, clientX - rect.left);
        const intensity = Math.max(0.15, Math.min(1, 1 - distance / edgeThreshold));
        speedX = -Math.round(intensity * maxSpeed);
      }
      // Right edge zone
      else if (clientX > rect.right - edgeThreshold && clientX <= rect.right + 60) {
        const distance = Math.max(0, rect.right - clientX);
        const intensity = Math.max(0.15, Math.min(1, 1 - distance / edgeThreshold));
        speedX = Math.round(intensity * maxSpeed);
      }

      // Vertical edge detection (optional)
      if (enableVertical) {
        if (clientY < rect.top + edgeThreshold && clientY >= rect.top - 40) {
          const distance = Math.max(0, clientY - rect.top);
          const intensity = Math.max(0.15, Math.min(1, 1 - distance / edgeThreshold));
          speedY = -Math.round(intensity * maxSpeed);
        } else if (clientY > rect.bottom - edgeThreshold && clientY <= rect.bottom + 40) {
          const distance = Math.max(0, rect.bottom - clientY);
          const intensity = Math.max(0.15, Math.min(1, 1 - distance / edgeThreshold));
          speedY = Math.round(intensity * maxSpeed);
        }
      }

      scrollSpeedXRef.current = speedX;
      scrollSpeedYRef.current = speedY;

      if (speedX !== 0 || speedY !== 0) {
        startScrollLoop();
      }
    };

    const handleDragEnd = () => {
      scrollSpeedXRef.current = 0;
      scrollSpeedYRef.current = 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };

    // Attach listeners to window so dragging over any part of the viewport triggers auto-scroll
    window.addEventListener('dragover', handleDragOver, { passive: true });
    window.addEventListener('dragend', handleDragEnd, { passive: true });
    window.addEventListener('drop', handleDragEnd, { passive: true });
    window.addEventListener('mouseup', handleDragEnd, { passive: true });

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
      window.removeEventListener('mouseup', handleDragEnd);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isDragging, edgeThreshold, maxSpeed, enableVertical, containerRef]);
}
