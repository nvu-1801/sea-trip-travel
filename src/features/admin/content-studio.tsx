"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Editor, type EditorValue, type ReferenceOptions } from "./editor";
import { EditorModal } from "./editor-modal";
import { HeroEditor } from "./hero-editor";
import { MediaUploadContext } from "./media-field";
import type { HeroConfig } from "@/domain/home-hero";
import { contentPageSchema } from "@/domain/page";
import { useContentUpdates } from "@/lib/use-content-updates";
import "./content-studio.css";

type Data = Record<string, EditorValue>;
type Row = {
  id: string;
  data: Data;
  revision: number;
  state: string;
  updated_at: string;
  collection: string;
};
type Part = {
  collection: string;
  id: string;
  path: string[];
  label: string;
  kind?: string;
};
type Edit = { title: string; parts: Part[]; records: Row[]; original: Row[] };
const contentTabs = [
  "home",
  "tours",
  "articles",
  "categories",
  "destinations",
  "pages",
  "chrome",
  "settings",
  "messages",
];
export const isStudioTab = (tab: string) => contentTabs.includes(tab);
const sections = [
  [
    "hero",
    "Ảnh lớn đầu trang",
    "Ảnh ghép hoặc trình chiếu, tiêu đề, lời giới thiệu và nút bấm.",
  ],
  [
    "finder",
    "Tìm chuyến đi",
    "Tiêu đề, gợi ý điểm đến và hướng dẫn chọn hành trình.",
  ],
  [
    "explore",
    "Khám phá điểm đến",
    "Tiêu đề và mô tả; ảnh các điểm đến sửa tại mục Điểm đến.",
  ],
  [
    "featured",
    "Tour nổi bật",
    "Chọn tour và thứ tự; tên, ảnh, giá lấy từ Tour du lịch.",
  ],
  [
    "trust",
    "Cam kết dịch vụ",
    "Các biểu tượng và nội dung cam kết bên dưới tour nổi bật.",
  ],
  [
    "story",
    "Chọn hành trình theo số ngày",
    "Ảnh nền, tiêu đề và các thẻ gợi ý 1 ngày, 2 ngày, 4+ ngày.",
  ],
  [
    "regions",
    "Du lịch theo vùng miền",
    "Tiêu đề và lời giới thiệu; thông tin từng vùng sửa tại Danh mục tour.",
  ],
  [
    "values",
    "Vì sao chọn SEA TRIP",
    "Ảnh minh họa, các giá trị và lời mời liên hệ.",
  ],
  [
    "guides",
    "Cẩm nang nổi bật",
    "Tiêu đề và bài viết được ghim; nội dung bài sửa tại Cẩm nang du lịch.",
  ],
  [
    "planning",
    "Câu hỏi thường gặp",
    "Câu hỏi, trả lời và các bước chuẩn bị trước chuyến đi.",
  ],
  [
    "consult",
    "Mời khách gửi yêu cầu tư vấn",
    "Tiêu đề và lời giới thiệu biểu mẫu ở cuối trang chủ.",
  ],
] as const;
const get = (data: EditorValue, path: string[]): EditorValue =>
  path.reduce<EditorValue>(
    (value, key) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? (value[key] ?? "")
        : "",
    data,
  );
function put(data: Data, path: string[], value: EditorValue): Data {
  if (!path.length) return value as Data;
  const [key, ...rest] = path;
  return {
    ...data,
    [key]: rest.length ? put((data[key] ?? {}) as Data, rest, value) : value,
  };
}
const part = (
  collection: string,
  id: string,
  label: string,
  path: string[] = [],
  kind?: string,
): Part => ({ collection, id, label, path, kind });
const rowTitle = (row: Row) =>
  String(
    row.data.title ??
      row.data.name ??
      (row.id === "site"
        ? "Thông tin doanh nghiệp & liên hệ"
        : row.id === "vi"
          ? "Tiếng Việt"
          : row.id === "en"
            ? "English"
            : row.id),
  );
