# Airtable → Shopify Draft Creator

Creates Shopify draft products from Airtable Inventory records.

## Trigger logic

A record is processed only when:

- `Ready for Draft` is checked
- `Draft Created` is not checked
- `Listing Destination` equals `Shopify Main`

## What it creates

- Shopify draft product
- product title from `Generated Listing Title`
- description from `Listing Description Draft`
- SKU, price, qty, product type, vendor, tags
- tech photos as draft product images
- inventory item cost when available

## After creating draft

Writes back to Airtable:

- Shopify Product ID
- Shopify Variant ID
- Shopify Draft URL
- Draft Created = checked
- Draft Sync Source = Shopify Draft Automation
- clears Automation Error

## Railway worker setup

Recommended Start Command:

```bash
npm run sync-drafts
```

Recommended first test:

```env
DRY_RUN=true
```

Then set:

```env
DRY_RUN=false
```

once logs look good.

## Manual endpoint

If running as web service:

```http
POST /jobs/shopify/create-drafts?secret=YOUR_SECRET
```

For cron worker setup, use `npm run sync-drafts`.
