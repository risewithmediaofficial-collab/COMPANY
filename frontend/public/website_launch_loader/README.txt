WEBSITE LAUNCH LOGO FRAME ANIMATION

Files:
- index.html
- loader.css
- loader.js
- frames/frame_001.png ... frame_024.png
- preview.gif

How it works:
1. The three cyan logo sections enter separately.
2. They join into the exact final logo.
3. The completed logo stays on screen until window.load fires.
4. The black preloader fades away and reveals the website.

How to add to your existing site:
- Copy the <div id="site-loader"> block from index.html near the top of <body>.
- Include loader.css in your <head>.
- Include loader.js before </body>.
- Keep the frames folder next to those files, or change the frame path in loader.js.

Speed:
- FRAME_COUNT = 24
- FPS = 18
- MIN_VISIBLE_TIME = 1400 ms

Increase FPS for faster/smoother playback.
Increase MIN_VISIBLE_TIME if you want the launch logo to remain visible longer.
