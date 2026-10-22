import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAdminSearchItem,
  rankAdminSearch,
  type AdminSearchItem,
} from "../src/lib/admin-search";

function item(
  title: string,
  kind: AdminSearchItem["kind"] = "tours",
  extra: Partial<AdminSearchItem> = {},
): AdminSearchItem {
  return buildAdminSearchItem({
    kind,
    id: `id_${title}`,
    title,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    ...extra,
  });
}

test("search index folds Vietnamese accents for typing without diacritics", () => {
  const saPa = item("Sa Pa – Fansipan 3 ngày 2 đêm");
  assert.equal(
    rankAdminSearch([saPa], "sapa").length,
    1,
    "sapa should match Sa Pa",
  );
  assert.equal(
    rankAdminSearch([saPa], "fansipan").length,
    1,
    "fansipan should match",
  );
  assert.equal(rankAdminSearch([saPa], "da nang").length, 0);
});

test("matching prefers title prefixes over mid-string matches", () => {
  const groups = rankAdminSearch(
    [item("Tour miền Trung"), item("Đà Nẵng – Hội An – Huế"), item("Miền Trung di sản")],
    "mien trung",
  );
  assert.equal(groups.length, 1);
  const titles = groups[0].items.map((entry) => entry.title);
  assert.deepEqual(titles.slice(0, 2), ["Miền Trung di sản", "Tour miền Trung"]);
});

test("slug and subtitle matches are still returned after title matches", () => {
  const groups = rankAdminSearch(
    [
      buildAdminSearchItem({
        kind: "destinations",
        id: "dest_hon_kho",
        title: "Hòn Khô",
        subtitle: "Bình Định",
        slug: "hon-kho",
      }),
      buildAdminSearchItem({
        kind: "destinations",
        id: "dest_quy_nhon",
        title: "Quy Nhơn",
        subtitle: "Bình Định",
        slug: "quy-nhon",
      }),
    ],
    "binh dinh",
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 2);
});

test("results are grouped by content type with per-group and total limits", () => {
  const items = [
    ...Array.from({ length: 10 }, (_, index) => item(`Tour biển ${index}`, "tours")),
    ...Array.from({ length: 10 }, (_, index) => item(`Bài biển ${index}`, "articles")),
    item("Biển Quy Nhơn", "destinations"),
    item("Biển đảo", "categories"),
  ];
  const groups = rankAdminSearch(items, "bien", { perGroup: 3, total: 7 });
  assert.deepEqual(
    groups.map((group) => group.kind),
    ["tours", "articles", "destinations"],
  );
  assert.equal(groups[0].items.length, 3);
  assert.equal(groups[1].items.length, 3);
  assert.equal(groups[2].items.length, 1);
  assert.equal(
    groups.reduce((sum, group) => sum + group.items.length, 0),
    7,
  );
});

test("empty or whitespace-only queries do not dump the catalogue", () => {
  const items = [item("Sa Pa"), item("Phú Quốc")];
  assert.deepEqual(rankAdminSearch(items, ""), []);
  assert.deepEqual(rankAdminSearch(items, "   "), []);
});

test("item metadata keeps a readable title and a folded haystack", () => {
  const entry = buildAdminSearchItem({
    kind: "tours",
    id: "tour_1",
    title: "Đà Lạt 4 ngày 3 đêm",
    subtitle: "ST10 · 4 ngày 3 đêm",
    status: "published",
    aliases: ["Đồi thông", "Hồ Xuân Hương"],
  });
  assert.equal(entry.title, "Đà Lạt 4 ngày 3 đêm");
  assert.equal(entry.status, "published");
  assert.ok(entry.haystack.includes("da lat"));
  assert.ok(entry.haystack.includes("doi thong"));
  assert.ok(entry.haystack.includes("st10"));
});
