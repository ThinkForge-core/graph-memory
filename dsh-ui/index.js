/**
 * Host loader entry for the Graph Memory settings card.
 *
 * The card is a browser half only: the `graph-memory` settings namespace it
 * edits is registered by the Community plugin (`graph-memory/dsh`), and this
 * package exists so the client module system finds a Loader row whose
 * specifier is a bare package name — the only shape it scans for a
 * `dsh.client` declaration.
 *
 * No host behaviour, and deliberately no import of `graph-memory`: this
 * package must resolve from its own installation.
 */

/** Host plugin body — the settings namespace belongs to `graph-memory/dsh`. */
export function apply() {}
