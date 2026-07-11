const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { sites, categories } = require("./sites");

const OUT_FILE = path.join(__dirname, "..", "data", "products.json");
const LOG_FILE = path.join(__dirname, "..", "data", "price-log.json");
const MAX_LOG_ENTRIES = 300;

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; VersusBot/1.0)" },
  });
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.text();
}

function pricesByPaymentMethod(listPrice, discounts) {
  const result = {};
  for (const [method, rate] of Object.entries(discounts)) {
    result[method] = Math.round(listPrice * (1 - rate));
  }
  return result;
}

function findProductLinks($, pageUrl, predicate) {
  const links = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    let abs;
    try {
      abs = new URL(href, pageUrl).href;
    } catch {
      return;
    }
    if (predicate(abs)) links.add(abs.split("?")[0].split("#")[0]);
  });
  return [...links];
}

async function fetchProductMeta(url, metaPriceProp, stockMetaProp) {
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const meta = (prop) => $(`meta[property="${prop}"]`).attr("content");

  const name = meta("og:title");
  const price = meta(metaPriceProp);
  const image = meta("og:image:secure_url") || meta("og:image");
  const stock = stockMetaProp ? meta(stockMetaProp) : null;

  if (!name || !price) return null;
  // Si la tienda no expone stock (sin meta tag), asumimos disponible.
  const inStock = stock == null ? true : Number(stock) > 0;
  return { name: name.trim(), price: Number(price), image, inStock };
}

// --- Tiendanube (Magnolias, Chula) ---
async function scrapeTiendanubeCategory(site, categoryId, pageUrl) {
  const html = await fetchText(pageUrl);
  const $ = cheerio.load(html);
  const links = findProductLinks($, pageUrl, (u) => u.includes("/productos/"));

  const products = [];
  for (const url of links) {
    const meta = await fetchProductMeta(url, "tiendanube:price", "tiendanube:stock");
    if (!meta) {
      console.log(`    SKIP (sin datos) ${url}`);
      continue;
    }
    products.push(buildProduct(site, categoryId, meta, url));
    console.log(`    OK  ${meta.name} - $${meta.price}${meta.inStock ? "" : " (sin stock)"}`);
  }
  return products;
}

// --- Empretienda (Manada Almacén): usa el endpoint real de paginación
// (/v4/product/category) en vez de leer el HTML, así trae el catálogo
// completo en vez de solo lo que carga la primera pantalla del scroll. ---
async function scrapeEmpretiendaCategory(site, categoryId, pageUrl) {
  const pageRes = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await pageRes.text();
  const cookies = pageRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

  const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
  const idsMatch = html.match(/var ids = \[([0-9,]+)\];/);
  if (!csrfMatch || !idsMatch) {
    console.log(`    (no se encontró csrf-token / category ids en ${pageUrl})`);
    return [];
  }
  const csrfToken = csrfMatch[1];
  const categoryIds = idsMatch[1].split(",");

  const products = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({ filter_page: String(page), filter_order: "0" });
    categoryIds.forEach((id) => params.append("filter_categories[]", id));

    const res = await fetch(`${new URL(pageUrl).origin}/v4/product/category?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": csrfToken,
        Cookie: cookies,
      },
    });
    const json = await res.json();
    const items = json.data || [];
    if (!items.length) break;

    for (const item of items) {
      const stockEntry = item.stock?.[0];
      const inStock = stockEntry ? stockEntry.s_ilimitado === 1 || stockEntry.s_cantidad > 0 : true;
      const imageHash = item.imagenes?.[0]?.i_link;
      console.log(`    OK  ${item.p_nombre} - $${item.p_precio}${inStock ? "" : " (sin stock)"}`);
      products.push(
        buildProduct(
          site,
          categoryId,
          {
            name: item.p_nombre,
            price: item.p_precio,
            image: imageHash ? `https://d22fxaf9t8d39k.cloudfront.net/${imageHash}` : null,
            inStock,
          },
          `${pageUrl}/${item.p_link}`
        )
      );
    }
    if (items.length < 12) break;
    page++;
  }

  return products;
}

