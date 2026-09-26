# Graph Memory settings card (DSH Web)

Browser half of the Community plugin: the **Graph Memory** configuration
section on the `graph-memory` bundle's own page. Open the sidebar **Plugins**,
click the `graph-memory` card in the **Installed** list, and the page holds the
whole form.

It edits the `graph-memory` settings namespace, which the Community plugin
(`graph-memory/dsh`) exposes through its exported `Config` schema. Values are
stored in the profile's settings document and take effect on the next
`dsh web` start — the card says so, because the plugin reads every field once
while it wires itself. `cordis.patch.yml` stays the base layer, so an existing
deployment keeps its current configuration until a field is overridden in the
card.

The card is bilingual: its dictionaries (`en`, `zh`) follow the DSH language
setting, with English as the fallback.

## Linked settings

Some fields only make sense together, so the card is laid out as a table of
setting boxes rather than a flat list: each **chain is one row**, its members
sit side by side, and the boxes are joined by drawn chain segments (overlapping
inline-SVG links — no image assets, no build step). A chain row is placed in the
earliest group any of its members belongs to, so a chain linking an essential
field to an advanced one is never hidden behind the advanced toggle.

Editing a member applies the whole chain in **one atomic write** — the touched
field plus every dependent value. The field the chain adjusted gets an
`adjusted` badge, the chain segment that just pulled a value is lit in blue, and
the reason ("8 recent turns → 3 memories per recall, so the total stays
bounded") is stated once, in the caption under the row. The card never leaves a
half-applied pair behind.

**A chain segment is also the switch that breaks the link.** Clicking one leaves
the stored values exactly as they are and simply stops its rules from running:
the segment turns dashed and grey, the caption says the settings now change on
their own, and editing a member no longer touches the others. Clicking it again
links them back. The state is per chain and lives in the browser
(`localStorage`, key `graph-memory-ui:broken-chains`), not in the profile's
settings document: breaking a link costs no restart, and a browser that refuses
storage just starts with every chain linked.

A box carries only what the drawing cannot say: the chain segments already show
which fields are linked, so there is no per-field "linked" pill, and the Reset
button — drawn only for a field overridden in the profile — is itself the
override marker, so there is no separate "overridden" pill either. The header
wraps: inside a four-across row a box is about 190px wide, and a chip that no
longer fits drops to the next line inside the box instead of spilling past its
border.

| You change | The card adjusts | Why |
|---|---|---|
| Allow history takeover | learning and recall on, and "restore this conversation's hidden history" on | hiding history is only safe while something can put it back — the path back is this session's own recall, not a per-turn re-read of other conversations |
| Learning, recall or hidden-history restore off | takeover off | the Host refuses the takeover without a recall path that can return a hidden turn |
| Recent turns kept (N) | max memories per recall | `clamp(round(20 / N), 1, 6)`: a wider window carries a smaller single injection, so the total stays bounded. The window counts the snapshots that stay live, so the budget is the same for every cross-session reach |
| Raw message retention ≠ `all` | dry run on | preview before the first real deletion |

**Restore optimal settings** applies the validated combination in one write:
`extractionEnabled`, `recallEnabled`, `contextCompactionEnabled`,
`projectCompletedTurnTools`, `recallCrossSession: "first-turn"`,
`recallSessionHistory: true`, `freshTurnCount: 5`,
`recallMaxNodes: 4`, `assistantTools: all`. The same budget formula lives in the
Host (`optimalRecallMaxNodes`), so the card and the plugin agree on one policy.
Fields outside that combination — retention, embeddings, the extraction route —
are left exactly as they are; the caption under the button says what the button
covers.

The Reset button is honest about the Host's `unset` contract: clearing a field
whose inherited layer declares a value re-writes that inherited value into the
profile entry (`SettingsForms.mutate`), so the effective value is unchanged and
the field stays marked as stored in the profile. Reset therefore means "stop
using my value", not "make the marker disappear".

The Host also re-applies that combination itself after an upgrade: a stamped
revision (`appliedOptimalRevision`, hidden from this form) makes a new plugin
release apply the preset once, while an edit you make in between survives every
ordinary start.

## Extension point

Since the 0.1.7 line the configuration pages live on the sidebar **Plugins**
page, not in Settings (Settings → Plugins is a read-only inventory there). That
page offers three places for another plugin's configuration: `plugins.item` for
the **Official** group, `plugins.bundle.config` for a bundle's own
configuration on its page, and `plugins.row.config` for one row of a bundle.
`plugins.item` is reserved for the official settings pages, so this card — a
Community bundle's configuration — registers into `plugins.bundle.config`,
keyed by the bundle's package name `graph-memory`; the page renders it on that
bundle's page, which its card in the **Installed** list opens. The card is
withdrawn while the Host stops serving the namespace. Values and writes come
from `ctx.configForms` (was `ctx.settingsScope` before 0.1.7).

## Install

Install and activate the Community plugin first, then this bundle:

```bash
dsh plugin --profile web add /absolute/path/to/graph-memory/dsh-ui
dsh web
```

Restart `dsh web` after installation: client bundles are loaded at start.

## What it does not do

- No host behaviour and no import of `graph-memory` — this package resolves on
  its own.
- It does not move configuration out of `cordis.patch.yml`; it adds a layer on
  top of it.
- The embedding API key is **not** stored here: `Credential reference` names a
  credential, and the key itself lives on the Credentials page.