function recordParts(row: Row): Part[] {
  const groups: Record<string, [string, string[]][]> = {
    tours: [
      [
        "Thông tin chung",
        [
          "title",
          "tourCode",
          "summary",
          "duration",
          "categoryIds",
          "destinationIds",
          "departurePoints",
          "returnPoints",
          "transport",
          "tags",
        ],
      ],
      ["Hình ảnh", ["images"]],
      ["Lịch trình", ["overview", "itinerary", "highlights"]],
      [
        "Giá & dịch vụ",
        [
          "priceFrom",
          "pricingOptions",
          "priceNote",
          "included",
          "excluded",
          "gifts",
        ],
      ],
      ["Lưu ý & chính sách", ["notes", "policies"]],
      ["English", ["_en", "_enReviewed"]],
      ["Hiển thị & tìm kiếm", ["seo", "featured", "contentStatus", "slug"]],
    ],
    articles: [
      [
        "Thông tin chung",
        ["title", "excerpt", "author", "publishedAt", "readingMinutes", "tags"],
      ],
      ["Ảnh bìa", ["cover"]],
      ["Nội dung bài viết", ["body"]],
      [
        "Liên kết & tìm kiếm",
        [
          "destinationIds",
          "relatedTourSlugs",
          "featured",
          "seo",
          "contentStatus",
          "slug",
        ],
      ],
      ["English", ["_en", "_enReviewed"]],
    ],
    pages: [
      ["Thông tin chung", ["title", "summary", "slug"]],
      ["Ảnh bìa", ["cover"]],
      ["Nội dung trang", ["body"]],
      ["English", ["titleEn", "summaryEn", "bodyEn", "translationReviewed"]],
      ["Tìm kiếm", ["seo"]],
    ],
    categories: [
      [
        "Thông tin chung",
        ["name", "description", "tagline", "parentId", "region", "order"],
      ],
      ["Hình ảnh", ["image", "cover"]],
      ["Hiển thị & tìm kiếm", ["seo", "path", "slug", "contentStatus"]],
      ["English", ["_en", "_enReviewed"]],
    ],
    destinations: [
      ["Thông tin chung", ["name", "summary", "province", "region"]],
      ["Hình ảnh", ["image", "cover", "images"]],
      ["Hiển thị & tìm kiếm", ["seo", "slug", "order", "contentStatus"]],
      ["English", ["_en", "_enReviewed"]],
    ],
    settings: [
      ["Tên & thương hiệu", ["name", "logoSrc"]],
      ["Thông tin liên hệ", ["contact"]],
      ["Liên kết cuối trang", ["footerLinks", "socialLinks"]],
      ["Chuyển động", ["motion"]],
    ],
  };
  const defined = groups[row.collection];
  if (!defined)
    return Object.keys(row.data)
      .filter((key) => key !== "id")
      .map((key) => part(row.collection, row.id, key, [key]));
  return defined.map(([label, fields]) => ({
    ...part(row.collection, row.id, label),
    kind: fields.join(","),
  }));
}
export function ContentStudio({
  tab,
  csrf,
  onDirty,
  onUnauthorized,
}: {
  tab: string;
  csrf: string;
  onDirty: (dirty: boolean) => void;
  onUnauthorized: () => void;
}) {
  const [records, setRecords] = useState<Row[]>([]),
    [references, setReferences] = useState<ReferenceOptions>({});
  const [edit, setEdit] = useState<Edit | null>(null),
    [activePart, setActivePart] = useState(0);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [uploads, setUploads] = useState(0),
    [updates, setUpdates] = useState(false);
  const requestSerial = useRef(0),
    mounted = useRef(true),
    saveLock = useRef(false);
  const dirty = Boolean(
    edit && JSON.stringify(edit.records) !== JSON.stringify(edit.original),
  );
  const callbacks = useRef({ onDirty, onUnauthorized });
  useEffect(() => {
    callbacks.current = { onDirty, onUnauthorized };
  }, [onDirty, onUnauthorized]);
  useEffect(() => {
    callbacks.current.onDirty(dirty || uploads > 0);
  }, [dirty, uploads]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      callbacks.current.onDirty(false);
    };
  }, []);
  const api = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const response = await fetch(`/api/admin/${url}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
          ...init.headers,
        },
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 401) callbacks.current.onUnauthorized();
        throw new Error(
          body.error ?? "Không thực hiện được. Vui lòng thử lại.",
        );
      }
      return body;
    },
    [csrf],
  );
  const load = useCallback(async () => {
    const serial = ++requestSerial.current;
    try {
      const collections =
        tab === "home"
          ? ["hero", "landing", "messages"]
          : tab === "chrome"
            ? ["settings", "messages"]
            : tab === "pages"
              ? ["pages", "messages"]
              : tab === "settings"
                ? ["settings", "messages"]
                : [tab];
      const [rows, options, library] = await Promise.all([
        Promise.all(
          collections.map((collection) =>
            api(`content/${collection}`).then((rows: Row[]) =>
              rows.map((row) => ({ ...row, collection })),
            ),
          ),
        ),
        api("options"),
        api("media"),
      ]);
      if (!mounted.current || serial !== requestSerial.current) return false;
      setRecords(rows.flat());
      setReferences({
        ...options,
        media: library.map((item: { src: string; alt: string }) => ({
          value: item.src,
          label: item.alt,
        })),
      });
      setUpdates(false);
      return true;
    } catch (error) {
      if (mounted.current && serial === requestSerial.current)
        setError(
          error instanceof Error ? error.message : "Không tải được nội dung.",
        );
      return false;
    } finally {
      if (mounted.current && serial === requestSerial.current)
        setLoading(false);
    }
  }, [api, tab]);
  useEffect(() => {
    queueMicrotask(() => {
      if (mounted.current) void load();
    });
  }, [load]);
  useContentUpdates({
    enabled: true,
    url: "/api/admin/changes",
    onChange: () => {
      if (busy || uploads > 0 || edit) {
        setUpdates(true);
        return false;
      }
      return load();
    },
    onUnauthorized: () => callbacks.current.onUnauthorized(),
  });
  function open(title: string, parts: Part[]) {
    const found = records.filter((row) =>
      parts.some((p) => p.collection === row.collection && p.id === row.id),
    );
    if (!found.length) {
      setError("Dữ liệu chưa sẵn sàng. Bấm tải lại để thử lại.");
      return;
    }
    setActivePart(0);
    setError("");
    setEdit({
      title,
      parts,
      records: structuredClone(found),
      original: structuredClone(found),
    });
  }
  function close() {
    if (busy || uploads) return;
    if (!dirty || confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi và đóng?")) {
      setEdit(null);
      setError("");
    }
  }
  function change(p: Part, value: EditorValue) {
    setEdit(
      (old) =>
        old && {
          ...old,
          records: old.records.map((row) =>
            row.collection === p.collection && row.id === p.id
              ? { ...row, data: put(row.data, p.path, value) }
              : row,
          ),
        },
    );
  }
  async function save(action: "save" | "publish" | "unpublish") {
    if (!edit || saveLock.current || uploads) return;
    saveLock.current = true;
    setBusy(true);
    setError("");
    try {
      const changed = edit.records.filter(
        (row) =>
          action !== "save" ||
          row.revision === 0 ||
          JSON.stringify(row.data) !==
            JSON.stringify(
              edit.original.find(
                (old) => old.collection === row.collection && old.id === row.id,
              )?.data,
            ),
      );
      if (!changed.length) {
        setNotice("Chưa có thay đổi mới.");
        return;
      }
      await api("batch", {
        method: "POST",
        body: JSON.stringify(
          changed.map((row) => ({
            collection: row.collection,
            data: row.data,
            revision: row.revision,
            action,
            paths: ["landing", "settings", "messages"].includes(row.collection)
              ? edit.parts
                  .filter(
                    (part) =>
                      part.collection === row.collection && part.id === row.id,
                  )
                  .flatMap((part) =>
                    part.kind && !["hero", "section-order"].includes(part.kind)
                      ? part.kind.split(",").map((key) => [key])
                      : [part.path],
                  )
              : undefined,
          })),
        ),
      });
      setEdit(null);
      setNotice(
        action === "publish"
          ? "Đã xuất bản. Website sẽ cập nhật nội dung mới."
          : action === "unpublish"
            ? "Đã ẩn nội dung khỏi website."
            : "Đã lưu bản nháp. Website giữ nguyên nội dung đã xuất bản.",
      );
      await load();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không lưu được nội dung.",
      );
    } finally {
      setBusy(false);
      saveLock.current = false;
    }
  }
  async function lifecycle(row: Row) {
    if (saveLock.current) return;
    const action = row.state === "deleted" ? "restore" : "delete";
    if (
      !confirm(
        action === "delete"
          ? "Chuyển nội dung vào thùng rác?"
          : "Khôi phục thành bản nháp?",
      )
    )
      return;
    saveLock.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`content/${row.collection}`, {
        method: "POST",
        body: JSON.stringify({
          data: row.data,
          revision: row.revision,
          action,
        }),
      });
      await load();
      setNotice(
        action === "delete"
          ? "Đã chuyển vào thùng rác."
          : "Đã khôi phục bản nháp.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thực hiện được.",
      );
    } finally {
      setBusy(false);
      saveLock.current = false;
    }
  }
  function create() {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
    let data: Data;
    if (tab === "pages")
      data = contentPageSchema.parse({
        id: `page_${suffix}`,
        slug: `trang-${suffix}`,
        title: "Trang nội dung mới",
      }) as unknown as Data;
    else {
      const template =
        records.find(
          (row) => row.collection === tab && row.state !== "deleted",
        ) ?? records.find((row) => row.collection === tab);
      if (!template) {
        setError("Chưa có bản mẫu cho loại nội dung này.");
        return;
      }
      data = structuredClone(template.data);
      data.id = `${{ tours: "tour", articles: "art", categories: "cat", destinations: "dest" }[tab]}_${suffix}`;
      data.slug = `noi-dung-${suffix}`;
      if ("path" in data) data.path = `/danh-muc/${data.slug}`;
      if ("title" in data) data.title = "Nội dung mới";
      if ("name" in data) data.name = "Nội dung mới";
      delete data._en;
      delete data._enReviewed;
      delete data.seo;
      if (tab === "tours") {
        data.images = [];
        data.priceFrom = null;
        data.pricingOptions = [];
        data.sourceDocuments = [];
      }
      if (tab === "articles") {
        data.body = [];
        delete data.cover;
        data.publishedAt = new Date().toISOString().slice(0, 10);
      }
      if ("contentStatus" in data) data.contentStatus = "demo";
    }
    const row: Row = {
      collection: tab,
      id: String(data.id),
      data,
      state: "draft",
      revision: 0,
      updated_at: "",
    };
    setActivePart(0);
    setError("");
    setEdit({
      title: tab === "pages" ? "Thêm trang nội dung" : "Thêm nội dung mới",
      parts: recordParts(row),
      records: [row],
      original: [],
    });
  }
  const copyPart = (path: string[], label: string) => [
    part("messages", "vi", `${label} · Tiếng Việt`, path),
    part("messages", "en", `${label} · English`, path),
  ];
  const home = records.find((row) => row.collection === "landing");
  const orderedSections = (
    Array.isArray(home?.data.sectionOrder)
      ? home.data.sectionOrder
      : sections.map((section) => section[0])
  ).flatMap((key) => sections.filter((section) => section[0] === key));
  const selectedPart = edit?.parts[activePart];
  const currentRow = edit?.records.find(
    (row) =>
      row.collection === selectedPart?.collection &&
      row.id === selectedPart?.id,
  );
  const lifecycleAllowed =
    edit?.records.length === 1 &&
    ["tours", "articles", "categories", "destinations", "pages"].includes(
      edit.records[0].collection,
    );
  function homeParts(key: string): Part[] {
    const display = part("landing", "home-sections", "Hiển thị", [
      "display",
      key,
    ]);
    if (key === "hero")
      return [part("hero", "home", "Ảnh & nội dung", [], "hero"), display];
    const parts: Part[] = [];
    if (home?.data[key])
      parts.push(
        part("landing", "home-sections", "Nội dung & danh sách", [key]),
      );
    if (!["story", "planning", "trust", "explore", "regions"].includes(key))
      parts.push(...copyPart(["home", key], "Tiêu đề & nút bấm"));
    if (["explore", "featured", "regions", "values", "guides"].includes(key))
      parts.push(
        part("landing", "home-sections", "Liên kết nút", ["links", key]),
      );
    return [...parts, display];
  }
  const rows = records.filter(
    (row) =>
      row.collection === tab &&
      (filter === "all" ? row.state !== "deleted" : row.state === filter) &&
      JSON.stringify(row.data)
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <div className="adm-studio">
      <div className="adm-studio-heading">
        <div>
          <span className="adm-eyebrow">Nội dung website</span>
          <h2>
            {tab === "home"
              ? "Bạn muốn thay đổi phần nào trên trang chủ?"
              : tab === "chrome"
                ? "Đầu trang & menu"
                : tab === "settings"
                  ? "Chân trang & thông tin liên hệ"
                  : tab === "pages"
                    ? "Các trang nội dung"
                    : "Quản lý nội dung"}
          </h2>
          <p>
            Chọn đúng vị trí trên website để sửa. Lưu nháp trước, xuất bản khi
            đã sẵn sàng.
          </p>
        </div>
        <button
          disabled={busy || Boolean(edit)}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Tải lại
        </button>
      </div>
      {error && !edit && (
        <p className="adm-field-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="adm-notice" role="status">
          {notice}
        </p>
      )}
      {updates && !edit && (
        <div className="adm-notice" role="status">
          Dữ liệu đã thay đổi ở phiên khác. Thay đổi đang nhập được giữ lại.
          <button
            disabled={busy || uploads > 0}
            onClick={() => {
              if (
                !dirty ||
                confirm("Tải cập nhật sẽ bỏ thay đổi chưa lưu. Tiếp tục?")
              ) {
                setEdit(null);
                void load();
              }
            }}
          >
            Tải cập nhật
          </button>
        </div>
      )}
      {tab === "home" && !loading && (
        <button
          onClick={() =>
            open("Thứ tự các phần trang chủ", [
              part(
                "landing",
                "home-sections",
                "Sắp xếp các phần",
                ["sectionOrder"],
                "section-order",
              ),
            ])
          }
        >
          ↕ Sắp xếp các phần trang chủ
        </button>
      )}
      {loading ? (
        <p className="adm-empty" role="status">
          Đang tải nội dung…
        </p>
      ) : tab === "home" ? (
        <div className="adm-section-grid">
          {orderedSections.map(([key, title, description], index) => (
            <article key={key}>
              <span className="adm-section-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="adm-badge">
                {(home?.data.display as Data)?.[key] === false
                  ? "Thiết lập: ẩn"
                  : "Thiết lập: hiển thị"}
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
              <button onClick={() => open(title, homeParts(key))}>
                Chỉnh sửa phần này ↗
              </button>
            </article>
          ))}
        </div>
      ) : tab === "chrome" || tab === "settings" ? (
        <div className="adm-section-grid">
          {tab === "chrome" ? (
            <>
              <article>
                <h3>Logo & tên thương hiệu</h3>
                <p>Thay logo, tên hiển thị trên đầu và cuối website.</p>
                <button
                  onClick={() =>
                    open("Logo & thương hiệu", [
                      part(
                        "settings",
                        "site",
                        "Thương hiệu",
                        [],
                        "name,logoSrc",
                      ),
                    ])
                  }
                >
                  Chỉnh sửa
                </button>
              </article>
              <article>
                <h3>Nhãn menu & nút đầu trang</h3>
                <p>Nhãn menu tiếng Việt / English và nội dung nút bấm.</p>
                <button
                  onClick={() =>
                    open("Menu đầu trang", [
                      part("settings", "site", "Menu & liên kết", [
                        "navigation",
                      ]),
                      ...copyPart(["header"], "Đầu trang"),
                    ])
                  }
                >
                  Chỉnh sửa
                </button>
              </article>
            </>
          ) : (
            <>
              <article>
                <h3>Doanh nghiệp & liên hệ</h3>
                <p>
                  Số điện thoại, email, địa chỉ, giờ làm việc, mạng xã hội và
                  liên kết.
                </p>
                <button
                  onClick={() => {
                    const row = records.find(
                      (row) => row.collection === "settings",
                    );
                    if (row) open(rowTitle(row), recordParts(row));
                  }}
                >
                  Chỉnh sửa
                </button>
              </article>
              <article>
                <h3>Nội dung chân trang</h3>
                <p>
                  Lời giới thiệu, tên các nhóm liên kết và thông tin cuối trang.
                </p>
                <button
                  onClick={() =>
                    open(
                      "Nội dung chân trang",
                      copyPart(["footer"], "Chân trang"),
                    )
                  }
                >
                  Chỉnh sửa
                </button>
              </article>
            </>
          )}
        </div>
      ) : (
        <>
          {tab === "pages" && (
            <div className="adm-section-grid adm-page-shortcuts">
              <article>
                <h3>Trang liên hệ</h3>
                <p>
                  Tiêu đề, giới thiệu, nhãn biểu mẫu và thông báo gửi yêu cầu.
                </p>
                <button
                  onClick={() =>
                    open("Trang liên hệ", [
                      ...copyPart(["contact"], "Nội dung trang"),
                      ...copyPart(["lead"], "Biểu mẫu"),
                    ])
                  }
                >
                  Chỉnh sửa
                </button>
              </article>
              <article>
                <h3>Các trang danh sách</h3>
                <p>Tiêu đề, mô tả, bộ lọc của cẩm nang và trang tìm tour.</p>
                <button
                  onClick={() =>
                    open("Trang danh sách", [
                      ...copyPart(["guides"], "Cẩm nang"),
                      ...copyPart(["tourExplorer"], "Tìm tour"),
                    ])
                  }
                >
                  Chỉnh sửa
                </button>
              </article>
            </div>
          )}
          <div className="adm-toolbar">
            <input
              aria-label="Tìm nội dung"
              placeholder="Tìm theo tên, mô tả…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Trạng thái nội dung"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Tất cả nội dung</option>
              <option value="published">Đang xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="deleted">Thùng rác</option>
            </select>
            {tab !== "messages" && (
              <button className="adm-primary" disabled={busy} onClick={create}>
                ＋ Thêm mới
              </button>
            )}
          </div>
          <div className="adm-records">
            {rows.map((row) => {
              const image = (row.data.cover ??
                row.data.image ??
                (Array.isArray(row.data.images)
                  ? row.data.images[0]
                  : null)) as Data | undefined;
              return (
                <article key={row.id}>
                  {typeof image?.src === "string" && image.src ? (
                    <Image
                      unoptimized
                      className="adm-record-thumb"
                      src={image.src}
                      alt=""
                      width={100}
                      height={76}
                    />
                  ) : (
                    <div className="adm-record-mark">◈</div>
                  )}
                  <div className="adm-record-copy">
                    <span className={`adm-badge ${row.state}`}>
                      {row.state === "published"
                        ? "Đang xuất bản"
                        : row.state === "deleted"
                          ? "Thùng rác"
                          : "Bản nháp"}
                    </span>
                    <h3>{rowTitle(row)}</h3>
                    <p>
                      {String(
                        row.data.summary ??
                          row.data.excerpt ??
                          row.data.description ??
                          "",
                      ).slice(0, 160)}
                    </p>
                    <small>
                      {row.collection === "pages"
                        ? row.data.slug === "chinh-sach-bao-mat"
                          ? "/chinh-sach-bao-mat"
                          : `/trang/${row.data.slug}`
                        : String(row.data.path ?? row.data.slug ?? "")}
                    </small>
                  </div>
                  <div className="adm-record-actions">
                    <button
                      disabled={busy}
                      onClick={() => open(rowTitle(row), recordParts(row))}
                    >
                      Chỉnh sửa ↗
                    </button>
                    {tab !== "messages" && (
                      <button
                        disabled={busy}
                        onClick={() => void lifecycle(row)}
                      >
                        {row.state === "deleted" ? "Khôi phục" : "Thùng rác"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!rows.length && (
            <p className="adm-empty">
              Chưa có nội dung phù hợp. Thử đổi bộ lọc hoặc thêm nội dung mới.
            </p>
          )}
        </>
      )}
      {edit && selectedPart && currentRow && (
        <MediaUploadContext.Provider
          value={{
            csrf,
            onUploaded: (item) =>
              setReferences((old) => ({
                ...old,
                media: [
                  { value: item.src, label: item.alt },
                  ...(old.media ?? []),
                ],
              })),
            onBusy: (value) =>
              setUploads((old) => Math.max(0, old + (value ? 1 : -1))),
          }}
        >
          <EditorModal
            title={edit.title}
            busy={busy || uploads > 0}
            onClose={close}
            footer={
              <>
                <span>
                  {uploads
                    ? "Đang tải ảnh…"
                    : dirty
                      ? "Có thay đổi chưa lưu"
                      : "Nội dung đã tải"}
                </span>
                <button disabled={busy || uploads > 0} onClick={close}>
                  Đóng
                </button>
                {lifecycleAllowed && currentRow.revision > 0 && (
                  <button
                    disabled={busy || uploads > 0}
                    onClick={() => void save("unpublish")}
                  >
                    Ẩn khỏi website
                  </button>
                )}
                <button
                  disabled={busy || uploads > 0}
                  onClick={() => void save("save")}
                >
                  Lưu bản nháp
                </button>
                <button
                  className="adm-primary"
                  disabled={busy || uploads > 0}
                  onClick={() => void save("publish")}
                >
                  {busy ? "Đang lưu…" : "Xuất bản"}
                </button>
              </>
            }
          >
            {updates && (
              <div className="adm-notice" role="status">
                Nội dung đã thay đổi ở phiên khác.
                <button
                  disabled={busy || uploads > 0}
                  onClick={() => {
                    if (
                      !dirty ||
                      confirm("Tải cập nhật sẽ bỏ thay đổi chưa lưu. Tiếp tục?")
                    ) {
                      setEdit(null);
                      void load();
                    }
                  }}
                >
                  Tải cập nhật
                </button>
              </div>
            )}
            {error && (
              <p className="adm-field-error" role="alert">
                Chưa lưu được: {error}. Nội dung bạn nhập vẫn được giữ. Nếu
                phiên bản đã đổi, đóng và tải lại trước khi sửa tiếp.
              </p>
            )}
            <div className="adm-edit-layout">
              <nav aria-label="Nhóm thông tin">
                {edit.parts.map((p, index) => (
                  <button
                    key={index}
                    disabled={busy || uploads > 0}
                    aria-current={activePart === index ? "step" : undefined}
                    onClick={() => setActivePart(index)}
                  >
                    {p.label}
                  </button>
                ))}
              </nav>
              <fieldset
                disabled={busy || uploads > 0}
                className="adm-edit-fields"
                key={`${selectedPart.collection}:${selectedPart.id}:${activePart}`}
              >
                <legend>{selectedPart.label}</legend>
                {selectedPart.kind === "section-order" ? (
                  <div>
                    {(get(currentRow.data, ["sectionOrder"]) as string[]).map(
                      (key, index, keys) => (
                        <div className="adm-array-toolbar" key={key}>
                          <span>
                            {index + 1}.{" "}
                            {
                              sections.find(
                                (section) => section[0] === key,
                              )?.[1]
                            }
                          </span>
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label={`Đưa phần ${index + 1} lên`}
                            onClick={() => {
                              const next = [...keys];
                              [next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ];
                              change(selectedPart, next);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === keys.length - 1}
                            aria-label={`Đưa phần ${index + 1} xuống`}
                            onClick={() => {
                              const next = [...keys];
                              [next[index + 1], next[index]] = [
                                next[index],
                                next[index + 1],
                              ];
                              change(selectedPart, next);
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ) : selectedPart.kind === "hero" ? (
                  <HeroEditor
                    value={currentRow.data as unknown as HeroConfig}
                    references={references}
                    onChange={(value) =>
                      change(selectedPart, value as unknown as Data)
                    }
                  />
                ) : selectedPart.kind ? (
                  <GroupedFields
                    row={currentRow}
                    part={selectedPart}
                    references={references}
                    onChange={(value) => change(selectedPart, value)}
                  />
                ) : (
                  <Editor
                    value={get(currentRow.data, selectedPart.path)}
                    name={
                      selectedPart.path.length === 2 &&
                      selectedPart.path[0] === "display"
                        ? "enabled"
                        : (selectedPart.path.at(-1) ?? "")
                    }
                    references={references}
                    locked={currentRow.revision > 0}
                    onChange={(value) => change(selectedPart, value)}
                  />
                )}
              </fieldset>
            </div>
            {lifecycleAllowed &&
              currentRow.revision > 0 &&
              ["tours", "articles", "pages"].includes(
                currentRow.collection,
              ) && (
                <Link
                  href={`/admin/preview/${currentRow.collection}/${currentRow.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem bản nháp đã lưu ↗
                </Link>
              )}
          </EditorModal>
        </MediaUploadContext.Provider>
      )}
    </div>
  );
}
function GroupedFields({
  row,
  part,
  references,
  onChange,
}: {
  row: Row;
  part: Part;
  references: ReferenceOptions;
  onChange: (value: Data) => void;
}) {
  const fields = part.kind!.split(",");
  const defaults: Record<string, EditorValue> = {
    cover: { src: "", alt: "Ảnh bìa" },
    image: { src: "", alt: "Ảnh minh họa" },
    seo: { title: "", description: "" },
    priceNote: "",
    tourCode: "",
    featured: false,
    _enReviewed: false,
    _en:
      row.collection === "tours"
        ? {
            title: row.data.title,
            summary: row.data.summary,
            overview: row.data.overview,
            itinerary: row.data.itinerary,
            highlights: row.data.highlights,
            included: row.data.included,
            excluded: row.data.excluded,
            notes: row.data.notes,
            policies: row.data.policies,
            tags: row.data.tags,
          }
        : row.collection === "articles"
          ? {
              title: row.data.title,
              excerpt: row.data.excerpt,
              body: row.data.body,
              tags: row.data.tags,
            }
          : row.collection === "categories"
            ? {
                name: row.data.name,
                description: row.data.description,
                tagline: row.data.tagline ?? "",
              }
            : {
                name: row.data.name,
                summary: row.data.summary,
                province: row.data.province ?? "",
              },
  };
  return (
    <>
      <Editor
        value={Object.fromEntries(
          fields
            .filter((key) => key in row.data)
            .map((key) => [key, row.data[key]]),
        )}
        references={references}
        locked={row.revision > 0}
        onChange={(value) => onChange({ ...row.data, ...(value as Data) })}
      />
      <div className="adm-optional">
        {fields
          .filter((key) => !(key in row.data) && key in defaults)
          .map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => onChange({ ...row.data, [key]: defaults[key] })}
            >
              ＋{" "}
              {(
                {
                  cover: "Thêm ảnh bìa",
                  image: "Thêm ảnh",
                  seo: "Thêm thông tin tìm kiếm",
                  _en: "Thêm bản dịch tiếng Anh",
                  _enReviewed: "Trạng thái duyệt bản dịch",
                  priceNote: "Ghi chú giá",
                  tourCode: "Mã tour",
                  featured: "Đánh dấu nổi bật",
                } as Record<string, string>
              )[key] ?? "Bổ sung thông tin"}
            </button>
          ))}
        {fields.includes("priceFrom") && row.data.priceFrom !== null && (
          <button
            type="button"
            onClick={() =>
              onChange({ ...row.data, priceFrom: null, pricingOptions: [] })
            }
          >
            Chuyển sang giá liên hệ tư vấn
          </button>
        )}
      </div>
      {fields.includes("slug") && (
        <p className="adm-field-hint">
          Đường dẫn được khóa sau lần lưu đầu tiên để giữ liên kết đã chia sẻ.
        </p>
      )}
    </>
  );
}
