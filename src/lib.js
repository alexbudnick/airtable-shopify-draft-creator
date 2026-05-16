import dotenv from "dotenv";
import { URLSearchParams } from "node:url";
import { log } from "./common.js";

dotenv.config();

function normalizeShop(shop) {
  return String(shop || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(".myshopify.com", "");
}
function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

export const CFG = {
  logLevel: process.env.LOG_LEVEL || "info",
  dryRun: String(process.env.DRY_RUN || "false").toLowerCase() === "true",
  triggerSecret: process.env.SYNC_TRIGGER_SECRET || "",
  destinationValue: process.env.SHOPIFY_LISTING_DESTINATION_VALUE || "Shopify Main",
  airtable: {
    pat: process.env.AIRTABLE_PAT || "",
    baseId: process.env.AIRTABLE_BASE_ID || "",
    tableName: process.env.AIRTABLE_TABLE_NAME || "Inventory",
    categoryMappingTableName: process.env.AIRTABLE_CATEGORY_MAPPING_TABLE_NAME || "Category Mapping",
    fields: {
      readyForDraft: process.env.AIRTABLE_READY_FOR_DRAFT_FIELD || "Ready for Draft",
      draftCreated: process.env.AIRTABLE_DRAFT_CREATED_FIELD || "Draft Created",
      listingDestination: process.env.AIRTABLE_LISTING_DESTINATION_FIELD || "Listing Destination",
      title: process.env.AIRTABLE_TITLE_FIELD || "Generated Listing Title",
      description: process.env.AIRTABLE_DESCRIPTION_FIELD || "Listing Description Draft",
      sku: process.env.AIRTABLE_SKU_FIELD || "SKU",
      name: process.env.AIRTABLE_NAME_FIELD || "Name",
      price: process.env.AIRTABLE_PRICE_FIELD || "Price",
      cost: process.env.AIRTABLE_COST_FIELD || "Cost",
      qty: process.env.AIRTABLE_QTY_FIELD || "Qty On Hand",
      productCategory: process.env.AIRTABLE_PRODUCT_CATEGORY_FIELD || "Product Type",
      conditionRanking: process.env.AIRTABLE_CONDITION_RANKING_FIELD || "Condition Ranking",
      shippingProfile: process.env.AIRTABLE_SHIPPING_PROFILE_FIELD || "Shipping Profile",
      shopifyShippingWeight: process.env.AIRTABLE_SHOPIFY_SHIPPING_WEIGHT_FIELD || "Shopify Shipping Weight",
      techPhotos: process.env.AIRTABLE_TECH_PHOTOS_FIELD || "Tech Photos",
      make: process.env.AIRTABLE_MAKE_FIELD || "Make",
      model: process.env.AIRTABLE_MODEL_FIELD || "Model",
      year: process.env.AIRTABLE_YEAR_FIELD || "Year",
      finish: process.env.AIRTABLE_FINISH_FIELD || "Color",
      shopifyProductId: process.env.AIRTABLE_SHOPIFY_PRODUCT_ID_FIELD || "Shopify Product ID",
      shopifyVariantId: process.env.AIRTABLE_SHOPIFY_VARIANT_ID_FIELD || "Shopify Variant ID",
      shopifyDraftUrl: process.env.AIRTABLE_SHOPIFY_DRAFT_URL_FIELD || "Shopify Draft URL",
      automationError: process.env.AIRTABLE_AUTOMATION_ERROR_FIELD || "Automation Error",
      draftSyncSource: process.env.AIRTABLE_DRAFT_SYNC_SOURCE_FIELD || "Draft Sync Source",
    },
    categoryMapFields: {
      airtableCategory: process.env.CATEGORY_MAP_AIRTABLE_CATEGORY_FIELD || "Airtable Product Category",
      shopifyProductType: process.env.CATEGORY_MAP_SHOPIFY_PRODUCT_TYPE_FIELD || "Shopify Product Type",
      shopifyTags: process.env.CATEGORY_MAP_SHOPIFY_TAGS_FIELD || "Shopify Tags",
      reverbCategory: process.env.CATEGORY_MAP_REVERB_CATEGORY_FIELD || "Reverb Category",
      reverbSubcategory1: process.env.CATEGORY_MAP_REVERB_SUBCATEGORY_1_FIELD || "Reverb Subcategory 1",
      reverbSubcategory2: process.env.CATEGORY_MAP_REVERB_SUBCATEGORY_2_FIELD || "Reverb Subcategory 2",
      sync2sellTagOverride: process.env.CATEGORY_MAP_SYNC2SELL_TAG_OVERRIDE_FIELD || "Sync2Sell Tag Override",
      active: process.env.CATEGORY_MAP_ACTIVE_FIELD || "Active",
    }
  },
  shopify: {
    shop: normalizeShop(process.env.SHOPIFY_SHOP || process.env.SHOPIFY_STORE_DOMAIN || ""),
    clientId: process.env.SHOPIFY_CLIENT_ID || "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
    apiVersion: process.env.SHOPIFY_API_VERSION || "2026-01",
  }
};

let cachedShopifyToken = null;
let cachedShopifyTokenExpiresAt = 0;
let cachedCategoryMappings = null;

export function logger(level, msg, meta) { return log(level, CFG.logLevel, msg, meta); }
export function field(record, name) { return record?.fields?.[name]; }

export function stringField(record, name) {
  const value = field(record, name);
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).trim();
}

