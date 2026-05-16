# Airtable → Shopify Draft Creator

Version 0.5.1 photo upload compatibility fix.

Changes:
- keeps the tech workflow exactly the same
- techs still upload photos into Airtable `Tech Photos`
- Railway downloads Airtable attachments
- Railway uploads them to Shopify as base64 image attachments
- avoids Shopify rejecting Airtable CDN URLs without normal file extensions

Test first with:

```env
DRY_RUN=true
LOG_LEVEL=debug
```

Expected dry-run log:

```text
DRY_RUN would download Airtable image and upload to Shopify as attachment
```
