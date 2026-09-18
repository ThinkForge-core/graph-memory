# Graph Memory settings card (DSH Web)

Browser half of the Community plugin: the **Graph Memory** card in
**Settings → Plugins → Configurable**.

It edits the `graph-memory` settings namespace, which the Community plugin
(`graph-memory/dsh`) registers. Values are stored in the profile's settings
document and take effect on the next `dsh web` start — the card says so, and
the namespace declares `applies: "restart"`. `cordis.patch.yml` stays the
base layer, so an existing deployment keeps its current configuration until a
field is overridden in the card.

The card is bilingual: its dictionaries (`en`, `zh`) follow the DSH language
setting, with English as the fallback.

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
