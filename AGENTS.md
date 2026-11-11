<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## LinkVault architecture
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate, wraps `AppShell`); `/auth` is the only public page — the session lives in browser storage.
- Vault data is read/written from the browser client with row-level security (`src/lib/vault.ts`); only page-metadata fetching runs server-side (`src/lib/metadata.functions.ts`) so it can bypass CORS behind SSRF checks (`src/lib/ssrf.ts`).
- Duplicate links are detected by `normalizeUrl` (`src/lib/url.ts`) plus a partial unique index on `items(user_id, normalized_url)`; intentional copies set `duplicate_of`.
- Strict TS flags (exactOptionalPropertyTypes, noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature, noImplicitReturns) are off to keep UI code readable.
- Signed-out visitors land on the public `/welcome` marketing page (redirect from `_authenticated`); `/auth` stays the sign-in page. Why: a landing page sells the app before sign-in.
- Item lists default to the user's custom order (`items.sort_order`, ascending, fractional positions via `src/lib/order.ts`); a drag saves only the moved item's new position. Why: one-row writes keep reordering cheap on large vaults.
- Profile details live on their own `/profile` page (also a mobile bottom tab); Settings keeps appearance, export and data. Reading queue and inbox were removed; their columns are kept but deprecated.
