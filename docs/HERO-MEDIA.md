# Hero media — encode + caching rules

Hero videos are admin-uploaded to the `heroes` bucket (`/admin/heroes`). Two of
these rules are **non-negotiable** for every hero asset; regressing them makes
the hero slower for every visitor:

1. **`-movflags +faststart`** — puts the `moov` atom before `mdat` so the
   browser can start rendering before the whole file downloads. Without it a
   40 MB hero shows nothing until byte 40,000,000.
2. **`loudnorm` to −18 LUFS** — heroes with a music bed (D-050) must be
   loudness-normalised so the admin volume slider means the same thing on every
   asset. Target: `I=-18:TP=-1.5:LRA=7`.

Also required:

- **Bitrate sanity.** 480p needs ~0.6–0.9 Mbps at CRF 24, not 3 Mbps. Use CRF,
  not fixed bitrate.
- **Cache.** The upload path (`lib/admin/upload.tsx`, `lib/admin/video-poster.ts`)
  passes `cacheControl: "31536000"` (1 year) — filenames are timestamped and
  immutable, so long cache is safe. Don't remove it.
- **Mobile variant.** Upload a 640-wide encode via the row's **MOBILE MEDIA**
  button; it is served to phones via `<source media="(max-width: 767px)">`
  (`content_heroes.media_url_mobile`).
- **Poster.** The admin captures the FIRST frame automatically on upload
  (webp). If generating one by hand, use frame 0 — not a mid-clip frame — so
  the poster→video crossfade is invisible.

## Encode recipe

```bash
# desktop
ffmpeg -i in.mp4 -c:v libx264 -profile:v high -crf 24 -preset slow \
  -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 128k -ac 2 -af "loudnorm=I=-18:TP=-1.5:LRA=7" out-desktop.mp4

# mobile
ffmpeg -i in.mp4 -vf "scale=640:-2" -c:v libx264 -profile:v main -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 96k -ac 2 -af "loudnorm=I=-18:TP=-1.5:LRA=7" out-mobile.mp4

# poster (first frame, matches the site's poster system)
ffmpeg -i in.mp4 -frames:v 1 -q:v 3 out-poster.jpg
```

Verify before uploading:

```bash
# moov must come BEFORE mdat:
python -c "d=open('out-desktop.mp4','rb').read(); print(d.find(b'moov') < d.find(b'mdat'))"
# after upload — cache-control must be a year, not no-cache/3600:
curl -sI <public-url> | grep -i cache-control
```

## Audio (D-050..D-055)

- `content_heroes.has_audio` — the asset carries a sound track (admin toggle;
  best-effort pre-filled on upload).
- `content_heroes.audio_autoplay` — play the music bed. Only ONE hero per page
  can have it (DB partial unique index) and only the page's **default** hero
  ever plays sound; hover-swapped heroes are always muted.
- `content_heroes.audio_volume` — 0–100, default 70. Never ship 100.
- Markup always starts muted; unmute happens client-side after the age-gate /
  consent gesture (`ps:user-gesture`), with a "TAP FOR SOUND" pill fallback
  when the browser refuses. See `components/site/hero-audio.tsx`.

## Source masters

The current TerpKings master is **854×480** — re-encoding cannot add detail, so
it will always look soft full-bleed on large monitors. For sharpness, get a
1080p/4K master from the clip's producer and run it through the recipe above.
