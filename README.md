# PUP Hymn Karaoke

Browser karaoke for the Polytechnic University of the Philippines school hymn (*Imno ng PUP*). Vanilla HTML, CSS, and JavaScript. Word-level LRC sync, click-to-seek, and PUP maroon branding.

## Features

| Feature | Description |
|---------|-------------|
| Word-level sync | Each word highlights as the hymn plays |
| Click-to-seek | Click a word to jump to that timestamp |
| Auto-scroll | Active line stays in view |
| Transport | Play/pause, +/- seek, progress bar |
| Offline friendly | Open `index.html` with no build step |

## Quick start

```bash
# Option 1: open index.html in a browser

# Option 2: local server (avoids some file:// quirks)
python -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```text
pup-hymn-karaoke/
  index.html
  script.js          # LRC parse, sync, controls
  style.css
  assets/
    PUP-Hymn.lrc
    PUP-Hymn.mp3
    PUP-Logo.svg
    PUP-Pylon.jpg
```

## Design

- Maroon primary (`#800000`) aligned with PUP brand colors
- Montserrat for UI type
- Split layout: album/sidebar info + scrolling lyrics

## Other design eras

Earlier UI experiments live on long-lived branches (not merged into `main`):

| Branch | Look |
|--------|------|
| `overhaul/dark-spotify-shell` | Dark app shell with now-playing sidebar |
| `overhaul/centered-dark-player` | Centered dark player + marquee bar |

`main` is the light institutional player.

## License

MIT. See [LICENSE](LICENSE).

The PUP Hymn audio, university name, and logos belong to the Polytechnic University of the Philippines. Code is MIT; media and marks are not free for commercial reuse.

## Course note

Built for CMPE 364 (Web and Mobile Systems), Polytechnic University of the Philippines, under Engr. Arlene B. Canlas. Published here as a standalone project.
