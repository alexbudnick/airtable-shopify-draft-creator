# Airtable → Shopify Draft Creator

## Version 0.3.0

Adds:
- Shopify variant weight from `Shopify Shipping Weight`
- `weight_unit = lb`
- Sync2Sell/Reverb tags:
  - `reverbsync-shipping-profile:{Shipping Profile}`
  - `reverbsync-make:{Make}`
  - `reverbsync-model:{Model}`
  - `reverbsync-condition:{Condition Ranking}`
  - `reverbsync-year:{Year}`
  - `reverbsync-finish:{Color}`

Recommended Railway Start Command:

```bash
npm run sync-drafts
```

Test first with:

```env
DRY_RUN=true
LOG_LEVEL=debug
```
