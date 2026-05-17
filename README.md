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
