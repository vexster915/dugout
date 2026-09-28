# Anthropic TypeScript SDK (bundled for the optional Claude features: the Coach and the Pantry)

`anthropic.mjs` is the official `@anthropic-ai/sdk` package, version 0.128.0 (MIT License — see `LICENSE`), bundled into
one browser module with esbuild (`export { default, Anthropic } from '@anthropic-ai/sdk'`, `--format=esm --platform=browser --minify`).

It's only loaded if you add your own Anthropic API key in Settings → Claude AI and then ask the **Coach** something, or,
in Diet → Pantry, pick **Claude** to read your photos or tap **Ask Claude for meal ideas**. Then — and only then — your
question with a summary of your Dugout data (Coach), your kitchen photos, or your food list and daily goals are sent to
Anthropic's API (`https://api.anthropic.com`) with your key. Nothing is sent otherwise.
