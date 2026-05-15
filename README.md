# Airtable → Shopify Draft Creator

Creates Shopify draft products from Airtable Inventory records.

## Trigger logic

A record is processed only when:

- `Ready for Draft` is checked
- `Draft Created` is not checked
- `Listing Destination` equals `Shopify Main`

## Shopify auth

This version uses Shopify Dev Dashboard client credentials.

Required variables:

```env
SHOPIFY_SHOP=aflashfloodofgear
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
SHOPIFY_API_VERSION=2026-01
```

`SHOPIFY_SHOP` should be only the myshopify subdomain, not the full URL.

## Railway worker setup

Recommended Start Command:

```bash
npm run sync-drafts
```

Recommended first test:

```env
DRY_RUN=true
LOG_LEVEL=debug
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
