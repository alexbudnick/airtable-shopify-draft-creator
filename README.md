# Airtable → Shopify Draft Creator

Version 0.4.0 adds Category Mapping lookup.

The app:
- reads Inventory `Product Type`
- looks up active matching row in `Category Mapping`
- uses mapped `Shopify Product Type`
- adds mapped Shopify tags
- adds Reverb category/subcategory tags
- falls back to Inventory Product Type if no mapping is found

Test first with:

```env
DRY_RUN=true
LOG_LEVEL=debug
```
