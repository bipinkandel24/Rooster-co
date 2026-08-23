# Source footage

Original training clips filmed for the shop. **Nothing in this folder is
deployed** — Vite only publishes `public/`, so these files stay in the repo
without being served.

They used to sit in `public/videos/`, where they were copied into every build:
23 MB of the 24 MB output, downloaded by nobody. No code has ever referenced
them. Training videos play from YouTube via `getVideoUrl()` in
`src/data/content.js`, and a local file can't be reached through that path.

## Using these clips

The `fire` and `saladprep` modules are still on `YOUR_VIDEO_ID` placeholders,
which is presumably what these were filmed for. To use them, upload each to
YouTube (unlisted is fine) and paste the link into `YOUTUBE_VIDEOS` in
`src/data/content.js`:

```js
fire: ["https://www.youtube.com/watch?v=<id>"],
```

That keeps videos off the app's own bandwidth and gives you streaming and
quality switching for free — worth having when staff open these on mobile data
mid-shift. `saladprep-1.mp4` is 19 MB; serving it directly would mean sending
all 19 MB before playback, with no adaptive quality.

Don't move these back into `public/` to "make them work" — that publishes them
again without making them reachable.
