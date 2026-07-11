"use client";

import { useEffect, useMemo, useState } from "react";

const PAYMENT_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

const FAVORITES_KEY = "versus_favorites_v2";
const MATCHES_KEY = "versus_matches_v1";
const MAX_COMPARE = 3;
const MY_STORE = "El Choike";

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "{}");
    if (Array.isArray(stored)) {
      return Object.fromEntries(stored.map((url) => [url, { note: "" }]));
    }
    return stored;
  } catch {
    return {};
  }
}

function loadMatches() {
  try {
    return JSON.parse(localStorage.getItem(MATCHES_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function ProductGrid({ products, categories, updatedAt, priceLog, priceHistory, savedMatches }) {
  const allStores = useMemo(
    () => [...new Set(products.map((p) => p.store))].sort(),
    [products]
  );

  const availableCategoryIds = useMemo(
    () => new Set(products.map((p) => p.category)),
    [products]
  );
  const usableCategories = categories.filter((c) => availableCategoryIds.has(c.id));

  const [view, setView] = useState("catalog");
  const [categoryId, setCategoryId] = useState(usableCategories[0]?.id ?? null);
  const [selectedStores, setSelectedStores] = useState(allStores);
  const [sortBy, setSortBy] = useState("price-asc");
  const [payment, setPayment] = useState("efectivo");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [layout, setLayout] = useState("grid");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPriceChanges, setOnlyPriceChanges] = useState(false);
  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [compareUrls, setCompareUrls] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [matches, setMatches] = useState({});
  const [matchProduct, setMatchProduct] = useState(null);

  useEffect(() => {
    setFavorites(loadFavorites());
    const local = loadMatches();
    setMatches(Object.keys(local).length ? local : savedMatches || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistFavorites = (next) => {
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const toggleFavorite = (url) => {
    const next = { ...favorites };
    if (next[url]) delete next[url];
    else next[url] = { note: "" };
    persistFavorites(next);
  };

  const setNote = (url, note) => {
    if (!favorites[url]) return;
    persistFavorites({ ...favorites, [url]: { ...favorites[url], note } });
  };

  const persistMatches = (next) => {
    setMatches(next);
    localStorage.setItem(MATCHES_KEY, JSON.stringify(next));
  };

  const toggleMatch = (myUrl, competitorUrl) => {
    const current = matches[myUrl] || [];
    const nextForProduct = current.includes(competitorUrl)
      ? current.filter((u) => u !== competitorUrl)
      : [...current, competitorUrl];
    const next = { ...matches, [myUrl]: nextForProduct };
    if (nextForProduct.length === 0) delete next[myUrl];
    persistMatches(next);
  };

  const toggleStore = (store) => {
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  };

  const toggleCompare = (url) => {
    setCompareUrls((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, url];
    });
  };

  const filtered = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const q = search.trim().toLowerCase();

    const list = products.filter((p) => {
      if (p.category !== categoryId) return false;
      if (!selectedStores.includes(p.store)) return false;
      if (p.prices?.[payment] == null) return false;
      if (hideOutOfStock && p.inStock === false) return false;
      const effective = p.prices[payment];
      if (min != null && effective < min) return false;
      if (max != null && effective > max) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (onlyFavorites && !favorites[p.url]) return false;
      if (onlyPriceChanges && !p.priceChange) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "date-desc" || sortBy === "date-asc") {
        const da = a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0;
        const db = b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0;
        return sortBy === "date-desc" ? db - da : da - db;
      }
      const pa = a.prices[payment];
      const pb = b.prices[payment];
      return sortBy === "price-desc" ? pb - pa : pa - pb;
    });
    return list;
  }, [products, categoryId, selectedStores, sortBy, payment, search, minPrice, maxPrice, onlyFavorites, favorites, hideOutOfStock, onlyPriceChanges]);

  const bestPriceUrl = filtered[0]?.url;
  const compareProducts = compareUrls.map((url) => products.find((p) => p.url === url)).filter(Boolean);
  const favoriteCount = Object.keys(favorites).length;

  const productsByUrl = useMemo(() => new Map(products.map((p) => [p.url, p])), [products]);

  const matchComparisons = useMemo(() => {
    const result = {};
    for (const [myUrl, competitorUrls] of Object.entries(matches)) {
      const competitors = competitorUrls.map((u) => productsByUrl.get(u)).filter(Boolean);
      if (!competitors.length) continue;
      const cheapest = competitors.reduce((min, p) =>
        p.prices[payment] < min.prices[payment] ? p : min
      );
      result[myUrl] = { competitor: cheapest, count: competitors.length };
    }
    return result;
  }, [matches, productsByUrl, payment]);

  const repricingRows = useMemo(() => {
    const rows = [];
    for (const [myUrl, comparison] of Object.entries(matchComparisons)) {
      const myProduct = productsByUrl.get(myUrl);
      const competitorPrice = comparison.competitor.prices[payment];
      if (!myProduct || competitorPrice == null) continue;
      const myPrice = myProduct.prices[payment];
      rows.push({
        product: myProduct,
        competitor: comparison.competitor,
        matchCount: comparison.count,
        myPrice,
        competitorPrice,
        diff: myPrice - competitorPrice,
      });
    }
    rows.sort((a, b) => b.diff - a.diff);
    return rows;
  }, [matchComparisons, productsByUrl, payment]);

  const overpricedCount = repricingRows.filter((r) => r.diff > 0).length;

  const shareFavorites = () => {
    const favProducts = products.filter((p) => favorites[p.url]);
    if (!favProducts.length) return;
    const lines = favProducts.map((p) => {
      const price = p.prices[payment];
      const note = favorites[p.url]?.note;
      return `• ${p.name} (${p.store}) - $${price.toLocaleString("es-AR")}${note ? ` — "${note}"` : ""}\n${p.url}`;
    });
    const text = `Mi lista de favoritos:\n\n${lines.join("\n\n")}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const exportMatches = async () => {
    const json = JSON.stringify(matches, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert("Vínculos copiados al portapapeles. Pegalos en el chat para que se suban al repo y el mail de alertas los tenga en cuenta.");
    } catch {
      prompt("Copiá este JSON y pegalo en el chat:", json);
    }
  };

  if (view === "log") {
    return <PriceLogView priceLog={priceLog} onBack={() => setView("catalog")} />;
  }

  if (view === "pricing") {
    return (
      <RepricingView
        rows={repricingRows}
        payment={payment}
        setPayment={setPayment}
        onBack={() => setView("catalog")}
        onEditMatch={(p) => { setView("catalog"); setMatchProduct(p); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header
        search={search}
        setSearch={setSearch}
        payment={payment}
        setPayment={setPayment}
        sortBy={sortBy}
        setSortBy={setSortBy}
        layout={layout}
        setLayout={setLayout}
        onShowLog={() => setView("log")}
        logCount={priceLog.length}
        onShowPricing={() => setView("pricing")}
        overpricedCount={overpricedCount}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
      />

      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar
          open={filtersOpen}
          usableCategories={usableCategories}
          categoryId={categoryId}
          setCategoryId={(id) => { setCategoryId(id); setFiltersOpen(false); }}
          allStores={allStores}
          selectedStores={selectedStores}
          toggleStore={toggleStore}
          payment={payment}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          hideOutOfStock={hideOutOfStock}
          setHideOutOfStock={setHideOutOfStock}
          onlyFavorites={onlyFavorites}
          setOnlyFavorites={setOnlyFavorites}
          onlyPriceChanges={onlyPriceChanges}
          setOnlyPriceChanges={setOnlyPriceChanges}
          favoriteCount={favoriteCount}
          shareFavorites={shareFavorites}
          matchCount={Object.keys(matches).length}
          exportMatches={exportMatches}
        />

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-ink sm:text-4xl">
                {usableCategories.find((c) => c.id === categoryId)?.label ?? "Productos"}
              </h1>
              {updatedAt && (
                <p className="mt-1 text-sm text-stone-500">
                  {filtered.length} producto{filtered.length !== 1 && "s"} · actualizado el{" "}
                  {new Date(updatedAt).toLocaleDateString("es-AR")}
                </p>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 py-24 text-center text-stone-400">
              <p className="font-display text-xl italic">Nada por acá todavía</p>
              <p className="mt-1 text-sm">Probá ajustar los filtros o cambiar de categoría.</p>
            </div>
          ) : layout === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((p) => (
                <ProductCard
                  key={p.url}
                  p={p}
                  payment={payment}
                  isBest={p.url === bestPriceUrl}
                  favorite={favorites[p.url]}
                  onToggleFavorite={() => toggleFavorite(p.url)}
                  onSetNote={(note) => setNote(p.url, note)}
                  isComparing={compareUrls.includes(p.url)}
                  compareDisabled={!compareUrls.includes(p.url) && compareUrls.length >= MAX_COMPARE}
                  onToggleCompare={() => toggleCompare(p.url)}
                  onShowHistory={() => setHistoryProduct(p)}
                  matchComparison={matchComparisons[p.url]}
                  onEditMatch={() => setMatchProduct(p)}
                />
              ))}
            </div>
          ) : (
            <TableView
              filtered={filtered}
              payment={payment}
              bestPriceUrl={bestPriceUrl}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              compareUrls={compareUrls}
              toggleCompare={toggleCompare}
              onShowHistory={setHistoryProduct}
              matchComparisons={matchComparisons}
              onEditMatch={setMatchProduct}
            />
          )}
        </main>
      </div>

      {compareUrls.length >= 2 && (
        <button
          onClick={() => setShowCompare(true)}
          className="fixed bottom-6 right-6 z-20 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-stone-50 shadow-xl shadow-ink/20 transition hover:scale-105 hover:bg-clay-600"
        >
          Comparar ({compareUrls.length})
        </button>
      )}

      {showCompare && (
        <CompareModal
          products={compareProducts}
          payment={payment}
          onRemove={toggleCompare}
          onClose={() => setShowCompare(false)}
        />
      )}

      {historyProduct && (
        <PriceHistoryModal
          product={historyProduct}
          points={priceHistory[historyProduct.url] || []}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {matchProduct && (
        <MatchModal
          product={matchProduct}
          products={products}
          payment={payment}
          matchedUrls={matches[matchProduct.url] || []}
          onToggleMatch={(competitorUrl) => toggleMatch(matchProduct.url, competitorUrl)}
          onClose={() => setMatchProduct(null)}
        />
      )}
    </div>
  );
}

function Header({ search, setSearch, payment, setPayment, sortBy, setSortBy, layout, setLayout, onShowLog, logCount, onShowPricing, overpricedCount, onToggleFilters }) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
        <button onClick={onToggleFilters} className="rounded-lg border border-stone-300 bg-white p-2 text-stone-600 lg:hidden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <a href="/" className="font-display text-2xl italic text-ink mr-2">Versus</a>

        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-stone-400 outline-none ring-clay-500/30 focus:border-clay-500 focus:ring-2"
          />
        </div>

        <select value={payment} onChange={(e) => setPayment(e.target.value)} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-clay-500">
          {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-clay-500">
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="date-desc">Más nuevos primero</option>
          <option value="date-asc">Más viejos primero</option>
        </select>

        <div className="hidden items-center rounded-full border border-stone-300 bg-white p-1 sm:flex">
          <button onClick={() => setLayout("grid")} className={`rounded-full px-3 py-1.5 text-sm transition ${layout === "grid" ? "bg-ink text-white" : "text-stone-500"}`}>Grilla</button>
          <button onClick={() => setLayout("table")} className={`rounded-full px-3 py-1.5 text-sm transition ${layout === "table" ? "bg-ink text-white" : "text-stone-500"}`}>Tabla</button>
        </div>

        <button onClick={onShowPricing} className="ml-auto flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 hover:border-clay-500 hover:text-clay-600">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>
          {overpricedCount > 0 ? `${overpricedCount} para revisar` : "Repricing"}
        </button>

        <button onClick={onShowLog} className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 hover:border-clay-500 hover:text-clay-600">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
          {logCount > 0 ? `${logCount} cambios` : "Cambios"}
        </button>
      </div>
    </header>
  );
}

function Sidebar({
  open, usableCategories, categoryId, setCategoryId,
  allStores, selectedStores, toggleStore,
  payment, minPrice, setMinPrice, maxPrice, setMaxPrice,
  hideOutOfStock, setHideOutOfStock, onlyFavorites, setOnlyFavorites,
  onlyPriceChanges, setOnlyPriceChanges, favoriteCount, shareFavorites,
  matchCount, exportMatches,
}) {
  return (
    <aside className={`${open ? "block" : "hidden"} w-full shrink-0 border-b border-stone-200 bg-stone-50 px-5 py-6 sm:px-8 lg:block lg:w-64 lg:border-b-0 lg:border-r lg:px-6`}>
      <Section title="Categorías">
        <nav className="flex flex-col gap-0.5">
          {usableCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                categoryId === c.id ? "bg-ink text-white" : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              {c.label}
            </button>
          ))}
        </nav>
      </Section>

      <Section title="Tiendas">
        <div className="flex flex-col gap-2">
          {allStores.map((store) => (
            <label key={store} className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={selectedStores.includes(store)}
                onChange={() => toggleStore(store)}
                className="h-4 w-4 rounded border-stone-300 accent-clay-500"
              />
              {store}
            </label>
          ))}
        </div>
      </Section>

      <Section title={`Precio (${PAYMENT_LABELS[payment]})`}>
        <div className="flex gap-2">
          <input type="number" placeholder="Mín" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-clay-500" />
          <input type="number" placeholder="Máx" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-clay-500" />
        </div>
      </Section>

      <div className="mb-6 flex flex-col gap-2.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
          <input type="checkbox" checked={hideOutOfStock} onChange={(e) => setHideOutOfStock(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-clay-500" />
          Ocultar sin stock
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
          <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-clay-500" />
          Solo favoritos {favoriteCount > 0 && `(${favoriteCount})`}
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
          <input type="checkbox" checked={onlyPriceChanges} onChange={(e) => setOnlyPriceChanges(e.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-clay-500" />
          Solo con cambios de precio
        </label>
      </div>

      {favoriteCount > 0 && (
        <button
          onClick={shareFavorites}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-moss-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-moss-600"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C11 9.4 10.5 8 10.3 7.5c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.4.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.7 3 1.1 4.8 1.1 5.5 0 10-4.5 10-10S17.5 2 12 2z" /></svg>
          Compartir favoritos
        </button>
      )}

      {matchCount > 0 && (
        <button
          onClick={exportMatches}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:border-clay-500 hover:text-clay-600"
        >
          Exportar vínculos ({matchCount})
        </button>
      )}
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</h2>
      {children}
    </div>
  );
}

function ProductCard({ p, payment, isBest, favorite, onToggleFavorite, onSetNote, isComparing, compareDisabled, onToggleCompare, onShowHistory, matchComparison, onEditMatch }) {
  const effectivePrice = p.prices[payment];
  const hasDiscount = effectivePrice !== p.price;
  const isMyStore = p.store === MY_STORE;

  return (
    <div className={`card group relative overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-lg hover:shadow-stone-900/5 ${isBest ? "border-clay-500" : "border-stone-200"} ${p.inStock === false ? "opacity-55" : ""}`}>
      <label className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[11px] text-stone-600 shadow-sm backdrop-blur">
        <input type="checkbox" checked={isComparing} disabled={compareDisabled} onChange={onToggleCompare} className="h-3 w-3 accent-clay-500" />
        comparar
      </label>

      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(); }}
        className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-base shadow-sm backdrop-blur transition hover:scale-110"
      >
        {favorite ? "⭐" : "☆"}
      </button>

      {isBest && (
        <div className="absolute left-2.5 top-10 z-10 rounded-full bg-clay-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          Mejor precio
        </div>
      )}

      <a href={p.url} target="_blank" rel="noreferrer" className="block">
        <div className="aspect-square overflow-hidden bg-stone-100">
          <img src={p.image} alt={p.name} className="card-image h-full w-full object-cover" />
        </div>
        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{p.store}</div>
          <div className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink">
            {p.name}
            {p.inStock === false && <span className="ml-1 font-normal text-red-500">(sin stock)</span>}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-ink">${effectivePrice.toLocaleString("es-AR")}</span>
            {hasDiscount && <span className="text-xs text-stone-400 line-through">${p.price.toLocaleString("es-AR")}</span>}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShowHistory(); }}
              title="Ver historial de precio"
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-clay-600"
            >
              <HistoryIcon />
            </button>
          </div>
          <PriceChangeBadge change={p.priceChange} />
          {isMyStore && <MatchBadge comparison={matchComparison} myPrice={effectivePrice} payment={payment} />}
        </div>
      </a>

      {isMyStore && (
        <div className="px-3.5 pb-3">
          <button
            onClick={(e) => { e.preventDefault(); onEditMatch(); }}
            className="w-full rounded-lg border border-dashed border-stone-300 py-1.5 text-xs text-stone-500 transition hover:border-clay-400 hover:text-clay-600"
          >
            {matchComparison ? "Editar equivalentes" : "Vincular equivalentes"}
          </button>
        </div>
      )}

      {favorite && (
        <div className="px-3.5 pb-3.5">
          <input
            type="text"
            placeholder="Agregar nota..."
            defaultValue={favorite.note}
            onClick={(e) => e.preventDefault()}
            onBlur={(e) => onSetNote(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs outline-none focus:border-clay-500"
          />
        </div>
      )}
    </div>
  );
}

function TableView({ filtered, payment, bestPriceUrl, favorites, toggleFavorite, compareUrls, toggleCompare, onShowHistory, matchComparisons, onEditMatch }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
            <th className="p-3 font-medium"></th>
            <th className="p-3 font-medium"></th>
            <th className="p-3 font-medium"></th>
            <th className="p-3 font-medium">Producto</th>
            <th className="p-3 font-medium">Tienda</th>
            <th className="p-3 font-medium">Precio</th>
            <th className="p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const effectivePrice = p.prices[payment];
            const isBest = p.url === bestPriceUrl;
            const isFavorite = !!favorites[p.url];
            const isComparing = compareUrls.includes(p.url);
            const isMyStore = p.store === MY_STORE;
            return (
              <tr key={p.url} className={`border-b border-stone-100 last:border-0 ${isBest ? "bg-clay-50" : ""}`}>
                <td className="p-3">
                  <input type="checkbox" checked={isComparing} disabled={!isComparing && compareUrls.length >= MAX_COMPARE} onChange={() => toggleCompare(p.url)} className="h-4 w-4 accent-clay-500" />
                </td>
                <td className="p-3">
                  <button onClick={() => toggleFavorite(p.url)} className="text-base">{isFavorite ? "⭐" : "☆"}</button>
                </td>
                <td className="p-3">
                  <img src={p.image} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                </td>
                <td className="p-3">
                  <a href={p.url} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-clay-600">
                    {p.name}
                    {isBest && <span className="ml-1.5 text-[11px] font-semibold text-clay-500">★ mejor precio</span>}
                    {p.inStock === false && <span className="ml-1.5 text-[11px] text-red-500">sin stock</span>}
                  </a>
                  <PriceChangeBadge change={p.priceChange} />
                  {isMyStore && <MatchBadge comparison={matchComparisons[p.url]} myPrice={effectivePrice} payment={payment} />}
                  {isMyStore && (
                    <button onClick={() => onEditMatch(p)} className="mt-1 block text-[11px] text-stone-400 underline hover:text-clay-600">
                      {matchComparisons[p.url] ? "editar equivalentes" : "vincular equivalentes"}
                    </button>
                  )}
                </td>
                <td className="p-3 text-stone-500">{p.store}</td>
                <td className="p-3 font-semibold text-ink">${effectivePrice.toLocaleString("es-AR")}</td>
                <td className="p-3">
                  <button
                    onClick={() => onShowHistory(p)}
                    title="Ver historial de precio"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-clay-600"
                  >
                    <HistoryIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatchBadge({ comparison, myPrice, payment }) {
  if (!comparison) return null;
  const competitor = comparison.competitor;
  const competitorPrice = competitor.prices[payment];
  if (competitorPrice == null) return null;
  const diff = Math.abs(myPrice - competitorPrice);
  const iAmCheaper = myPrice <= competitorPrice;
  const extra = comparison.count > 1 ? ` (mejor de ${comparison.count})` : "";

  if (iAmCheaper) {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-moss-500/10 px-2 py-0.5 text-[11px] font-semibold text-moss-600">
        ▼ sos el más barato vs. {competitor.store}{extra}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(competitor.url, "_blank", "noopener,noreferrer");
      }}
      title={`Ver "${competitor.name}" en ${competitor.store}`}
      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-500/20"
    >
      ▲ ${diff.toLocaleString("es-AR")} más caro que {competitor.store}{extra}
    </button>
  );
}

function HistoryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 .5-4.5L3 8" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function MatchModal({ product, products, payment, matchedUrls, onToggleMatch, onClose }) {
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.url !== product.url && p.store !== MY_STORE && p.category === product.category)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.store.toLowerCase().includes(q))
      .sort((a, b) => a.prices[payment] - b.prices[payment]);
  }, [products, product, search, payment]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-5 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={product.image} alt={product.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{product.store}</div>
              <h2 className="font-display text-xl text-ink">{product.name}</h2>
              <div className="text-sm font-semibold text-clay-600">${product.prices[payment].toLocaleString("es-AR")}</div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100">✕</button>
        </div>
        <p className="mb-3 text-sm text-stone-500">
          Marcá qué productos de la competencia son equivalentes a este, para comparar precios.
        </p>

        <input
          type="text"
          placeholder="Buscar por nombre o tienda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-full border border-stone-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-clay-500"
        />

        <div className="flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">No hay productos de otras tiendas en esta categoría.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {candidates.map((c) => {
                const checked = matchedUrls.includes(c.url);
                return (
                  <label
                    key={c.url}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${checked ? "border-clay-400 bg-clay-50" : "border-stone-200 hover:bg-stone-50"}`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => onToggleMatch(c.url)} className="h-4 w-4 shrink-0 accent-clay-500" />
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                      title="Ver producto en la tienda"
                    >
                      <img src={c.image} alt={c.name} className="h-20 w-20 rounded-lg object-cover" />
                    </a>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink">{c.name}</div>
                      <div className="text-[11px] text-stone-400">{c.store}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-ink">${c.prices[payment].toLocaleString("es-AR")}</div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceChangeBadge({ change }) {
  if (!change) return null;
  const isDrop = change.current < change.previous;
  const diff = Math.abs(change.current - change.previous);
  return (
    <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDrop ? "bg-moss-500/10 text-moss-600" : "bg-red-500/10 text-red-600"}`}>
      {isDrop ? "▼" : "▲"} ${diff.toLocaleString("es-AR")} desde ${change.previous.toLocaleString("es-AR")}
    </div>
  );
}

function CompareModal({ products, payment, onRemove, onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-5 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink">Comparar productos</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100">✕</button>
        </div>
        <div className={`grid gap-4 ${products.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
          {products.map((p) => (
            <div key={p.url} className="relative rounded-xl border border-stone-200 p-3">
              <button onClick={() => onRemove(p.url)} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-stone-400 hover:bg-stone-100">✕</button>
              <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{p.store}</div>
              <div className="mt-1 text-sm font-medium text-ink">{p.name}</div>
              <div className="mt-2 text-xl font-semibold text-ink">${p.prices[payment].toLocaleString("es-AR")}</div>
              <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-clay-600 hover:underline">
                Ver en la tienda →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceHistoryModal({ product, points, onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-5 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{product.store}</div>
            <h2 className="font-display text-xl text-ink">{product.name}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100">✕</button>
        </div>
        <p className="mb-4 text-sm text-stone-500">Historial de precio de lista</p>
        <PriceHistoryChart points={points} currentPrice={product.price} />
      </div>
    </div>
  );
}

function PriceHistoryChart({ points, currentPrice }) {
  const series = useMemo(() => {
    const base = (points.length ? points : []).map((p) => ({ date: new Date(p.date), price: p.price }));
    if (!base.length) base.push({ date: new Date(), price: currentPrice });
    if (base[base.length - 1].price !== currentPrice) {
      base.push({ date: new Date(), price: currentPrice });
    }
    return base;
  }, [points, currentPrice]);

  const hasVariation = series.length > 1;
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!hasVariation) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 py-10 text-center">
        <div className="font-display text-2xl text-ink">${currentPrice.toLocaleString("es-AR")}</div>
        <p className="mt-1 text-sm text-stone-400">Sin variaciones de precio registradas todavía.</p>
      </div>
    );
  }

  const W = 560;
  const H = 260;
  const PAD = { top: 34, right: 16, bottom: 30, left: 16 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const prices = series.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceSpan = maxPrice - minPrice || 1;

  // Espaciado por índice (no por fecha real): con pocos cambios muy cercanos en
  // el tiempo, una escala temporal los amontona; distribuirlos en partes iguales
  // deja el gráfico legible sin perder el orden cronológico.
  const step = series.length > 1 ? innerW / series.length : 0;
  const x = (i) => PAD.left + step * i;
  const y = (v) => PAD.top + innerH - ((v - minPrice) / priceSpan) * innerH;

  const coords = series.map((p, i) => ({ x: x(i), y: y(p.price), date: p.date, price: p.price }));

  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    path += ` L ${coords[i].x} ${coords[i - 1].y} L ${coords[i].x} ${coords[i].y}`;
  }
  const todayX = W - PAD.right;
  const lastPoint = coords[coords.length - 1];
  path += ` L ${todayX} ${lastPoint.y}`;

  const hovered = hoverIdx != null ? coords[hoverIdx] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <line x1={PAD.left} y1={y(maxPrice)} x2={W - PAD.right} y2={y(maxPrice)} stroke="#e7e5e4" strokeWidth="1" />
        <line x1={PAD.left} y1={y(minPrice)} x2={W - PAD.right} y2={y(minPrice)} stroke="#e7e5e4" strokeWidth="1" />

        <text x={W - PAD.right} y={y(maxPrice) - 8} textAnchor="end" className="fill-stone-400 text-[10px]">${maxPrice.toLocaleString("es-AR")}</text>
        {minPrice !== maxPrice && (
          <text x={W - PAD.right} y={y(minPrice) - 8} textAnchor="end" className="fill-stone-400 text-[10px]">${minPrice.toLocaleString("es-AR")}</text>
        )}

        <path d={path} fill="none" stroke="#b5673f" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {coords.map((c, i) => {
          if (i === 0) return <circle key={i} cx={c.x} cy={c.y} r="4" fill="#57534e" stroke="white" strokeWidth="1.5" />;
          const isDrop = c.price < coords[i - 1].price;
          return (
            <circle key={i} cx={c.x} cy={c.y} r="4" fill={isDrop ? "#5c7a5e" : "#dc2626"} stroke="white" strokeWidth="1.5" />
          );
        })}

        {coords.map((c, i) => (
          <circle
            key={`hit-${i}`}
            cx={c.x}
            cy={c.y}
            r="12"
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
          />
        ))}

        {hovered && (
          <line x1={hovered.x} y1={PAD.top} x2={hovered.x} y2={H - PAD.bottom} stroke="#a8a29e" strokeWidth="1" strokeDasharray="3 3" />
        )}

        <text x={PAD.left} y={H - 10} className="fill-stone-400 text-[10px]">
          {series[0].date.toLocaleDateString("es-AR")}
        </text>
        <text x={W - PAD.right} y={H - 10} textAnchor="end" className="fill-stone-400 text-[10px]">
          hoy
        </text>
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(hovered.x / W) * 100}%`, top: `${(hovered.y / H) * 100}%` }}
        >
          <div className="font-semibold">${hovered.price.toLocaleString("es-AR")}</div>
          <div className="text-stone-300">{hovered.date.toLocaleDateString("es-AR")}</div>
        </div>
      )}
    </div>
  );
}

function RepricingView({ rows, payment, setPayment, onBack, onEditMatch }) {
  const overpriced = rows.filter((r) => r.diff > 0);
  const competitive = rows.filter((r) => r.diff <= 0);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-stone-500 hover:text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          Volver al catálogo
        </button>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-ink">Repricing</h1>
            <p className="mt-1 text-sm text-stone-500">
              Productos de El Choike vinculados a equivalentes, ordenados de más caro a más competitivo.
            </p>
          </div>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-clay-500">
            {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 py-24 text-center text-stone-400">
            <p className="font-display text-xl italic">Todavía no vinculaste productos</p>
            <p className="mt-1 text-sm">Desde una tarjeta de El Choike, tocá "Vincular equivalentes".</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {overpriced.map((r) => (
              <RepricingRow key={r.product.url} row={r} onEditMatch={onEditMatch} />
            ))}
            {competitive.length > 0 && overpriced.length > 0 && (
              <div className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Ya competitivos</div>
            )}
            {competitive.map((r) => (
              <RepricingRow key={r.product.url} row={r} onEditMatch={onEditMatch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RepricingRow({ row, onEditMatch }) {
  const { product, competitor, matchCount, myPrice, competitorPrice, diff } = row;
  const isOverpriced = diff > 0;
  const pct = Math.round((Math.abs(diff) / competitorPrice) * 100);

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-stone-200 bg-white p-3.5">
      <img src={product.image} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{product.name}</div>
        <div className="mt-0.5 text-sm">
          <span className="font-semibold text-ink">${myPrice.toLocaleString("es-AR")}</span>
          <span className="text-stone-400"> vs. </span>
          <a href={competitor.url} target="_blank" rel="noreferrer" className="text-clay-600 hover:underline">
            {competitor.store} ${competitorPrice.toLocaleString("es-AR")}
          </a>
          {matchCount > 1 && <span className="text-stone-400"> (mejor de {matchCount})</span>}
        </div>
        <button onClick={() => onEditMatch(product)} className="mt-0.5 text-[11px] text-stone-400 underline hover:text-clay-600">
          editar equivalentes
        </button>
      </div>
      <div className={`shrink-0 rounded-full px-2.5 py-1 text-right text-xs font-semibold ${isOverpriced ? "bg-red-500/10 text-red-600" : "bg-moss-500/10 text-moss-600"}`}>
        {isOverpriced ? "▲" : "▼"} ${Math.abs(diff).toLocaleString("es-AR")} ({pct}%)
      </div>
    </div>
  );
}

function PriceLogView({ priceLog, onBack }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-stone-500 hover:text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          Volver al catálogo
        </button>
        <h1 className="font-display text-3xl text-ink">Cambios de precio</h1>

        {priceLog.length === 0 ? (
          <p className="mt-6 text-stone-500">Todavía no se registraron cambios. Se van a ir agregando cada vez que corra el scraper.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-2.5">
            {priceLog.map((entry, i) => {
              const isDrop = entry.current < entry.previous;
              return (
                <a
                  key={i}
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-clay-300"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{entry.name}</div>
                    <div className="mt-0.5 text-xs text-stone-400">
                      {entry.store} · {new Date(entry.changedAt).toLocaleDateString("es-AR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-stone-400 line-through">${entry.previous.toLocaleString("es-AR")}</div>
                    <div className={`font-semibold ${isDrop ? "text-moss-600" : "text-red-600"}`}>
                      ${entry.current.toLocaleString("es-AR")}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
