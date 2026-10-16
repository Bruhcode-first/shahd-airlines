# Shahd Airlines ✈️

A small, phone-first gift website: a boarding pass for **Flight SH024**. Shahd tears off the stub, takes off through the clouds, and flies through five stops. Each stop is a tiny game that stamps her passport:

| Stop | What happens |
|------|--------------|
| 🏓 Ping Pong Island | A canvas rally. Return the ball 5 times. |
| 🌙 Sudoku Lounge | A 4×4 sudoku with a hint button and an official results card. |
| 🎨 Doodle Studio | Guess Yousef's (bad) drawing, then draw your own and send it. |
| 🍫 The Sweet Shop | A delivery tracker, a gift box and a pile of physics candy. |
| 🏸 Badminton Court | Tap in the glowing zone. 5 smashes to win. |

It lands on **Shahd's World**: a 3D globe with routes from Muscat, flip-over postcards, a carousel of next-stop boarding passes, the passport spread and a handwritten sign-off.

Built with Vite and vanilla ES modules, GSAP for motion, three-globe for the globe, Matter.js for the candy and canvas-confetti for celebrations. The globe and physics load lazily.

## Run it

```bash
npm i
npm run dev      # http://localhost:5173
npm test         # unit tests for the pure modules (node --test)
npm run e2e      # Playwright end-to-end tests (uses your installed Google Chrome)
```

Other scripts:

```bash
npm run build              # production build into dist/ (base /shahd-airlines/)
npm run preview            # serve dist/ at http://localhost:4173/shahd-airlines/
node tools/budget.mjs      # gzip budgets: first load <= 1.2MB, total <= 4MB (run after build)
node tools/render-og.mjs   # re-render the link preview: tools/og.html -> public/images/og-boarding-pass.png
```

Test hooks (`window.__sh024`) exist only in the dev server, never in the build.

## Deploy (GitHub Pages)

1. Create the GitHub repo `shahd-airlines` under `bruhcode-first`.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
4. The site is at **https://bruhcode-first.github.io/shahd-airlines/**

The link preview (`og:image`) points at `https://bruhcode-first.github.io/shahd-airlines/images/og-boarding-pass.png`. If the repo or account name changes, update the `og:` tags in `index.html` and `base` in `vite.config.js`.

## Credits

Photos are from Wikimedia Commons under CC0, CC BY, CC BY-SA or public domain; country shapes are from Natural Earth (public domain). Full credits are in [`public/images/CREDITS.md`](public/images/CREDITS.md) and in the site footer under "Photo credits".
