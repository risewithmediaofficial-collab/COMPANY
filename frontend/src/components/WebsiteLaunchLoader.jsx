import React, { useEffect, useRef, useState } from 'react';
import './WebsiteLaunchLoader.css';

const FRAME_COUNT = 24;
const FPS = 18;
const FRAME_DURATION = 1000 / FPS; // ~55.56ms per frame
const MIN_VISIBLE_TIME = 1400; // Minimum visibility in ms to ensure assembled logo holds nicely
const FADE_OUT_DURATION = 500; // Smooth exit transition duration in ms

// Programmatically generate 24 frame asset URLs served from public folder
const FRAME_PATHS = Array.from(
  { length: FRAME_COUNT },
  (_, index) =>
    `/website_launch_loader/frames/frame_${String(index + 1).padStart(3, '0')}.png`
);

/**
 * Preload and decode all 24 PNG frames into GPU memory before starting playback.
 * img.decode() ensures uncompressed raster bitmaps are cached, preventing any main-thread
 * decode stutter during playback on mobile or lower-powered devices.
 */
const preloadAndDecodeFrames = (urls, timeoutMs = 2800) => {
  return new Promise((resolve) => {
    let resolved = false;
    let loadedCount = 0;
    const total = urls.length;
    const loadedImages = new Array(total);

    const finish = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(loadedImages);
      }
    };

    const timer = setTimeout(finish, timeoutMs);

    urls.forEach((src, idx) => {
      const img = new Image();
      let handled = false;

      const onImageReady = async () => {
        if (handled) return;
        handled = true;

        if (img.decode) {
          try {
            await img.decode();
          } catch {
            // Graceful fallback if decode() rejects
          }
        }
        loadedImages[idx] = img;
        loadedCount += 1;
        if (loadedCount >= total) {
          finish();
        }
      };

      img.onload = onImageReady;
      img.onerror = () => {
        if (handled) return;
        handled = true;
        loadedImages[idx] = img;
        loadedCount += 1;
        if (loadedCount >= total) {
          finish();
        }
      };

      img.src = src;

      if (img.complete) {
        onImageReady();
      }
    });
  });
};

const WebsiteLaunchLoader = () => {
  const [isMounted, setIsMounted] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    let animFrameId = null;
    let holdTimerId = null;
    let unmountTimerId = null;

    // Prevent body scrolling and scrollbar pop layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalOverflow = document.body.style.overflow;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Respect prefers-reduced-motion: show final assembled logo directly
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const mountTime = performance.now();

    // Cached 2D context for maximum rendering throughput
    let ctx = null;
    const getContext = () => {
      if (!ctx && canvasRef.current) {
        ctx = canvasRef.current.getContext('2d', { alpha: true });
      }
      return ctx;
    };

    // Draw frame onto GPU canvas
    const renderFrame = (images, index) => {
      const frameImg = images[index];
      if (!frameImg) return;

      const context = getContext();
      const canvas = canvasRef.current;
      if (!context || !canvas) return;

      const w = frameImg.naturalWidth || 1024;
      const h = frameImg.naturalHeight || 1024;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      context.clearRect(0, 0, w, h);
      context.drawImage(frameImg, 0, 0, w, h);
    };

    // Smooth exit handler: triggers CSS cubic-bezier fade and unmounts from DOM
    const triggerExit = () => {
      if (isCancelled) return;
      setIsFading(true);

      // Restore scroll and padding cleanly
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      unmountTimerId = setTimeout(() => {
        if (!isCancelled) {
          setIsMounted(false);
        }
      }, FADE_OUT_DURATION + 60);
    };

    if (prefersReducedMotion) {
      // For reduced motion users: preload last frame and display directly
      const lastImg = new Image();
      lastImg.onload = () => {
        if (!isCancelled) {
          renderFrame([lastImg], 0);
        }
      };
      lastImg.src = FRAME_PATHS[FRAME_COUNT - 1];

      holdTimerId = setTimeout(triggerExit, 900);

      return () => {
        isCancelled = true;
        clearTimeout(holdTimerId);
        clearTimeout(unmountTimerId);
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }

    // Sequence completion handler: holds final frame briefly, waits for page ready, fades out
    const onSequenceComplete = () => {
      const totalElapsed = performance.now() - mountTime;
      const remainingHoldTime = Math.max(150, MIN_VISIBLE_TIME - totalElapsed);

      const proceedWhenReady = () => {
        if (document.readyState === 'complete') {
          triggerExit();
        } else {
          const handleWindowLoad = () => {
            window.removeEventListener('load', handleWindowLoad);
            triggerExit();
          };
          window.addEventListener('load', handleWindowLoad);

          // Failsafe so the loader never gets stuck waiting for window.load
          setTimeout(() => {
            window.removeEventListener('load', handleWindowLoad);
            triggerExit();
          }, 1200);
        }
      };

      holdTimerId = setTimeout(proceedWhenReady, remainingHoldTime);
    };

    // Preload & decode all 24 frames before starting playback
    preloadAndDecodeFrames(FRAME_PATHS).then((images) => {
      if (isCancelled) return;

      // Draw initial frame 1
      renderFrame(images, 0);

      let currentFrame = 0;
      let lastFrameTime = performance.now();

      const tick = (now) => {
        if (isCancelled) return;

        const delta = now - lastFrameTime;

        if (delta >= FRAME_DURATION) {
          const framesToAdvance = Math.floor(delta / FRAME_DURATION);
          currentFrame = Math.min(FRAME_COUNT - 1, currentFrame + framesToAdvance);
          lastFrameTime = now - (delta % FRAME_DURATION);

          renderFrame(images, currentFrame);
        }

        if (currentFrame < FRAME_COUNT - 1) {
          animFrameId = requestAnimationFrame(tick);
        } else {
          // Reached final frame 24
          renderFrame(images, FRAME_COUNT - 1);
          onSequenceComplete();
        }
      };

      animFrameId = requestAnimationFrame(tick);
    });

    return () => {
      isCancelled = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      clearTimeout(holdTimerId);
      clearTimeout(unmountTimerId);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      ref={containerRef}
      id="website-launch-loader"
      className={`website-launch-loader ${isFading ? 'is-fading' : ''}`}
      aria-hidden="true"
      role="presentation"
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      <div className="website-launch-loader__inner">
        <canvas
          ref={canvasRef}
          width="1024"
          height="1024"
          className="website-launch-loader__canvas"
        />
      </div>
    </div>
  );
};

export default WebsiteLaunchLoader;
