# DFCS Desktop Access Portal

DFCS Desktop is a gated release portal for distributing approved Windows, macOS, and Linux builds. Users request access with their name and email, an administrator approves or rejects the request, and approved users can sign in to the private download portal.

## Stack

- TanStack Start and TanStack Router
- React, TypeScript, Vite, and Tailwind CSS
- Supabase for access requests and download analytics
- Brevo SMTP API for transactional notifications
- Cloudflare Nitro deployment

## Local development

```sh
npm install
npm run dev
```

Required server environment variables are documented by their names in `.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`
- `ADMIN_PORTAL_KEY`
- `ADMIN_NOTIFY_EMAIL`
- `PUBLIC_SITE_URL`
- `VITE_DOWNLOAD_WORKER_URL`

Never commit `.env`, service-role keys, SMTP keys, or admin keys. The service-role key must remain server-only. Rotate any key that has been shared publicly.

## Release process

1. Set `VITE_DOWNLOAD_WORKER_URL` to the public URL of the separate Cloudflare Worker.
2. Configure the Worker environment variables in Cloudflare. Do not put a GitHub token in this app or any `VITE_` variable:

	 ```sh
	 npx wrangler secret put GITHUB_TOKEN --config wrangler.worker.json
	 npx wrangler deploy --config wrangler.worker.json \
		 --var GITHUB_OWNER:your-github-account \
		 --var GITHUB_REPOSITORY:your-repository
	 ```

3. The Worker fetches `/releases/latest` from the configured repository and exposes `/manifest`. The dashboard loads that manifest at runtime, so changing `GITHUB_OWNER` or `GITHUB_REPOSITORY` automatically changes the displayed release.
4. The manifest excludes signatures, `latest.json`, source code, `.zip`, `.tar`, and `.tar.gz` assets. Download requests are validated against the assets in the latest release.
5. Run `npm run build` and verify the request approval email, approval email, login flow, and download targets.
6. Confirm `PUBLIC_SITE_URL` serves `/icons/icon.png`, `/privacy`, and `/terms`; transactional email clients load the hosted icon from that URL.
7. Deploy with production environment variables and verify that secrets do not appear in client bundles or logs.

The download buttons redirect to `${VITE_DOWNLOAD_WORKER_URL}/download?asset=...` after recording the approved user's download. The Worker owns the GitHub repository variables, GitHub token, release lookup, asset filtering, manifest, and download validation. The frontend does not contain release filenames or repository credentials.

## Privacy and terms

The request form links to the [Privacy Policy](/privacy) and [Terms of Use](/terms), and requires users to accept both before submitting personal information. Review these documents with qualified legal counsel and replace the contact identity, retention period, and jurisdiction details with the operator's actual legal requirements before launch.

## License

The repository is licensed under the [MIT License](LICENSE). The DFCS Desktop name, logo, release binaries, and other trademarks or proprietary assets are not granted by that code license unless separately stated.
