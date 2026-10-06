(() => {
  const loader = document.getElementById("site-loader");
  const frameImage = document.getElementById("logo-frame");

  const FRAME_COUNT = 24;
  const FPS = 18;
  const FRAME_TIME = 1000 / FPS;
  const MIN_VISIBLE_TIME = 1400;

  const frames = Array.from(
    { length: FRAME_COUNT },
    (_, i) => `frames/frame_${String(i + 1).padStart(3, "0")}.png`
  );

  // Preload every image frame first.
  const preload = frames.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = src;
    });
  });

  const startedAt = performance.now();
  let animationFinished = false;
  let pageFinished = document.readyState === "complete";

  function tryCloseLoader() {
    if (!animationFinished || !pageFinished) return;

    const elapsed = performance.now() - startedAt;
    const wait = Math.max(0, MIN_VISIBLE_TIME - elapsed);

    window.setTimeout(() => {
      loader.classList.add("is-hidden");

      // Remove the loader after the fade so it no longer occupies DOM/render work.
      window.setTimeout(() => loader.remove(), 550);
    }, wait);
  }

  function playFrames() {
    let current = 0;
    let previousTime = performance.now();

    function tick(now) {
      if (now - previousTime >= FRAME_TIME) {
        previousTime = now;
        frameImage.src = frames[current];
        current += 1;
      }

      if (current < FRAME_COUNT) {
        requestAnimationFrame(tick);
      } else {
        // Keep the completed logo visible until the website is ready.
        frameImage.src = frames[FRAME_COUNT - 1];
        animationFinished = true;
        tryCloseLoader();
      }
    }

    requestAnimationFrame(tick);
  }

  Promise.all(preload).then(playFrames);

  window.addEventListener("load", () => {
    pageFinished = true;
    tryCloseLoader();
  });
})();
