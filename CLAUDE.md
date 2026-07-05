# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static marketing site for Ecoley (Economistas y Consultores de Leyes, El Salvador). No npm, no build step, no test suite, no CI. Everything lives in three places:

- `index.html` — the entire site (markup, content, and logic). **This is the only file to edit for content/behavior changes.**
- `support.js` — GENERATED runtime engine for the `.dc.html` template format (`<x-dc>`, `<sc-if>`, `{{ expr }}` bindings). **Never edit directly.** Its header says to rebuild from `dc-runtime/src/*.ts` with `bun run build`, but that `dc-runtime/` source directory does not exist in this checkout — treat the file as fixed/vendored.
- `functions/api/enviar-solicitud.js` — a Cloudflare Pages Function (not a Node.js server) that emails form submissions via the Resend API.

## Editing `index.html`

- Contact info (email, phone, WhatsApp, Facebook) and content lists (`juridicosItems`, `carteraItems`, `prestamosProductos`) live in the `CONFIG` object and related arrays inside the `<script type="text/x-dc" data-dc-script>` block near the end of the file.
- Sections are marked with `<!-- ===== SECTION ===== -->` comments and toggled via `<sc-if value="{{ isX }}">`.
- Template bindings use `{{ expr }}` mustache syntax in text/attributes/event handlers (e.g. `onClick="{{ navInicio }}"`) — this is a proprietary format compiled by `support.js`, not JSX/Vue/Handlebars.
- The form's client-side file-size cap (`onFile`, currently 10 MB) must stay in sync with `MAX_FILE_BYTES` in `functions/api/enviar-solicitud.js`.

## Running locally

No build needed. Open `index.html` directly, or serve the folder (`python3 -m http.server 8080`, VS Code Live Server, `npx serve`). React/Babel load from a CDN at runtime, so the first load needs internet access.

**Cloudflare Pages Functions cannot be exercised with a plain static server** (Live Server, `python3 -m http.server`, etc.) — `functions/api/enviar-solicitud.js` only runs once deployed to Cloudflare, or locally via `npx wrangler pages dev . --binding RESEND_API_KEY=...`.

## Backend (form submissions)

- Deploy target is Cloudflare Pages specifically; the `functions/` directory is auto-detected, no build config needed. Netlify/Vercel would require rewriting the function in their own serverless format.
- Required env vars are set in the Cloudflare Pages dashboard (Settings → Environment variables), never in code: `RESEND_API_KEY` (secret), `TO_EMAIL` (optional), `FROM_EMAIL` (optional).
- The local `.env` file uses the key name `Resend_key` — this does **not** match the `RESEND_API_KEY` name Cloudflare/the function expect. Don't assume the `.env` var name is what needs to be configured in Cloudflare.
- Until a domain is verified in Resend, `FROM_EMAIL` falls back to `onboarding@resend.dev`, which can only deliver to the Resend account owner's own email — not arbitrary recipients.
- Rate limiting for the public `/api/enviar-solicitud` endpoint must be configured outside this repo, via Cloudflare's dashboard (Security → WAF → Rate limiting rules) — it cannot be set from the function code alone.

## Assets

Three distinct directories — don't mix them up:
- `assets/` — curated images actually referenced by `index.html`. Edit here to change site images (keep filenames identical, or update the `<img src="assets/...">` path).
- `uploads/` — gitignored raw dumps/mockups, not used by the live site.
- `ejemplo_pagina/` — a design reference file (`Direcciones.html`), not the live site.
