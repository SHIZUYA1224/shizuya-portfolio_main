# AWS Deployment Guide

This project is designed for single-origin delivery via Amazon S3 + CloudFront. Follow the sequence below to keep VRM loading functional while enforcing the required security headers.

## 1. Provision infrastructure
1. Create an S3 bucket (e.g. `portfolio-shizuya-prod`) with **Block Public Access** enabled.
2. Create a CloudFront origin access control (OAC) and associate it with the bucket so CloudFront is the only public entry point.

## 2. Upload the static bundle
1. Build the directory structure locally (already done in this repo).
2. Use `aws s3 sync . s3://portfolio-shizuya-prod --delete --exclude "aws/*"` from the project root.
3. Immediately update MIME metadata for binary assets per `aws/mime-mapping-notes.md` (VRM: `application/octet-stream`, GLB: `model/gltf-binary`, audio: `audio/mp4`). Correct metadata is critical—without it, browsers may block VRM fetches.

## 3. Configure CloudFront
1. Create a **Response Headers Policy** using `aws/response-headers-policy.json`:
   ```bash
   aws cloudfront create-response-headers-policy \
     --response-headers-policy-config file://aws/response-headers-policy.json
   ```
2. Attach the policy to the default behavior of your distribution.
3. Enable HTTP/2 and HTTP/3 for low-latency asset delivery.
4. Invalidate `/*` after every deployment: `aws cloudfront create-invalidation --distribution-id YOUR_ID --paths '/*'`.

## 4. Apply minimal CORS
Import `aws/s3-cors.json` to the bucket (update the origin hostname beforehand):
```bash
aws s3api put-bucket-cors \
  --bucket portfolio-shizuya-prod \
  --cors-configuration file://aws/s3-cors.json
```
Only the CloudFront origin should appear in `AllowedOrigins`; no wildcard `*` is used, reinforcing same-origin delivery.

## 5. DNS and TLS
1. Issue an ACM certificate in `us-east-1` for your custom domain.
2. Attach the certificate and alias (`portfolio.example.com`) to the CloudFront distribution.

## 6. Post-deploy checks
- Confirm headers (`Permissions-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`).
- Load `vrm.html` over HTTPS. Ensure network tab shows `application/octet-stream` for `.vrm` objects.
- Run `python -m http.server` locally before deploy to verify same-origin references and CSP compliance.

Keep VRM assets and JSON data in sync: update `data/models.json` whenever adding/removing avatars, and invalidate CloudFront so clients receive the latest manifest.
