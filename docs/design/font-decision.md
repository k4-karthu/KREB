# Font Bake-Off & Decision (v3 R0)

## Evaluation Criteria

1. **Indian Rupee sign (`U+20B9`, `₹`)** availability and weight matching.
2. **Tabular numerals (`tnum`)** support for prices, odometers, timestamps, and ledger columns.
3. **12–14px table legibility** for `/admin` fleet, booking, and finance desks.
4. **76px display quality** for the `/` hero headline and section titles.
5. **Self-hosting licence & bundle size** (must be self-hostable via npm/Fontsource without external CDN or commercial redistribution restrictions).

---

## Candidate Comparison

| Criterion | Set A: **Bricolage Grotesque + Albert Sans** *(Default)* | Set B: **Satoshi + Hanken Grotesk** | Set C: **Schibsted Grotesk + Public Sans** |
|---|---|---|---|
| **Self-hosting & Licence** | `@fontsource-variable/bricolage-grotesque` (`5.3.0`, **OFL-1.1**, 544 KB unpacked) + `@fontsource-variable/albert-sans` (`5.3.0`, **OFL-1.1**, 134 KB unpacked). Fully self-hostable via npm. | **Blocked on Satoshi**: ITF Free Font License prohibits self-hosting/redistributing font files without written consent from Indian Type Foundry; no `@fontsource` npm package (`E404`). Hanken Grotesk is `OFL-1.1` (156 KB unpacked). | `@fontsource-variable/schibsted-grotesk` (`5.3.0`, **OFL-1.1**, 160 KB unpacked) + `@fontsource-variable/public-sans` (`5.3.0`, **OFL-1.1**, 130 KB unpacked). Fully self-hostable via npm. |
| **Indian Rupee (`U+20B9`)** | **Albert Sans** (v1.300+) includes `U+20B9` (`₹`) across weights; **Bricolage Grotesque** is OFL-1.1 variable (`ateliertriay/bricolage`)—if any display axis lacks `₹`, CSS `font-family` stack falls back cleanly to Albert Sans. | Satoshi's Latin subset targets Western codepoints (requires manual glyph inspection on Fontshare); Hanken Grotesk supports `₹`. | Both Schibsted Grotesk and Public Sans (USWDS) support `U+20B9` (`₹`). |
| **Tabular Numerals (`tnum`)** | **Albert Sans** supports `tnum` (v1.300+) for aligned tables/prices; **Bricolage Grotesque** supports OpenType `tabular-nums`. | Both support `tnum` / tabular lining figures. | **Public Sans** was specifically engineered by USWDS for data tables with crisp `tnum` alignment; Schibsted Grotesk supports `tnum`. |
| **12–14px Table Legibility** | **Strong**: Albert Sans has open counters, even stroke contrast, and clean proportions at 12–14px. | **Good**: Hanken Grotesk is clean at small sizes (already used in v2), though Satoshi cannot be self-hosted. | **Excellent**: Public Sans is purpose-built for dense government/operational tables. |
| **76px Display Quality** | **Best in class**: Bricolage Grotesque includes an optical size (`opsz`) axis alongside `wght` and `wdth`, giving 76px headlines distinctive editorial character without looking like generic SaaS Inter/Geist. | **Good**: Satoshi has strong geometric display presence, but licensing disqualifies it. | **Neutral/Corporate**: Schibsted Grotesk is clean and legible at 76px, but visually flatter and less distinctive than Bricolage Grotesque. |

---

## Decision: **Select Set A (`Bricolage Grotesque` + `Albert Sans`)**

- **Display (`--font-display`)**: `@fontsource-variable/bricolage-grotesque` (SIL OFL-1.1)
- **UI / Body / Tables (`--font-sans`)**: `@fontsource-variable/albert-sans` (SIL OFL-1.1)
- **Why Set A wins**:
  1. **Zero licensing or CDN risk**: Both packages are SIL OFL-1.1 on npm (`@fontsource-variable/*` v5.3.0), self-hosted locally in Next.js with no external Fontshare/Google CDN calls.
  2. **76px display authority**: Bricolage Grotesque's `opsz` + `wght` + `wdth` axes solve v2's flat hero typography while keeping 12–14px admin tables crisp in Albert Sans.
  3. **Rupee & tabular safety**: Albert Sans handles all dense prices, ledgers, and `₹` totals with `font-variant-numeric: tabular-nums`.
- **Runner-up**: Set C (`Schibsted Grotesk + Public Sans`, ~290 KB total unpacked) remains a clean OFL-1.1 fallback if ultra-compact bundle size is ever prioritized over display character.
