"use client";

import { useEffect, useMemo, useState } from "react";

const PAYMENT_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

const FAVORITES_KEY = "versus_favorites_v2";
const MAX_COMPARE = 3;

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

export default function ProductGrid({ products, categories, updatedAt, priceLog }) {
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
  const [sortDir, setSortDir] = useState("asc");
  const [payment, setPayment] = useState("efectivo");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [layout, setLayout] = useState("grid");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [compareUrls, setCompareUrls] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setFavorites(loadFavorites());
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
      return true;
    });

    list.sort((a, b) => {
      const pa = a.prices[payment];
      const pb = b.prices[payment];
      return sortDir === "asc" ? pa - pb : pb - pa;
    });
    return list;
  }, [products, categoryId, selectedStores, sortDir, payment, search, minPrice, maxPrice, onlyFavorites, favorites, hideOutOfStock]);

  const bestPriceUrl = filtered[0]?.url;
  const compareProducts = compareUrls.map((url) => products.find((p) => p.url === url)).filter(Boolean);
  const favoriteCount = Object.keys(favorites).length;

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

  if (view === "log") {
    return <PriceLogView priceLog={priceLog} onBack={() => setView("catalog")} />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header
        search={search}
        setSearch={setSearch}
        payment={payment}
        setPayment={setPayment}
        sortDir={sortDir}
        setSortDir={setSortDir}
        layout={layout}
        setLayout={setLayout}
        onShowLog={() => setView("log")}
        logCount={priceLog.length}
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
          favoriteCount={favoriteCount}
          shareFavorites={shareFavorites}
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
    </div>
  );
}

function Header({ search, setSearch, payment, setPayment, sortDir, setSortDir, layout, setLayout, onShowLog, logCount, onToggleFilters }) {
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

        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-clay-500">
          <option value="asc">Menor a mayor</option>
          <option value="desc">Mayor a menor</option>
        </select>

        <div className="hidden items-center rounded-full border border-stone-300 bg-white p-1 sm:flex">
          <button onClick={() => setLayout("grid")} className={`rounded-full px-3 py-1.5 text-sm transition ${layout === "grid" ? "bg-ink text-white" : "text-stone-500"}`}>Grilla</button>
          <button onClick={() => setLayout("table")} className={`rounded-full px-3 py-1.5 text-sm transition ${layout === "table" ? "bg-ink text-white" : "text-stone-500"}`}>Tabla</button>
        </div>

        <button onClick={onShowLog} className="ml-auto flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-600 hover:border-clay-500 hover:text-clay-600">
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
  hideOutOfStock, setHideOutOfStock, onlyFavorites, setOnlyFavorites, favoriteCount, shareFavorites,
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

function ProductCard({ p, payment, isBest, favorite, onToggleFavorite, onSetNote, isComparing, compareDisabled, onToggleCompare }) {
  const effectivePrice = p.prices[payment];
  const hasDiscount = effectivePrice !== p.price;

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
          </div>
          <PriceChangeBadge change={p.priceChange} />
        </div>
      </a>

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

function TableView({ filtered, payment, bestPriceUrl, favorites, toggleFavorite, compareUrls, toggleCompare }) {
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
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const effectivePrice = p.prices[payment];
            const isBest = p.url === bestPriceUrl;
            const isFavorite = !!favorites[p.url];
            const isComparing = compareUrls.includes(p.url);
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
                </td>
                <td className="p-3 text-stone-500">{p.store}</td>
                <td className="p-3 font-semibold text-ink">${effectivePrice.toLocaleString("es-AR")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
