import {
  tours,
  destinations,
  tourCategories,
  articles,
} from "../src/content/index";
import fs from "node:fs";
const missing = [];
for (const d of destinations)
  if (!d.image?.src) missing.push(["destination", d.id]);
for (const c of tourCategories)
  if (!c.image?.src) missing.push(["category", c.id]);
for (const t of tours)
  for (const [i, image] of t.images.entries())
    if (!image.src) missing.push(["tour", t.id, i, image.alt]);
for (const a of articles) {
  if (!a.cover?.src) missing.push(["article", a.id]);
  for (const block of a.body)
    if (block.type === "image" && !block.src)
      missing.push(["article-body", a.id, block.alt]);
}
const sources = [
  ...destinations.map((d) => d.image?.src),
  ...tourCategories.map((c) => c.image?.src),
  ...tours.flatMap((t) => t.images.map((i) => i.src)),
  ...articles.map((a) => a.cover?.src),
].filter(Boolean) as string[];
console.log(
  JSON.stringify(
    {
      destinations: destinations.length,
      categories: tourCategories.length,
      tours: tours.length,
      missing,
      broken: sources.filter((s) => !fs.existsSync("public" + s)),
    },
    null,
    2,
  ),
);
