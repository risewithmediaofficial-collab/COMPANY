import React, { useEffect, useRef, useState, useCallback } from 'react';
import './WebsiteLaunchLoader.css';

const FRAME_COUNT = 24;
const FPS = 18;
const FRAME_DURATION = 1000 / FPS; // ~55.56ms per frame
const MIN_VISIBLE_TIME = 1400; // Minimum visibility in ms
const FADE_OUT_DURATION = 500; // Smooth exit transition duration in ms

// Programmatically generate 24 frame asset URLs served from public folder
const FRAME_PATHS = Array.from(
  { length: FRAME_COUNT },
  (_, index) =>
    `/website_launch_loader/frames/frame_${String(index + 1).padStart(3, '0')}.png`
);

/**
 * Check if the application is running as an installed PWA / Chrome app
 */
const checkIsStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    (window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true ||
    (typeof document !== 'undefined' &&
      document.referrer.includes('android-app://'))
  );
};

/**
 * Preload and decode all 24 PNG frames into GPU memory before playback.
 * onFirstFrameLoaded callback allows immediate rendering of frame 1 without delay.
 */
const preloadAndDecodeFrames = (urls, onFirstFrameLoaded, timeoutMs = 3000) => {
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
            // Graceful fallback
          }
        }

        loadedImages[idx] = img;

        // If frame 1 is ready, notify caller to render it immediately
        if (idx === 0 && onFirstFrameLoaded) {
          onFirstFrameLoaded(img);
        }

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

  const imagesRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Helper to draw a frame onto the canvas
  const renderFrame = useCallback((img) => {
    if (!img) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  }, []);

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

    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth exit handler: triggers CSS cubic-bezier fade and unmounts from DOM
    const triggerExit = () => {
      if (isCancelled) return;
      setIsFading(true);

      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      unmountTimerId = setTimeout(() => {
        if (!isCancelled) {
          setIsMounted(false);
        }
      }, FADE_OUT_DURATION + 60);
    };

    // Execution routine: starts RAF playback loop once the viewport is actually visible
    const executePlayback = (images) => {
      if (isCancelled || isPlayingRef.current) return;
      isPlayingRef.current = true;

      // Start timing from the EXACT moment playback starts in the foreground
      const playbackStartTime = performance.now();
      let currentFrame = 0;
      let lastFrameTime = performance.now();

      renderFrame(images[0]);

      const tick = (now) => {
        if (isCancelled) return;

        const delta = now - lastFrameTime;

        if (delta >= FRAME_DURATION) {
          const framesToAdvance = Math.floor(delta / FRAME_DURATION);
          currentFrame = Math.min(FRAME_COUNT - 1, currentFrame + framesToAdvance);
          lastFrameTime = now - (delta % FRAME_DURATION);

          renderFrame(images[currentFrame]);
        }

        if (currentFrame < FRAME_COUNT - 1) {
          animFrameId = requestAnimationFrame(tick);
        } else {
          // Reached final frame 24
          renderFrame(images[FRAME_COUNT - 1]);

          // Ensure completed logo holds for at least MIN_VISIBLE_TIME from playback start
          const elapsed = performance.now() - playbackStartTime;
          const remainingHold = Math.max(300, MIN_VISIBLE_TIME - elapsed);

          holdTimerId = setTimeout(() => {
            triggerExit();
          }, remainingHold);
        }
      };

      animFrameId = requestAnimationFrame(tick);
    };

    // Preload all frames and start sequence
    preloadAndDecodeFrames(
      FRAME_PATHS,
      (firstImg) => {
        // Immediate paint of frame 1 as soon as it's ready
        if (!isCancelled) {
          renderFrame(firstImg);
        }
      }
    ).then((images) => {
      if (isCancelled) return;
      imagesRef.current = images;

      if (prefersReducedMotion) {
        // Show final assembled logo directly
        renderFrame(images[FRAME_COUNT - 1]);
        holdTimerId = setTimeout(triggerExit, 900);
        return;
      }

      // CRUCIAL FOR INSTALLED CHROME APPS (PWAs):
      // When Chrome launches an installed PWA, it displays a system splash screen.
      // During that time, document.visibilityState may be 'hidden'.
      // We must WAIT until the app window becomes 'visible' before starting playback,
      // so the user never misses the launch animation!
      if (document.visibilityState === 'hidden') {
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            // Allow 2 animation frames for Chrome splash screen crossfade handoff
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                executePlayback(images);
              });
            });
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
      } else {
        requestAnimationFrame(() => {
          executePlayback(images);
        });
      }
    });

    // Handle resume in standalone installed Chrome app:
    // If the user backgrounded the installed app for > 20s and re-opens it from home screen
    let lastHiddenTimestamp = null;
    const isStandalone = checkIsStandalone();

    const handleStandaloneResume = () => {
      if (!isStandalone) return;

      if (document.visibilityState === 'hidden') {
        lastHiddenTimestamp = Date.now();
      } else if (
        document.visibilityState === 'visible' &&
        lastHiddenTimestamp &&
        Date.now() - lastHiddenTimestamp > 20000
      ) {
        // Re-trigger launch animation on installed app reopen after being away
        setIsMounted(true);
        setIsFading(false);
        isPlayingRef.current = false;
        if (imagesRef.current && imagesRef.current.length === FRAME_COUNT) {
          executePlayback(imagesRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleStandaloneResume);

    return () => {
      isCancelled = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      clearTimeout(holdTimerId);
      clearTimeout(unmountTimerId);
      document.removeEventListener('visibilitychange', handleStandaloneResume);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [renderFrame]);

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
