# MIME Mapping Notes

Set explicit content types on S3 objects before (or during) upload to prevent incorrect defaults and to keep VRM loading working behind CloudFront.

| Extension | Content-Type | Notes |
|-----------|--------------|-------|
| `.html`   | `text/html; charset=utf-8` | ensure charset for correct rendering |
| `.css`    | `text/css; charset=utf-8` | |
| `.js`     | `text/javascript; charset=utf-8` | required because CSP is script-src 'self' |
| `.json`   | `application/json; charset=utf-8` | |
| `.vrm`    | `application/octet-stream` | prevents sniffing issues in three.js loaders |
| `.glb`    | `model/gltf-binary` | required for GLB assets used by VRM |
| `.m4a`    | `audio/mp4` | matches generated audio assets |
| `.svg`    | `image/svg+xml` | |
| `.png`    | `image/png` | |

## Applying metadata with AWS CLI

```bash
aws s3 cp assets/vrm/atelier-scout.vrm s3://YOUR_BUCKET/assets/vrm/atelier-scout.vrm \
  --content-type application/octet-stream --metadata-directive REPLACE

aws s3 cp assets/music/audio/midnight-lines.m4a s3://YOUR_BUCKET/assets/music/audio/midnight-lines.m4a \
  --content-type audio/mp4 --metadata-directive REPLACE
```

Repeat for each asset. Replace `YOUR_BUCKET` with the actual bucket name. For bulk uploads use `--recursive` with `--exclude`/`--include` filters and `--content-type` as needed.
