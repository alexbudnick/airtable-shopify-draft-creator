import {
  CFG, logger, fetchReadyAirtableRecords, updateAirtableRecord,
  createShopifyDraftProduct, updateInventoryItemCost, uploadShopifyProductImages,
  shopifyAdminProductUrl, numberField, stringField,
} from "./lib.js";

async function processRecord(record) {
  const f = CFG.airtable.fields;
  const sku = stringField(record, f.sku);
  const title = stringField(record, f.title);

  if (!sku) throw new Error("Missing SKU");
  if (!title) throw new Error("Missing Generated Listing Title");
  if (!stringField(record, f.description)) throw new Error("Missing Listing Description Draft");

  logger("info", "Creating Shopify draft", { sku, title });

  const created = await createShopifyDraftProduct(record);
  const product = created?.product;
  if (!product?.id) throw new Error(`Shopify response missing product id: ${JSON.stringify(created)}`);

  await uploadShopifyProductImages(product.id, record);

  const variant = product?.variants?.[0] || {};
  const cost = numberField(record, f.cost);
  if (variant.inventory_item_id && cost !== null) await updateInventoryItemCost(variant.inventory_item_id, cost);

  const draftUrl = shopifyAdminProductUrl(product.id);

  await updateAirtableRecord(record.id, {
    [f.shopifyProductId]: String(product.id),
    [f.shopifyVariantId]: variant?.id ? String(variant.id) : "",
    [f.shopifyDraftUrl]: draftUrl,
    [f.draftCreated]: true,
    [f.draftSyncSource]: "Shopify Draft Automation",
    [f.automationError]: "",
  });

  logger("info", "Created Shopify draft, uploaded images, and updated Airtable", { sku, productId: product.id, draftUrl });
  return { sku, productId: product.id, draftUrl };
}

async function main() {
  const records = await fetchReadyAirtableRecords();
  logger("info", "Found ready Airtable records", { count: records.length });

  const results = [];
  let failed = 0;

  for (const record of records) {
    try {
      results.push(await processRecord(record));
    } catch (err) {
      failed += 1;
      logger("error", "Failed to create draft for Airtable record", { recordId: record.id, error: err.message });
      try {
        await updateAirtableRecord(record.id, {
          [CFG.airtable.fields.automationError]: err.message,
          [CFG.airtable.fields.draftSyncSource]: "Shopify Draft Automation",
        });
      } catch (airtableErr) {
        logger("error", "Failed to write Airtable error", { recordId: record.id, error: airtableErr.message });
      }
    }
  }

  console.log(JSON.stringify({ ok: failed === 0, scannedReadyRecords: records.length, created: results.length, failed, results }, null, 2));
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  logger("error", "sync-drafts failed", err.message);
  process.exit(1);
});
