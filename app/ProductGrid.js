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
      // Migración del formato viejo (array de urls) al nuevo (objeto con notas).
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
    return (
      <PriceLogView priceLog={priceLog} onBack={() => setView("catalog")} />
    );
  }

  return (
    <div className="layout">
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { overflow-x: hidden; }
        .layout {
          display: flex;
          max-width: 1300px;
          margin: 0 auto;
        }
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          padding: 24px;
          border-right: 1px solid #e5e5e5;
          min-height: 100vh;
        }
        .main-content {
          flex: 1;
          min-width: 0;
          padding: 24px;
        }
        .table-wrap {
          overflow-x: auto;
        }
        @media (max-width: 768px) {
          .layout {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            min-height: auto;
            border-right: none;
            border-bottom: 1px solid #e5e5e5;
          }
        }
      `}</style>
      <aside className="sidebar">
        <button
          onClick={() => setView("log")}
          style={{ marginBottom: 20, fontSize: 13, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", cursor: "pointer" }}
        >
          Cambios de precio {priceLog.length > 0 && `(${priceLog.length})`}
        </button>

        <h2 style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>Categorías</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
          {usableCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: categoryId === c.id ? "#222" : "transparent",
                color: categoryId === c.id ? "#fff" : "#333",
                fontSize: 14,
              }}
            >
              {c.label}
            </button>
          ))}
        </nav>

        <h2 style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>Tiendas</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
          {allStores.map((store) => (
            <label key={store} style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={selectedStores.includes(store)}
                onChange={() => toggleStore(store)}
              />
              {store}
            </label>
          ))}
        </div>

        <h2 style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>Precio ({PAYMENT_LABELS[payment]})</h2>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <input
            type="number"
            placeholder="Mín"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{ width: "50%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
          />
          <input
            type="number"
            placeholder="Máx"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: "50%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </div>

        <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input type="checkbox" checked={hideOutOfStock} onChange={(e) => setHideOutOfStock(e.target.checked)} />
          Ocultar sin stock
        </label>

        <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} />
          Solo favoritos ({Object.keys(favorites).length})
        </label>

        {Object.keys(favorites).length > 0 && (
          <button
            onClick={shareFavorites}
            style={{ fontSize: 13, padding: "8px 10px", border: "none", borderRadius: 6, background: "#25D366", color: "#fff", cursor: "pointer", width: "100%" }}
          >
            Compartir favoritos (WhatsApp)
          </button>
        )}
      </aside>

      <main className="main-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 22 }}>
            {usableCategories.find((c) => c.id === categoryId)?.label ?? "Productos"}
          </h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4, width: 180 }}
            />
            <div>
              <label style={{ marginRight: 8, fontSize: 14, color: "#555" }}>Pago:</label>
              <select value={payment} onChange={(e) => setPayment(e.target.value)} style={{ padding: 6 }}>
                {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ marginRight: 8, fontSize: 14, color: "#555" }}>Orden:</label>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={{ padding: 6 }}>
                <option value="asc">Precio: menor a mayor</option>
                <option value="desc">Precio: mayor a menor</option>
              </select>
            </div>
            <div style={{ display: "flex", border: "1px solid #ccc", borderRadius: 4, overflow: "hidden" }}>
              <button
                onClick={() => setLayout("grid")}
                style={{ padding: "6px 10px", border: "none", cursor: "pointer", background: layout === "grid" ? "#222" : "#fff", color: layout === "grid" ? "#fff" : "#333" }}
              >
                Grilla
              </button>
              <button
                onClick={() => setLayout("table")}
                style={{ padding: "6px 10px", border: "none", cursor: "pointer", background: layout === "table" ? "#222" : "#fff", color: layout === "table" ? "#fff" : "#333" }}
              >
                Tabla
              </button>
            </div>
          </div>
        </div>

        {updatedAt && (
          <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            Actualizado: {new Date(updatedAt).toLocaleString("es-AR")} · {filtered.length} productos
          </p>
        )}

        {layout === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
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
          <div className="table-wrap">
          <table style={{ width: "100%", minWidth: 500, borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e5e5" }}>
                <th style={{ padding: 8 }}></th>
                <th style={{ padding: 8 }}></th>
                <th style={{ padding: 8 }}></th>
                <th style={{ padding: 8 }}>Producto</th>
                <th style={{ padding: 8 }}>Tienda</th>
                <th style={{ padding: 8 }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const effectivePrice = p.prices[payment];
                const isBest = p.url === bestPriceUrl;
                const isFavorite = !!favorites[p.url];
                const isComparing = compareUrls.includes(p.url);
                return (
                  <tr key={p.url} style={{ borderBottom: "1px solid #eee", background: isBest ? "#fffbea" : "transparent" }}>
                    <td style={{ padding: 8 }}>
                      <input
                        type="checkbox"
                        checked={isComparing}
                        disabled={!isComparing && compareUrls.length >= MAX_COMPARE}
                        onChange={() => toggleCompare(p.url)}
                        title="Comparar"
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => toggleFavorite(p.url)}
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16 }}
                      >
                        {isFavorite ? "⭐" : "☆"}
                      </button>
                    </td>
                    <td style={{ padding: 8 }}>
                      <img src={p.image} alt={p.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} />
                    </td>
                    <td style={{ padding: 8 }}>
                      <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                        {p.name} {isBest && <span style={{ fontSize: 11, color: "#b8860b" }}>★ mejor precio</span>}
                        {p.inStock === false && <span style={{ fontSize: 11, color: "#c92a2a" }}> · sin stock</span>}
                      </a>
                      <PriceChangeBadge change={p.priceChange} />
                    </td>
                    <td style={{ padding: 8, color: "#666" }}>{p.store}</td>
                    <td style={{ padding: 8, fontWeight: 700 }}>${effectivePrice.toLocaleString("es-AR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </main>

      {compareUrls.length >= 2 && (
        <button
          onClick={() => setShowCompare(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            borderRadius: 24,
            border: "none",
            background: "#222",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
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

function ProductCard({ p, payment, isBest, favorite, onToggleFavorite, onSetNote, isComparing, compareDisabled, onToggleCompare }) {
  const effectivePrice = p.prices[payment];
  const hasDiscount = effectivePrice !== p.price;

  return (
    <div
      style={{
        position: "relative",
        border: isBest ? "2px solid #f0c419" : "1px solid #e5e5e5",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        opacity: p.inStock === false ? 0.6 : 1,
      }}
    >
      <label
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1,
          background: "rgba(255,255,255,0.9)",
          borderRadius: 4,
          padding: "2px 6px",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 4,
          cursor: compareDisabled ? "not-allowed" : "pointer",
        }}
      >
        <input type="checkbox" checked={isComparing} disabled={compareDisabled} onChange={onToggleCompare} />
        comparar
      </label>

      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite();
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          border: "none",
          background: "rgba(255,255,255,0.9)",
          borderRadius: "50%",
          width: 28,
          height: 28,
          cursor: "pointer",
          fontSize: 15,
          zIndex: 1,
        }}
      >
        {favorite ? "⭐" : "☆"}
      </button>
      {isBest && (
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 8,
            background: "#f0c419",
            color: "#222",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 12,
            zIndex: 1,
          }}
        >
          MEJOR PRECIO
        </div>
      )}
      <a href={p.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
        <img
          src={p.image}
          alt={p.name}
          style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
        />
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>{p.store}</div>
          <div style={{ fontSize: 14, fontWeight: 600, margin: "4px 0" }}>
            {p.name}
            {p.inStock === false && <span style={{ fontSize: 11, color: "#c92a2a" }}> (sin stock)</span>}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            ${effectivePrice.toLocaleString("es-AR")}
          </div>
          {hasDiscount && (
            <div style={{ fontSize: 12, color: "#999", textDecoration: "line-through" }}>
              ${p.price.toLocaleString("es-AR")}
            </div>
          )}
          <PriceChangeBadge change={p.priceChange} />
        </div>
      </a>
      {favorite && (
        <div style={{ padding: "0 12px 12px" }}>
          <input
            type="text"
            placeholder="Agregar nota..."
            defaultValue={favorite.note}
            onClick={(e) => e.preventDefault()}
            onBlur={(e) => onSetNote(e.target.value)}
            style={{ width: "100%", fontSize: 12, padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </div>
      )}
    </div>
  );
}

function PriceChangeBadge({ change }) {
  if (!change) return null;
  const isDrop = change.current < change.previous;
  const diff = Math.abs(change.current - change.previous);
  return (
    <div
      style={{
        marginTop: 4,
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 4,
        background: isDrop ? "#e6f6ea" : "#fdeaea",
        color: isDrop ? "#1a7f37" : "#c92a2a",
      }}
    >
      {isDrop ? "▼" : "▲"} ${diff.toLocaleString("es-AR")} desde ${change.previous.toLocaleString("es-AR")}
    </div>
  );
}

function CompareModal({ products, payment, onRemove, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 24,
          maxWidth: 900,
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Comparar productos</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${products.length}, 1fr)`, gap: 16 }}>
          {products.map((p) => (
            <div key={p.url} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
              <button
                onClick={() => onRemove(p.url)}
                style={{ float: "right", border: "none", background: "none", cursor: "pointer", fontSize: 14 }}
              >
                ✕
              </button>
              <img src={p.image} alt={p.name} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>{p.store}</div>
              <div style={{ fontWeight: 600, fontSize: 14, margin: "4px 0" }}>{p.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                ${p.prices[payment].toLocaleString("es-AR")}
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0070f3" }}>
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <button onClick={onBack} style={{ marginBottom: 16, border: "1px solid #ccc", borderRadius: 6, padding: "6px 10px", background: "#fff", cursor: "pointer" }}>
        ← Volver al catálogo
      </button>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Cambios de precio</h1>
      {priceLog.length === 0 ? (
        <p style={{ color: "#888" }}>Todavía no se registraron cambios de precio. Se van a ir agregando cada vez que corras el scraper.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {priceLog.map((entry, i) => {
            const isDrop = entry.current < entry.previous;
            return (
              <a
                key={i}
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  border: "1px solid #eee",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    {entry.store} · {new Date(entry.changedAt).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#999", textDecoration: "line-through" }}>
                    ${entry.previous.toLocaleString("es-AR")}
                  </div>
                  <div style={{ fontWeight: 700, color: isDrop ? "#1a7f37" : "#c92a2a" }}>
                    ${entry.current.toLocaleString("es-AR")}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
