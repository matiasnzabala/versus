import fs from "fs";
import path from "path";
import data from "../data/products.json";
import ProductGrid from "./ProductGrid";

export default function Home() {
  const logPath = path.join(process.cwd(), "data", "price-log.json");
  const priceLog = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : [];

  const historyPath = path.join(process.cwd(), "data", "price-history.json");
  const priceHistory = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, "utf8")) : {};

  const matchesPath = path.join(process.cwd(), "data", "matches.json");
  const savedMatches = fs.existsSync(matchesPath) ? JSON.parse(fs.readFileSync(matchesPath, "utf8")) : {};

  return (
    <ProductGrid
      products={data.products}
      categories={data.categories}
      updatedAt={data.updatedAt}
      priceLog={priceLog}
      priceHistory={priceHistory}
      savedMatches={savedMatches}
    />
  );
}
