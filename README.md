# Airtable → Shopify Draft Creator

Version 0.6.0

Includes:
- separate draft trigger fields:
  - Ready for Guitar Draft
  - Ready for Gear Draft
- old Ready for Draft remains as fallback
- Final Listing Description support
- Category Mapping support
- Shopify shipping weight support
- Sync2Sell/Reverb tag generation
- Tech Photos base64 upload fix
- clears all draft trigger checkboxes after successful creation

Railway variables to add/update:

```env
AIRTABLE_READY_FOR_GUITAR_DRAFT_FIELD=Ready for Guitar Draft
AIRTABLE_READY_FOR_GEAR_DRAFT_FIELD=Ready for Gear Draft
AIRTABLE_DESCRIPTION_FIELD=Final Listing Description
```

Test first with:

```env
DRY_RUN=true
LOG_LEVEL=debug
```


## 0.6.1 Master Draft Push / No Uncheck

Focused patch:
- Shopify draft creator now only checks the field configured by `AIRTABLE_READY_FOR_DRAFT_FIELD`.
- Set `AIRTABLE_READY_FOR_DRAFT_FIELD=Ready for Draft Push` in Railway.
- The app no longer unchecks `Ready for Draft Push`.
- The app no longer unchecks `Ready for Guitar Draft` or `Ready for Gear Draft`.
- Duplicate prevention remains handled by `Draft Created`.


## 0.6.2 Idempotent Draft Creation

Duplicate-prevention patch:

- Adds an in-memory server job lock so two `/jobs/shopify/create-drafts` requests cannot run at the same time on the same Railway instance.
- Before creating a Shopify draft, searches Shopify for an existing variant with the same SKU.
- If an existing Shopify product/variant is found, links that product back to Airtable instead of creating a duplicate.
- After creating a new Shopify product, immediately writes Shopify Product ID, Variant ID, Draft URL, and Draft Created back to Airtable before uploading images or setting cost.
- If image upload or cost update fails later, the record is already marked as created, preventing another duplicate product on the next run.

Recommended test:

```env
DRY_RUN=true
LOG_LEVEL=debug
```

Then call:

```text
POST /jobs/shopify/create-drafts?secret=...
```

After confirming the output, set:

```env
DRY_RUN=false
```
