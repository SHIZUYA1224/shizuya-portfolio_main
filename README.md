# Portfolio (VRM / Music / Video)

Static portfolio featuring a VRM avatar viewer, custom audio player, and privacy-friendly video embeds. All assets run under a single origin without npm or CDNs.

## Directory structure
- `index.html` landing page with highlights
- `vrm.html`, `music.html`, `video.html`, `about.html` domain pages
- `styles/` modular CSS (base/layout/components/themes)
- `src/` ES modules for navigation, VRM loading, audio player, and YouTube lazy embeds
- `data/` JSON manifests for tracks, videos, and VRM metadata
- `assets/` media, audio (m4a), and VRM placeholder folder
- `vendor/` pinned copies of `three.js`, `GLTFLoader`, `OrbitControls`, and `@pixiv/three-vrm`
- `aws/` deployment aids (response headers policy, CORS, MIME notes, step-by-step guide)

## Local development
Run a local HTTP server from the project root to mimic same-origin delivery:

```bash
python -m http.server 8000
```

Visit `http://localhost:8000/` and navigate to each page. Drop VRM models into `assets/vrm/` and update `data/models.json` with matching filenames. Audio and cover art already ship with sample assets.

## Adding new content
1. **VRM avatars**: copy `.vrm` files into `assets/vrm/`, add entries in `data/models.json` (include version label and description). Keep filenames ASCII and set S3 metadata to `application/octet-stream`.
2. **Music tracks**: encode to `.m4a`/`.mp3`, store under `assets/music/audio/`, create cover art (SVG or image), then append to `data/tracks.json`.
3. **Videos**: supply a local thumbnail under `assets/img/videos/` and append entries in `data/videos.json` with the raw YouTube video ID. Embeds swap to `youtube-nocookie.com` on interaction.

## AWS deployment (summary)
1. Sync the project to an S3 bucket with block-public-access enabled.
2. Apply MIME metadata per `aws/mime-mapping-notes.md` (VRM = `application/octet-stream`, GLB = `model/gltf-binary`, audio = `audio/mp4`).
3. Create and attach the CloudFront response headers policy via `aws/response-headers-policy.json` (adds `nosniff`, `Permissions-Policy`, HSTS, etc.).
4. Import `aws/s3-cors.json` after editing the domain to your CloudFront hostname; this keeps requests same-origin.
5. Invalidate CloudFront after each deploy and verify headers plus VRM loading over HTTPS.

For full instructions see `aws/deploy-readme.md`.