export function numberField(record, name) {
  const value = field(record, name);
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function escapeAirtableFormulaString(value) { return String(value).replace(/'/g, "\\'"); }

export function textToShopifyHtml(text) {
  const escaped = String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.split(/\n{2,}/).map(block => `<p>${block.replace(/\n/g, "<br>")}</p>`).join("\n");
}

function tag(label, value) {
  const clean = String(value || "").trim();
  return clean ? `${label}:${clean}` : null;
}
function splitTags(value) {
  return String(value || "").split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

export function buildTags(record, categoryMapping = null) {
  const f = CFG.airtable.fields;
  const m = CFG.airtable.categoryMapFields;

  const tags = [
    tag("reverbsync-shipping-profile", stringField(record, f.shippingProfile)),
    tag("reverbsync-make", stringField(record, f.make)),
    tag("reverbsync-model", stringField(record, f.model)),
    tag("reverbsync-condition", stringField(record, f.conditionRanking)),
    tag("reverbsync-year", stringField(record, f.year)),
    tag("reverbsync-finish", stringField(record, f.finish)),
    tag("Condition", stringField(record, f.conditionRanking)),
  ].filter(Boolean);

  if (categoryMapping) {
    tags.push(...splitTags(stringField(categoryMapping, m.shopifyTags)));
    tags.push(...splitTags(stringField(categoryMapping, m.sync2sellTagOverride)));
    const rvCat = stringField(categoryMapping, m.reverbCategory);
    const rvSub1 = stringField(categoryMapping, m.reverbSubcategory1);
    const rvSub2 = stringField(categoryMapping, m.reverbSubcategory2);
    if (rvCat) tags.push(`reverb-category:${rvCat}`);
    if (rvSub1) tags.push(`reverb-subcategory-1:${rvSub1}`);
    if (rvSub2) tags.push(`reverb-subcategory-2:${rvSub2}`);
  }

  return [...new Set(tags)].join(", ");
}

export function attachmentImagePayloads(record) {
  const photos = field(record, CFG.airtable.fields.techPhotos);
  if (!Array.isArray(photos)) return [];
  return photos.filter(photo => photo?.url).map(photo => ({
    src: photo.url,
    alt: photo.filename || stringField(record, CFG.airtable.fields.title) || stringField(record, CFG.airtable.fields.sku)
  }));
}

export async function airtableTableRequest(tableName, path = "", options = {}) {
  const url = `https://api.airtable.com/v0/${CFG.airtable.baseId}/${encodeURIComponent(tableName)}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {"Authorization": `Bearer ${CFG.airtable.pat}`, "Content-Type": "application/json", ...(options.headers || {})}
  });
  if (!res.ok) throw new Error(`Airtable request failed ${res.status}: ${await res.text()}`);
  return res.json();
}
export async function airtableRequest(path = "", options = {}) {
  return airtableTableRequest(CFG.airtable.tableName, path, options);
}

export async function fetchReadyAirtableRecords() {
  const f = CFG.airtable.fields;
  const formula = `AND({${f.readyForDraft}}=1, NOT({${f.draftCreated}}), {${f.listingDestination}}='${escapeAirtableFormulaString(CFG.destinationValue)}')`;
  let offset = null;
  const records = [];
  while (true) {
    const query = new URLSearchParams();
    query.set("pageSize", "100");
    query.set("filterByFormula", formula);
    if (offset) query.set("offset", offset);
    const data = await airtableRequest(`?${query.toString()}`);
    records.push(...(data.records || []));
    if (!data.offset) break;
    offset = data.offset;
  }
  return records;
}

export async function fetchCategoryMappings() {
  if (cachedCategoryMappings) return cachedCategoryMappings;

  const m = CFG.airtable.categoryMapFields;
  const formula = `{${m.active}}=1`;
  let offset = null;
  const mappings = new Map();

  while (true) {
    const query = new URLSearchParams();
    query.set("pageSize", "100");
    query.set("filterByFormula", formula);
    if (offset) query.set("offset", offset);

    const data = await airtableTableRequest(CFG.airtable.categoryMappingTableName, `?${query.toString()}`);
    for (const rec of data.records || []) {
      const key = normalizeKey(stringField(rec, m.airtableCategory));
      if (key) mappings.set(key, rec);
    }
    if (!data.offset) break;
    offset = data.offset;
  }

  cachedCategoryMappings = mappings;
  logger("info", "Loaded active category mappings", { count: mappings.size });
  return cachedCategoryMappings;
}

export async function getCategoryMappingForRecord(record) {
  const category = stringField(record, CFG.airtable.fields.productCategory);
  if (!category) return null;

  const mappings = await fetchCategoryMappings();
  const mapping = mappings.get(normalizeKey(category));

  if (!mapping) logger("warn", "No active category mapping found; falling back to Inventory Product Type", { category });
  return mapping || null;
}

export async function updateAirtableRecord(recordId, fields) {
  if (CFG.dryRun) {
    logger("info", "DRY_RUN would update Airtable", { recordId, fields });
    return { dryRun: true };
  }
  return airtableRequest("", { method: "PATCH", body: JSON.stringify({ records: [{ id: recordId, fields }] }) });
}

export async function getShopifyAccessToken() {
  if (cachedShopifyToken && Date.now() < cachedShopifyTokenExpiresAt - 60_000) return cachedShopifyToken;
  if (!CFG.shopify.shop || !CFG.shopify.clientId || !CFG.shopify.clientSecret) {
    throw new Error("Missing Shopify auth vars. Set SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET.");
  }
  const res = await fetch(`https://${CFG.shopify.shop}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CFG.shopify.clientId,
      client_secret: CFG.shopify.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token request failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  cachedShopifyToken = data.access_token;
  cachedShopifyTokenExpiresAt = Date.now() + Number(data.expires_in || 86399) * 1000;
  return cachedShopifyToken;
}

export async function shopifyRequest(path, options = {}) {
  const base = `https://${CFG.shopify.shop}.myshopify.com/admin/api/${CFG.shopify.apiVersion}`;
  const token = await getShopifyAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {"X-Shopify-Access-Token": token, "Content-Type": "application/json", ...(options.headers || {})}
  });
  if (!res.ok) throw new Error(`Shopify request failed ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function buildShopifyProductPayload(record) {
  const f = CFG.airtable.fields;
  const m = CFG.airtable.categoryMapFields;
  const categoryMapping = await getCategoryMappingForRecord(record);

  const inventoryProductType = stringField(record, f.productCategory);
  const mappedShopifyProductType = categoryMapping ? stringField(categoryMapping, m.shopifyProductType) : "";
  const productType = mappedShopifyProductType || inventoryProductType;

  const title = stringField(record, f.title) || stringField(record, f.name) || stringField(record, f.sku);
  const sku = stringField(record, f.sku);
  const price = numberField(record, f.price);
  const qty = numberField(record, f.qty);
  const weight = numberField(record, f.shopifyShippingWeight);

  const variant = {
    sku,
    price: price !== null ? String(price) : "0.00",
    inventory_management: "shopify",
    inventory_quantity: qty !== null ? qty : 1,
    taxable: true
  };

  if (weight !== null) {
    variant.weight = weight;
    variant.weight_unit = "lb";
  }

  const product = {
    title,
    body_html: textToShopifyHtml(stringField(record, f.description)),
    vendor: stringField(record, f.make) || "A Flash Flood of Gear",
    product_type: productType,
    status: "draft",
    tags: buildTags(record, categoryMapping),
    variants: [variant],
  };

  logger("info", "Category mapping applied", {
    inventoryProductType,
    mappedShopifyProductType: mappedShopifyProductType || null,
    finalShopifyProductType: productType,
    categoryMappingFound: Boolean(categoryMapping),
  });

  return { product };
}

export function shopifyAdminProductUrl(productId) {
  return `https://admin.shopify.com/store/${CFG.shopify.shop}/products/${productId}`;
}

export async function createShopifyDraftProduct(record) {
  const payload = await buildShopifyProductPayload(record);
  if (CFG.dryRun) {
    const photos = attachmentImagePayloads(record);
    logger("info", "DRY_RUN would create Shopify product", payload);
    logger("info", "DRY_RUN would upload Shopify images after draft creation", { count: photos.length, images: photos });
    return { product: { id: "DRY_RUN_PRODUCT_ID", variants: [{ id: "DRY_RUN_VARIANT_ID", inventory_item_id: "DRY_RUN_INVENTORY_ITEM_ID" }] } };
  }
  return shopifyRequest("/products.json", { method: "POST", body: JSON.stringify(payload) });
}

function safeShopifyFilename(image, index) {
  const raw = String(image.alt || `tech-photo-${index + 1}.jpg`).trim();
  let name = raw.replace(/[^\w.\-]+/g, "-");
  if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
    name += ".jpg";
  }
  return name;
}

async function fetchImageAsBase64(image) {
  const res = await fetch(image.src);
  if (!res.ok) {
    throw new Error(`Could not download Airtable image ${res.status}: ${image.alt || image.src}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString("base64");
}

export async function uploadShopifyProductImages(productId, record) {
  const images = attachmentImagePayloads(record);

  if (!images.length) {
    logger("info", "No Tech Photos found to upload", { productId, field: CFG.airtable.fields.techPhotos });
    return { uploaded: 0 };
  }

  logger("info", "Uploading Shopify product images via base64 attachments", { productId, count: images.length });

  let uploaded = 0;
  for (const [index, image] of images.entries()) {
    const filename = safeShopifyFilename(image, index);

    if (CFG.dryRun) {
      logger("info", "DRY_RUN would download Airtable image and upload to Shopify as attachment", {
        productId,
        filename,
        alt: image.alt,
        src: image.src
      });
      uploaded += 1;
      continue;
    }

    const attachment = await fetchImageAsBase64(image);

    await shopifyRequest(`/products/${productId}/images.json`, {
      method: "POST",
      body: JSON.stringify({
        image: {
          attachment,
          filename,
          alt: image.alt || filename
        }
      })
    });

    uploaded += 1;
  }

  logger("info", "Finished uploading Shopify product images", { productId, uploaded });
  return { uploaded };
}


export async function updateInventoryItemCost(inventoryItemId, cost) {
  if (!inventoryItemId || cost === null || cost === undefined) return null;
  if (CFG.dryRun) {
    logger("info", "DRY_RUN would update Shopify inventory item cost", { inventoryItemId, cost });
    return { dryRun: true };
  }
  return shopifyRequest(`/inventory_items/${inventoryItemId}.json`, {
    method: "PUT",
    body: JSON.stringify({ inventory_item: { id: inventoryItemId, cost: String(cost) } })
  });
}
