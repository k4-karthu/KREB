# Open Questions for Owner (§18.2)

Per §0.1 Rule 4 and §18.2, Kerb proceeds with the documented defaults below and tracks each item for owner sign-off before production launch:

| # | Question | Default Used |
|---|---|---|
| 1 | Brand name and logo | `Kerb`; wordmark set in Archivo, no logo mark yet (`src/config/brand.ts`) |
| 2 | Country, currency, tax rules, invoice format | `INR`, one configurable tax rate (placeholder `1800` bp = 18%), series `KB`, fiscal year April–March |
| 3 | Payment provider and deposit method | `fake` provider in dev; Razorpay adapter first; charge-and-refund deposit if no hold support |
| 4 | Number of branches and whether one-way rentals are offered | 3 branches; one-way disabled by default |
| 5 | Minimum driver age and licence years by category | 21 and 1 (25 for luxury) |
| 6 | Cancellation policy tiers | Table in §4.5 (>48h: 100%, 24–48h: 75%, 6–24h: 50%, <6h/no-show: 0%) |
| 7 | Hourly rentals? | Disabled |
| 8 | Chauffeur-driven rentals? | Out of scope |
| 9 | Languages at launch | English, architecture i18n-ready |
| 10 | Owner's own vehicle photography | Licensed demo / manifest images until supplied |
| 11 | Whether KYC must be verified before payment or may be approved at pick-up | Verified before payment (safer); toggle in settings |
| 12 | Data-protection law and retention periods | Licence images kept 12 months after last booking; invoices per tax law (confirm DPDP Act / GDPR details) |
| 13 | Hosting region and provider | Single VPS near customers; S3-compatible backup bucket |