// --- Tienda Negocio (El Choike): productos embebidos en el HTML de la
// página de categoría, codificados con &q; en vez de comillas. ---
async function scrapeTiendaNegocioCategory(site, categoryId, pageUrl) {
  const html = await fetchText(pageUrl);

  const marker = "products-categories-search&q;:{";
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) {
    console.log(`    (sin bloque de productos en ${pageUrl})`);
    return [];
  }

  const arrayStart = html.indexOf("&q;products&q;:[", markerIdx);
  const bracketStart = html.indexOf("[", arrayStart);

  let depth = 0;
  let end = -1;
  for (let i = bracketStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("No se pudo balancear el array de productos");

  const rawArray = html.slice(bracketStart, end).replace(/&q;/g, '"');
  const items = JSON.parse(rawArray);

  return items.map((item) => {
    const inStock = item.stockAvailable !== false;
    console.log(`    OK  ${item.title} - $${item.price}${inStock ? "" : " (sin stock)"}`);
    return buildProduct(
      site,
      categoryId,
      { name: item.title, price: item.price, image: item.thumbnail, inStock },
      site.productBaseUrl + item.hash
    );
  });
}

// --- Shopify (Raíz Negra): JSON público por colección, sin parsear HTML. ---
async function scrapeShopifyCategory(site, categoryId, collectionHandle) {
  const products = [];
  let page = 1;

  while (true) {
    const url = `${site.domain}/collections/${collectionHandle}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
    const { products: items } = await res.json();
    if (!items.length) break;

    for (const item of items) {
      const variant = item.variants?.[0];
      if (!variant?.price) continue;
      const listPrice = Math.round(Number(variant.price));
      const inStock = item.variants.some((v) => v.available);
      console.log(`    OK  ${item.title} - $${listPrice}${inStock ? "" : " (sin stock)"}`);
      products.push(
        buildProduct(
          site,
          categoryId,
          { name: item.title, price: listPrice, image: item.images?.[0]?.src, inStock },
          `${site.domain}/products/${item.handle}`
        )
      );
    }
    if (items.length < 250) break;
    page++;
  }

  return products;
}

function buildProduct(site, categoryId, meta, url) {
  return {
    store: site.store,
    name: meta.name,
    price: meta.price,
    prices: pricesByPaymentMethod(meta.price, site.discounts),
    currency: "ARS",
    image: meta.image,
    inStock: meta.inStock !== false,
    url,
    category: categoryId,
  };
}

const SCRAPERS = {
  tiendanube: scrapeTiendanubeCategory,
  empretienda: scrapeEmpretiendaCategory,
  tiendanegocio: scrapeTiendaNegocioCategory,
  shopify: scrapeShopifyCategory,
};

async function main() {
  const products = [];

  for (const category of categories) {
    console.log(`\n=== ${category.label} ===`);
    for (const site of sites) {
      const pageUrl = category.pages[site.store];
      if (!pageUrl) continue;

      console.log(`  ${site.store}`);
      const scraper = SCRAPERS[site.platform];
      try {
        const siteProducts = await scraper(site, category.id, pageUrl);
        products.push(...siteProducts);
      } catch (e) {
        console.log(`    ERROR ${pageUrl}: ${e.message}`);
      }
    }
  }

  const previousByUrl = new Map();
  if (fs.existsSync(OUT_FILE)) {
    const previous = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
    for (const p of previous.products) {
      previousByUrl.set(p.url, { price: p.price, firstSeenAt: p.firstSeenAt || previous.updatedAt });
    }
  }

  const now = new Date().toISOString();
  const newLogEntries = [];

  for (const product of products) {
    const prev = previousByUrl.get(product.url);
    product.firstSeenAt = prev?.firstSeenAt || now;

    if (prev != null && prev.price !== product.price) {
      product.priceChange = { previous: prev.price, current: product.price, changedAt: now };
      newLogEntries.push({
        url: product.url,
        name: product.name,
        store: product.store,
        previous: prev.price,
        current: product.price,
        changedAt: now,
      });
    }
  }

  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  }
  log = [...newLogEntries, ...log].slice(0, MAX_LOG_ENTRIES);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ updatedAt: now, categories, products }, null, 2)
  );
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

  console.log(`\nGuardado ${products.length} productos en ${OUT_FILE}`);
  if (newLogEntries.length) {
    console.log(`${newLogEntries.length} cambios de precio detectados.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
