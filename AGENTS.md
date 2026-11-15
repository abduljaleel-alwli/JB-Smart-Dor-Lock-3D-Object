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

## Project rules
- Lock geometry lives in `src/components/lock/`; dimensions are named constants measured from the user's product photos, so adjust constants rather than ad-hoc offsets.
- The exterior unit's side profile (face depth/thickness, tilts, base taper, curved post outlines) lives in `exteriorProfile.ts` as door-relative depths, kept React/three-free so `exteriorProfile.test.ts` can check it; verify changes with an orthographic side render against the side photo.
- Bent exterior face layers (body, rim, glass) are built by hand from the shared pre-split `outlineContour` and bent by `bendPanel`/`bendPoint` round smooth arcs; features on the face are placed with `bendPoint` too. Never use TessellateModifier: its T-junctions crack open on the curves and it drops geometry groups.
- Post side profiles are straight segments (no curves, as in the photo) and must have no acute corners, even hidden ones: the inward edge rounding turns acute corners into visible slivers.
- The interior unit's dimensions (body depths, cove, paddle lean, neck, thumbturn) live in `interiorProfile.ts`, React/three-free and checked by `interiorProfile.test.ts`; compare changes with a side render next to the side photo at matched height.
- Door section, edge faceplate layout and round stand dimensions live in `doorProfile.ts` (React/three-free, checked by `doorProfile.test.ts`); faceplate features are fractions of its length from the top, so they stay traced to the edge photo; the latch height follows the interior handle neck.
