"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Editor, type EditorValue, type ReferenceOptions } from "./editor";
import { useContentUpdates } from "@/lib/use-content-updates";
import { HeroEditor } from "./hero-editor";
import { Overview } from "./overview";
import { HomeSections } from "./home-sections";
import type { HomeSectionMeta } from "@/lib/home-sections";
import {
  ToastStack,
  ConfirmModal,
  type ConfirmRequest,
  type ToastItem,
  type ToastKind,
} from "./notify";
import { AdmFilterSelect } from "./ui-select";
import {
  TRASH_RETENTION_DAYS,
  articleCoverSrcOf,
  articleExcerptOf,
  articleTagsOf,
  coverSrcOf,
  durationBadgeOf,
  durationGroupOf,
  lineGroupOf,
  priceLabelOf,
  qnpyCategoryIds,
  trashDaysLeft,
  trashDeleteAtMs,
  trashElapsedRatio,
} from "@/lib/admin-tour-groups";
import type { HeroConfig } from "@/domain/home-hero";
type RecordRow = {
  id: string;
  data: Record<string, EditorValue>;
  revision: number;
  state: string;
  updated_at: string;
};
type Lead = {
  id: string;
  status: string;
  note: string;
  mail_status: string;
  created_at: string;
  data: Record<string, string>;
};
const tabs = [
  ["overview", "Tổng quan", "◉"],
  ["home", "Trang chủ", "⌂"],
  ["tours", "Tour du lịch", "◈"],
  ["articles", "Cẩm nang", "▤"],
  ["categories", "Danh mục", "▦"],
  ["destinations", "Điểm đến", "◎"],
  ["media", "Thư viện ảnh", "▧"],
  ["messages", "Nội dung VI / EN", "Aa"],
  ["settings", "Website & footer", "⚙"],
  ["leads", "Yêu cầu tư vấn", "✉"],
  ["account", "Bảo mật", "◇"],
];
const TAB_GROUPS: { label: string | null; keys: string[] }[] = [
  { label: null, keys: ["overview"] },
  {
    label: "Nội dung website",
    keys: ["home", "tours", "articles", "categories", "destinations", "media"],
  },
  { label: "Bán hàng", keys: ["leads"] },
  { label: "Hệ thống", keys: ["messages", "settings", "account"] },
];
const TOUR_GROUPS = [
  { duration: "1day", line: "qnpy", title: "Quy Nhơn – Phú Yên · Tour 1 ngày" },
  {
    duration: "multi",
    line: "qnpy",
    title: "Quy Nhơn – Phú Yên · Tour nhiều ngày",
  },
  { duration: "1day", line: "domestic", title: "Trong nước · Tour 1 ngày" },
  { duration: "multi", line: "domestic", title: "Trong nước · Tour nhiều ngày" },
] as const;
type Guide = {
  purpose: string;
  steps: string[];
  required: string;
  result: string;
  pitfalls: string;
};
const LIFECYCLE: Guide = {
  purpose:
    "Hiểu vòng đời nội dung dùng chung cho Tour, Cẩm nang, Danh mục và Điểm đến.",
  steps: [
    "Lưu bản nháp: giữ bản public cũ nếu nội dung đã xuất bản; chỉ lưu bản nháp mới.",
    "Xuất bản thay đổi: cập nhật website ngay, không cần build lại.",
    "Ẩn khỏi website: gỡ khỏi trang public nhưng giữ bản nháp để sửa tiếp.",
    "Thùng rác: chuyển vào trạng thái đã xóa, có thể khôi phục thành bản nháp.",
    "Khôi phục: đưa nội dung trong Thùng rác về lại bản nháp, chưa public.",
    "Xóa vĩnh viễn: chỉ áp dụng cho dữ liệu khách (tab Tư vấn) và ảnh chưa được tham chiếu; không khôi phục được.",
  ],
  required:
    "Slug/đường dẫn sinh lúc tạo mới và bị khóa sau lần lưu đầu để bảo toàn liên kết.",
  result:
    "Bản public chỉ đổi khi bấm Xuất bản; Thùng rác không bao giờ hiện ra website, tìm kiếm hay sitemap.",
  pitfalls:
    "Hai người cùng sửa: phiên cũ bị từ chối ghi đè — tải lại trang trước khi lưu tiếp.",
};
const GUIDES: Record<string, Guide> = {
  home: {
    purpose:
      "Quản lý toàn bộ khối trang chủ theo đúng thứ tự hiển thị trên website: mỗi thẻ là một phần thật (banner, tìm kiếm, tour, FAQ...).",
    steps: [
      "Nhìn thẻ để biết phần đó nằm ở đâu trên trang chủ và đang hiển thị gì.",
      "Bấm Sửa để mở modal chỉ chứa trường của phần đó; ảnh chọn từ thư viện.",
      "Bấm Lưu bản nháp để giữ, Xuất bản thay đổi để lên web ngay.",
      "Thẻ Chân trang mở sang tab Website & footer; tiêu đề form tư vấn sửa ở tab Song ngữ.",
    ],
    required:
      "Mỗi modal chỉ sửa đúng phần của mình; ảnh phải là đường dẫn /... trong thư viện.",
    result:
      "Xuất bản một phần chỉ đổi phần đó; bản nháp không ảnh hưởng website.",
    pitfalls:
      "Đừng xóa trắng danh sách (gợi ý, mốc thời gian, FAQ) — schema yêu cầu giữ ít nhất 1 mục.",
  },
  tours: {
    purpose:
      "Quản lý tour: thông tin, ảnh, lịch trình, thời lượng, danh mục/điểm đến, bảng giá và SEO.",
    steps: [
      "Bấm Thêm mới để tạo bản nháp từ mẫu, hoặc Chỉnh sửa bản ghi có sẵn.",
      "Điền tiêu đề, tóm tắt, thời lượng (số ngày/đêm) rồi dựng lịch trình đủ số ngày, đúng thứ tự.",
      "Chọn danh mục và điểm đến bằng dropdown (không gõ tay mã).",
      "Chưa có giá chính thức thì giữ giá liên hệ; có bảng giá thì giá từ phải bằng gói thấp nhất.",
      "Bấm Lưu bản nháp để giữ, Xem bản nháp để kiểm tra, Xuất bản thay đổi để lên website.",
    ],
    required:
      "Tiêu đề, thời lượng, lịch trình khớp số ngày, danh mục và điểm đến tồn tại.",
    result:
      "Nháp không lên website; xuất bản cập nhật ngay trang tour, trang danh mục, tìm kiếm và sitemap.",
    pitfalls:
      "Số ngày lịch trình phải khớp thời lượng; mã ngày/mã gói không trùng; bản dịch tiếng Anh (nếu có) cũng phải khớp số ngày.",
  },
  articles: {
    purpose:
      "Quản lý bài cẩm nang: tiêu đề, giới thiệu, nội dung theo khối, ngày đăng, tác giả, SEO.",
    steps: [
      "Bấm Thêm mới hoặc Chỉnh sửa bài viết.",
      "Dựng nội dung bằng các khối: đoạn văn, tiêu đề, danh sách, trích dẫn, ghi chú, hình ảnh.",
      "Đặt ngày đăng, tác giả, bài nổi bật; gắn điểm đến và tour liên quan bằng dropdown.",
      "Lưu bản nháp, xem trước, rồi xuất bản khi đã kiểm tra kỹ.",
    ],
    required:
      "Tiêu đề, đường dẫn, ngày đăng; tour/điểm đến liên quan phải tồn tại và chưa bị xóa.",
    result:
      "Bài nháp không hiện ở trang Cẩm nang; xuất bản hiện ngay kèm bài liên quan.",
    pitfalls:
      "Không nhập HTML hay script — nội dung hiển thị qua khối cấu trúc, mã lạ sẽ bị từ chối.",
  },
  categories: {
    purpose: "Quản lý danh mục tour và đường dẫn nhóm như /danh-muc/<slug>.",
    steps: [
      "Thêm mới danh mục, đặt tên và mô tả; đường dẫn mới phải dạng /danh-muc/<slug>.",
      "Chọn danh mục cha nếu là nhóm con; kiểm tra thứ tự hiển thị.",
      "Xuất bản để đường dẫn hoạt động ngay trên website.",
    ],
    required: "Tên, đường dẫn đúng định dạng; danh mục cha không tạo vòng lặp.",
    result:
      "Danh mục mới có trang riêng ngay sau xuất bản; đổi tên không đổi đường dẫn cũ.",
    pitfalls:
      "Không xóa danh mục đang có tour hoặc danh mục con tham chiếu — gỡ liên kết trước.",
  },
  destinations: {
    purpose:
      "Quản lý điểm đến: thông tin, hình ảnh, tỉnh/thành, vùng miền, thứ tự.",
    steps: [
      "Thêm mới hoặc chỉnh sửa điểm đến; điền tên, tóm tắt, tỉnh/thành.",
      "Chọn ảnh từ thư viện; kiểm tra vùng miền và thứ tự hiển thị.",
      "Xuất bản để điểm đến hiện ở khối khám phá và trang tuyến.",
    ],
    required: "Tên, tóm tắt; ảnh nên có mô tả (alt) rõ ràng.",
    result: "Điểm đến xuất bản hiện ngay ở trang chủ và trang tuyến liên quan.",
    pitfalls: "Không xóa điểm đến đang được tour hoặc bài viết tham chiếu.",
  },
  media: {
    purpose:
      "Thư viện ảnh dùng chung cho tour, bài viết, danh mục và điểm đến.",
    steps: [
      "Bấm Tải ảnh lên, chọn file JPEG/PNG/WebP (tối đa 10 MB).",
      "Ảnh tự đổi sang WebP, bỏ metadata, không phóng lớn ảnh nhỏ.",
      "Sửa mô tả ảnh trong thư viện; bấm Sao chép đường dẫn để dùng trong form.",
      "Chọn ảnh trong form nội dung qua dropdown thay vì dán tay đường dẫn.",
    ],
    required:
      "Đúng định dạng và dung lượng; mô tả ảnh ngắn gọn, nêu đúng nội dung ảnh.",
    result:
      "Ảnh mới dùng được ngay trong mọi form; ảnh gốc (28 ảnh seed) luôn được giữ.",
    pitfalls:
      "Ảnh đang được nháp/bản public/Thùng rác tham chiếu thì không xóa được — gỡ khỏi nội dung trước.",
  },
  messages: {
    purpose:
      "Sửa câu chữ tiếng Việt/Anh trên trang chủ, liên hệ, chính sách, nhãn và thông báo.",
    steps: [
      "Mở bản ghi vi hoặc en; sửa từng dòng chữ trong cấu trúc có sẵn.",
      "Muốn thêm tiếng Anh cho tour/bài viết thì mở form của tour/bài đó, không sửa ở đây.",
      "Lưu bản nháp rồi xuất bản để chữ mới hiện trên website.",
    ],
    required:
      "Giữ nguyên cấu trúc các mục; không xóa khóa nào vì form công khai đọc theo khóa.",
    result:
      "Chữ mới hiện ngay sau xuất bản; bản dịch tiếng Anh chưa duyệt vẫn xem được nhưng có banner và không vào sitemap.",
    pitfalls:
      "Sửa nguồn tiếng Việt không làm mất bản dịch cũ, nhưng site sẽ không dùng lại bản dịch seed đã cũ.",
  },
  settings: {
    purpose:
      "Chỉnh website và chân trang: thương hiệu, hotline, email, địa chỉ, giờ làm việc, liên kết, mạng xã hội, chuyển động nền.",
    steps: [
      "Sửa tên thương hiệu, hotline, email, địa chỉ, giờ làm việc (cả VI và EN).",
      "Cập nhật liên kết footer và mạng xã hội; đổi hotline thì kiểm tra lại URL Zalo.",
      "Tắt/bật chuyển động nền nếu muốn trang tĩnh hơn; xuất bản để áp dụng ngay.",
    ],
    required:
      "Hotline kèm liên kết gọi hợp lệ; URL mạng xã hội đầy đủ https://.",
    result:
      "Header, footer, trang liên hệ và nút gọi cập nhật ngay sau xuất bản, không cần build lại.",
    pitfalls:
      "Tab này không có Ẩn hay Thùng rác — mọi thay đổi chỉ có nháp và xuất bản.",
  },
  leads: {
    purpose:
      "Chăm sóc yêu cầu tư vấn: trạng thái, ghi chú nội bộ, gửi lại email.",
    steps: [
      "Tìm theo tên hoặc số điện thoại ở ô tìm kiếm.",
      "Đổi trạng thái (Mới/Đã liên hệ/Tiềm năng/Đã chốt/Chưa phù hợp) rồi bấm Lưu chăm sóc.",
      "Ghi chú nội bộ được mã hóa; chỉ bấm Gửi lại email sau khi SMTP đã cấu hình đúng.",
      "Xóa dữ liệu khách chỉ khi thật cần — thao tác vĩnh viễn, có xác nhận.",
    ],
    required:
      "Mỗi lần đổi trạng thái/ghi chú phải bấm Lưu chăm sóc mới được ghi nhận.",
    result:
      "Danh sách hiện 500 yêu cầu gần nhất; dữ liệu và ghi chú mã hóa trong database.",
    pitfalls:
      "Không tự gửi lại email đã báo thành công; SMTP lỗi vẫn giữ được dữ liệu khách.",
  },
  overview: {
    purpose: "Xem nhanh hiệu quả website: lượt xem hôm nay, khách, leads và pipeline kinh doanh.",
    steps: [
      "Chọn khoảng 7/14/30 ngày để so sánh xu hướng.",
      "Bấm Làm mới để tải số liệu mới nhất từ /api/admin/stats.",
      "Xem Top trang để biết tour/bài nào đang hút khách.",
      "Theo dõi phễu Mới → Đã chốt và pipeline VND ước tính.",
    ],
    required: "Cần có lượt truy cập (tracker /api/track) thì biểu đồ mới có số liệu.",
    result: "Số liệu tổng hợp theo giờ Việt Nam, không cần build lại.",
    pitfalls: "Adblock/chặn beacon có thể làm thiếu số; sai múi giờ trình duyệt không ảnh hưởng vì server chuẩn hoá.",
  },
  account: {
    purpose: "Đổi mật khẩu quản trị và quản lý phiên đăng nhập.",
    steps: [
      "Nhập mật khẩu hiện tại và mật khẩu mới (ít nhất 14 ký tự).",
      "Bấm Cập nhật mật khẩu; mọi phiên đang đăng nhập (kể cả máy này) bị thu hồi.",
      "Đăng nhập lại bằng mật khẩu mới để tiếp tục.",
    ],
    required: "Mật khẩu mới 14–200 ký tự; phải nhớ mật khẩu hiện tại.",
    result:
      "Đổi xong phải đăng nhập lại; phiên cũ trên mọi thiết bị hết hiệu lực.",
    pitfalls:
      "Quên mật khẩu thì chỉ chủ hệ thống đặt lại được bằng lệnh reset trên máy chủ.",
  },
};
export function Dashboard({
  initialCsrf,
  initialVersion,
}: {
  initialCsrf: string | null;
  initialVersion?: string;
}) {
  const [hasUpdates, setHasUpdates] = useState(false);
  const [csrf, setCsrf] = useState(initialCsrf),
    [tab, setTab] = useState("overview"),
    [rows, setRows] = useState<RecordRow[]>([]),
    [selected, setSelected] = useState<RecordRow | null>(null),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [dirty, setDirty] = useState(false),
    [filter, setFilter] = useState("all"),
    [durationFilter, setDurationFilter] = useState<"all" | "1day" | "multi">(
      "all",
    ),
    [lineFilter, setLineFilter] = useState<"all" | "qnpy" | "domestic">("all");
  const [references, setReferences] = useState<ReferenceOptions>({});
  const [qnpyIds, setQnpyIds] = useState<ReadonlySet<string>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const [confirmReq, setConfirmReq] = useState<
    (ConfirmRequest & { resolve: (ok: boolean) => void }) | null
  >(null);
  const [homeData, setHomeData] = useState<{
    hero: RecordRow | null;
    landing: RecordRow | null;
  }>({ hero: null, landing: null });
  const [homeModal, setHomeModal] = useState<
    | { kind: "hero"; title: string; where: string }
    | { kind: "section"; key: string; title: string; where: string }
    | null
  >(null);
  const loadSerial = useRef(0);
  const activitySerial = useRef(0);
  const dirtyFields = useRef(new Set<string>());
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]),
    [media, setMedia] = useState<
      {
        id: string;
        name: string;
        alt: string;
        src: string;
        original: boolean;
      }[]
    >([]);
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [remember, setRemember] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [trashOpen, setTrashOpen] = useState(false),
    [current, setCurrent] = useState(""),
    [showCurrentPw, setShowCurrentPw] = useState(false),
    [showNewPw, setShowNewPw] = useState(false);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelpOpen(false);
        helpButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [helpOpen]);
  useEffect(() => {
    if (!trashOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTrashOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [trashOpen]);
  async function api(url: string, options: RequestInit = {}) {
    const response = await fetch(`/api/admin/${url}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf ?? "",
        ...options.headers,
      },
    });
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 401) setCsrf(null);
      throw new Error(body.error ?? "Có lỗi xảy ra");
    }
    return body;
  }
  async function load(next = tab, background = false) {
    const serial = ++loadSerial.current;
    const activity = activitySerial.current;
    if (!background) setLoading(true);
    try {
      const [options, library] = await Promise.all([
        api("options"),
        api("media"),
      ]);
      if (next === "overview") {
        setSelected(null);
        setDirty(false);
        dirtyFields.current.clear();
        setHasUpdates(false);
        return true;
      }
      if (next === "home") {
        const [heroRows, landingRows] = await Promise.all([
          api("content/hero").catch(() => null),
          api("content/landing").catch(() => null),
        ]);
        if (
          serial !== loadSerial.current ||
          (background && activity !== activitySerial.current)
        )
          return false;
        setHomeData({
          hero: (heroRows as RecordRow[] | null)?.[0] ?? null,
          landing: (landingRows as RecordRow[] | null)?.[0] ?? null,
        });
        setSelected(null);
        setDirty(false);
        dirtyFields.current.clear();
        setHasUpdates(false);
        return true;
      }
      const result =
        next === "leads"
          ? await api("leads")
          : next === "media" || next === "account"
            ? null
            : await api(`content/${next}`);
      // Tour grouping needs the category tree: which categories live under
      // the Quy Nhơn – Phú Yên root. Loaded only for the tours tab.
      let categoryTree: { id: string; parentId?: string | null }[] = [];
      if (next === "tours") {
        try {
          const categoryRows = (await api("content/categories")) as {
            data: { id: string; parentId?: string | null };
          }[];
          categoryTree = categoryRows.map((row) => ({
            id: row.data.id,
            parentId: row.data.parentId ?? null,
          }));
        } catch {
          categoryTree = [];
        }
      }
      if (
        serial !== loadSerial.current ||
        (background && activity !== activitySerial.current)
      )
        return false;
      setReferences({
        ...options,
        media: library.map((item: { src: string; alt: string }) => ({
          value: item.src,
          label: item.alt,
        })),
      });
      setSelected(null);
      setDirty(false);
      dirtyFields.current.clear();
      if (next === "leads") setLeads(result);
      else if (next === "media") setMedia(library);
      else if (next !== "account") setRows(result);
      setQnpyIds(next === "tours" ? qnpyCategoryIds(categoryTree) : new Set());
      setHasUpdates(false);
      return true;
    } catch (error) {
      if (serial === loadSerial.current) setNotice(String(error));
      return false;
    } finally {
      if (!background && serial === loadSerial.current) setLoading(false);
    }
  }
  // Each tab change loads its fresh server snapshot.
  useEffect(() => {
    if (csrf) {
      queueMicrotask(() => void load(tab));
    }
  }, [tab, csrf]); // eslint-disable-line react-hooks/exhaustive-deps
  useContentUpdates({
    enabled: Boolean(csrf),
    url: "/api/admin/changes",
    initialVersion,
    onChange: async () => {
      if (busy || loading) return false;
      if (tab === "account" || tab === "overview") return true;
      if (dirty || selected) {
        setHasUpdates(true);
        return false;
      }
      return load(tab, true);
    },
    onUnauthorized: () => {
      setCsrf(null);
      setNotice("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    },
  });
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await operation();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }
  function pushToast(kind: ToastKind, text: string) {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((current) => [...current.slice(-3), { id, kind, text }]);
  }
  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }
  function requestConfirm(
    request: Exclude<ConfirmRequest, null>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmReq({ ...request, resolve });
    });
  }
  function settleConfirm(ok: boolean) {
    setConfirmReq((current) => {
      current?.resolve(ok);
      return null;
    });
  }
  async function switchTab(next: string) {
    if (
      dirty &&
      !(await requestConfirm({
        title: "Rời màn hình này?",
        body: "Bạn có thay đổi chưa lưu. Rời đi sẽ bỏ các thay đổi đó.",
        confirmLabel: "Rời màn hình",
        danger: true,
      }))
    )
      return;
    loadSerial.current++;
    setSelected(null);
    setHomeModal(null);
    setDirty(false);
    setRows([]);
    setSearch("");
    setFilter("all");
    setDurationFilter("all");
    setLineFilter("all");
    setHelpOpen(false);
    setTrashOpen(false);
    setTab(next);
    setNotice("");
  }
  async function save(action: string, collection: string = tab): Promise<boolean> {
    if (!selected) return false;
    let ok = false;
    await run(async () => {
      await api(`content/${collection}`, {
        method: "POST",
        body: JSON.stringify({
          data: selected.data,
          revision: selected.revision,
          action,
        }),
      });
      await load();
      pushToast(
        "success",
        action === "publish"
          ? "Đã xuất bản. Nội dung mới có hiệu lực trên website."
          : action === "unpublish"
            ? "Đã ẩn khỏi website. Bản nháp vẫn được giữ lại."
            : action === "delete"
              ? "Đã chuyển vào Thùng rác. Mở Thùng rác để xem hoặc khôi phục."
              : action === "restore"
                ? "Đã khôi phục thành bản nháp."
                : "Đã lưu thay đổi.",
      );
      if (action === "restore") setFilter("all");
      ok = true;
    });
    return ok;
  }
  function openHomeEditor(meta: HomeSectionMeta) {
    const record = meta.key === "hero" ? homeData.hero : homeData.landing;
    if (!record) {
      pushToast("error", "Chưa tải được dữ liệu trang chủ. Hãy tải lại trang.");
      return;
    }
    setSelected({
      ...record,
      data: structuredClone(record.data),
    });
    setDirty(false);
    setHomeModal(
      meta.key === "hero"
        ? { kind: "hero", title: meta.title, where: meta.where }
        : { kind: "section", key: meta.key, title: meta.title, where: meta.where },
    );
  }
  function closeHomeModal() {
    void (async () => {
      if (
        !dirty ||
        (await requestConfirm({
          title: "Bỏ thay đổi?",
          body: "Đóng modal sẽ bỏ các thay đổi chưa lưu của phần này.",
          confirmLabel: "Bỏ thay đổi",
          danger: true,
        }))
      ) {
        setHomeModal(null);
        setSelected(null);
        setDirty(false);
      }
    })();
  }
  function trashOrRestore(row: RecordRow) {
    void (async () => {
      const action = row.state === "deleted" ? "restore" : "delete";
      const title = String(row.data.title ?? row.data.name ?? row.id);
      const ok = await requestConfirm(
        action === "delete"
          ? {
              title: "Chuyển vào thùng rác?",
              body: `"${title}" sẽ gỡ khỏi website ngay. Giữ trong thùng rác ${TRASH_RETENTION_DAYS} ngày trước khi tự xóa vĩnh viễn.`,
              confirmLabel: "Chuyển vào thùng rác",
              danger: true,
            }
          : {
              title: "Khôi phục nội dung?",
              body: `"${title}" sẽ trở lại thành bản nháp, chưa xuất bản lên website.`,
              confirmLabel: "Khôi phục",
              danger: false,
            },
      );
      if (!ok) return;
      void run(async () => {
        await api(`content/${tab}`, {
          method: "POST",
          body: JSON.stringify({
            data: row.data,
            revision: row.revision,
            action,
          }),
        });
        await load();
        if (action === "restore") {
          setFilter("all");
          pushToast("success", "Đã khôi phục thành bản nháp.");
        } else {
          pushToast(
            "success",
            "Đã chuyển vào Thùng rác. Mở Thùng rác để xem hoặc khôi phục.",
          );
        }
      });
    })();
  }
  function create() {
    if (!rows.length) {
      setNotice("Cần bản mẫu để tạo nội dung.");
      return;
    }
    const data = structuredClone(
      rows.find((r) => r.state !== "deleted")?.data ?? rows[0].data,
    );
    const suffix = crypto.randomUUID().slice(0, 8).replaceAll("-", "");
    data.id = `${tab === "tours" ? "tour" : tab === "articles" ? "art" : tab === "categories" ? "cat" : "dest"}_${suffix}`;
    data.slug = `noi-dung-${suffix}`;
    if ("path" in data) data.path = `/danh-muc/${data.slug}`;
    if ("title" in data) data.title = "Nội dung mới";
    if ("name" in data) data.name = "Nội dung mới";
    delete data._en;
    delete data._enReviewed;
    if (tab === "tours") {
      data.priceFrom = null;
      data.pricingOptions = [];
      data.sourceDocuments = [];
      data.images = [];
    }
    if ("contentStatus" in data) data.contentStatus = "demo";
    if (tab === "articles")
      data.publishedAt = new Date().toISOString().slice(0, 10);
    setSelected({
      id: String(data.id),
      data,
      revision: 0,
      state: "draft",
      updated_at: "",
    });
    setDirty(true);
    setNotice(
      "Bản nháp tạo từ mẫu nội dung. Kiểm tra lịch trình, ảnh và thông tin trước khi xuất bản.",
    );
  }
  const deletedCount = rows.filter((r) => r.state === "deleted").length;
  const trashRows = rows.filter((r) => r.state === "deleted");
  const trashUrgentCount = trashRows.filter((r) => {
    const left = trashDaysLeft(r.updated_at);
    return left !== null && left <= 7;
  }).length;
  const tabLabel = tabs.find((t) => t[0] === tab)?.[1] ?? tab;
  function trashMetaOf(row: RecordRow) {
    const left = trashDaysLeft(row.updated_at);
    const deleteAtMs = trashDeleteAtMs(row.updated_at);
    const ratio = trashElapsedRatio(row.updated_at);
    const fmtDate = (ms: number | null) =>
      ms === null ? "—" : new Date(ms).toLocaleDateString("vi-VN");
    return {
      left,
      deleteAtMs,
      ratio,
      deletedLabel: (() => {
        const t = new Date(row.updated_at).getTime();
        return Number.isFinite(t)
          ? new Date(t).toLocaleDateString("vi-VN")
          : "—";
      })(),
      deleteAtLabel: fmtDate(deleteAtMs),
    };
  }
  const stateScopedRows = rows.filter((r) =>
    filter === "all" ? r.state !== "deleted" : r.state === filter,
  );
  const tourScope = tab === "tours" ? stateScopedRows : [];
  const countBy = (
    duration: "all" | "1day" | "multi",
    line: "all" | "qnpy" | "domestic",
  ) =>
    tourScope.filter(
      (r) =>
        (duration === "all" || durationGroupOf(r.data) === duration) &&
        (line === "all" || lineGroupOf(r.data, qnpyIds) === line),
    ).length;
  const visibleRows = rows.filter((row) => {
    if (filter === "all" ? row.state === "deleted" : row.state !== filter)
      return false;
    if (tab === "tours") {
      if (durationFilter !== "all" && durationGroupOf(row.data) !== durationFilter)
        return false;
      if (lineFilter !== "all" && lineGroupOf(row.data, qnpyIds) !== lineFilter)
        return false;
    }
    return JSON.stringify(row.data)
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  // Grouped tour sections (only when browsing, not searching, not in trash).
  const tourSections =
    tab === "tours" && filter !== "deleted" && !search
      ? [
          ...TOUR_GROUPS.map((group) => ({
            key: `${group.duration}-${group.line}`,
            title: group.title,
            items: visibleRows.filter(
              (row) =>
                durationGroupOf(row.data) === group.duration &&
                lineGroupOf(row.data, qnpyIds) === group.line,
            ),
          })),
          {
            key: "unknown",
            title: "Chưa phân loại",
            items: visibleRows.filter(
              (row) =>
                durationGroupOf(row.data) === "unknown" ||
                lineGroupOf(row.data, qnpyIds) === "unknown",
            ),
          },
        ].filter((section) => section.items.length > 0)
      : null;
  function renderTourCard(row: RecordRow) {
    const cover = coverSrcOf(row.data);
    const price = priceLabelOf(row.data);
    const badge = durationBadgeOf(row.data);
    const line = lineGroupOf(row.data, qnpyIds);
    const slug = typeof row.data.slug === "string" ? row.data.slug : "";
    return (
      <article key={row.id} className="adm-tour-card">
        <div className="adm-tour-thumb" aria-hidden="true">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <span>◈</span>
          )}
        </div>
        <div className="adm-tour-body">
          <div className="adm-tour-badges">
            <span className={`adm-badge ${row.state}`}>
              {row.state === "published" ? "Đang xuất bản" : "Bản nháp"}
            </span>
            {badge && <span className="adm-tour-dur">{badge}</span>}
            {line !== "unknown" && (
              <span className="adm-tour-line">
                {line === "qnpy" ? "QN – Phú Yên" : "Trong nước"}
              </span>
            )}
          </div>
          <h2>{String(row.data.title ?? row.data.name ?? row.id)}</h2>
          <p>
            {String(row.data.summary ?? row.data.slug ?? row.id).slice(0, 120)}
          </p>
          <p className="adm-card-place">
            📍 Card tour · {badge ?? "chưa rõ thời lượng"} ·{" "}
            {line === "qnpy"
              ? "Nhóm Quy Nhơn – Phú Yên"
              : line === "domestic"
                ? "Nhóm tour trong nước"
                : "Chưa phân loại tuyến"}
            {slug ? ` · /tour/${slug}` : ""}
          </p>
          <small>
            {new Date(row.updated_at).toLocaleDateString("vi-VN")} · v
            {row.revision} · {price ?? "Liên hệ"}
          </small>
        </div>
        <div className="adm-record-actions">
          <button
            onClick={() => {
              setSelected(row);
              setDirty(false);
            }}
          >
            Chỉnh sửa ↗
          </button>
          <button onClick={() => trashOrRestore(row)}>Thùng rác</button>
        </div>
      </article>
    );
  }
  // Cẩm nang: nhóm đúng cấu trúc landing page (bài nổi bật / lưới bài viết)
  // để admin nhận ra card nào nằm ở phần nào trên website.
  const articleSections =
    tab === "articles" && filter !== "deleted" && !search
      ? [
          {
            key: "featured",
            title: "Bài nổi bật · Card lớn đầu trang Cẩm nang",
            hint: "Chỉ nên giữ 1 bài featured=true. Bài này hiện to nhất ở /cam-nang-du-lich.",
            items: visibleRows.filter((row) => row.data.featured === true),
          },
          {
            key: "regular",
            title: "Bài thường · Lưới danh sách bên dưới",
            hint: "Các card nhỏ 3 cột: ảnh 16:10, ngày đăng, phút đọc, tags.",
            items: visibleRows.filter((row) => row.data.featured !== true),
          },
        ].filter((section) => section.items.length > 0)
      : null;
  function renderArticleCard(row: RecordRow) {
    const data = row.data as Record<string, EditorValue>;
    const cover = articleCoverSrcOf(data);
    const excerpt = articleExcerptOf(data);
    const tags = articleTagsOf(data);
    const isFeatured = data.featured === true;
    const slug = typeof data.slug === "string" ? data.slug : String(row.id);
    const publishedAt =
      typeof data.publishedAt === "string" ? data.publishedAt : "";
    const reading =
      typeof data.readingMinutes === "number" ? data.readingMinutes : null;
    const author =
      typeof data.author === "string" ? data.author : "SEA TRIP TRAVEL";
    return (
      <article
        key={row.id}
        className={`adm-article-card${isFeatured ? " adm-article-card--featured" : ""}`}
      >
        <div className="adm-article-thumb" aria-hidden="true">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <span>▤</span>
          )}
          {isFeatured && <span className="adm-article-flag">★ Nổi bật</span>}
        </div>
        <div className="adm-article-body">
          <div className="adm-tour-badges">
            <span className={`adm-badge ${row.state}`}>
              {row.state === "published" ? "Đang xuất bản" : "Bản nháp"}
            </span>
            {publishedAt && (
              <span className="adm-article-meta">📅 {publishedAt}</span>
            )}
            {reading !== null && (
              <span className="adm-article-meta">⏱ {reading} phút đọc</span>
            )}
          </div>
          <h2>{String(data.title ?? row.id)}</h2>
          <p className="adm-article-excerpt">{excerpt.slice(0, 140)}</p>
          <p className="adm-card-place">
            📍 {isFeatured ? "Card lớn đầu trang" : "Card lưới danh sách"} ·{" "}
            <code>/cam-nang-du-lich/{slug}</code> · {author}
          </p>
          {tags.length > 0 && (
            <p className="adm-article-tags">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </p>
          )}
        </div>
        <div className="adm-record-actions">
          <button
            onClick={() => {
              setSelected(row);
              setDirty(false);
            }}
          >
            Chỉnh sửa ↗
          </button>
          {slug && (
            <a
              className="adm-ghost-link"
              href={`/vi/cam-nang-du-lich/${slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem trên web ↗
            </a>
          )}
          <button onClick={() => trashOrRestore(row)}>Thùng rác</button>
        </div>
      </article>
    );
  }
  async function loginSubmit(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      try {
        const data = await api("auth", {
          method: "POST",
          body: JSON.stringify({ username, password, remember }),
        });
        setPassword("");
        setShowPassword(false);
        setCsrf(data.csrf);
      } catch (error) {
        // Giữ nguyên tên đăng nhập và mật khẩu đã nhập để không phải gõ lại.
        if (error instanceof TypeError)
          throw new Error(
            "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
          );
        throw error;
      }
    });
  }
  if (!csrf)
    return (
      <main className="adm-login">
        <section>
          <Link href="/" className="adm-brand">
            ✺ SEA TRIP <small>STUDIO</small>
          </Link>
          <span className="adm-eyebrow">Không gian dành cho chủ quản trị</span>
          <h1>
            Chào mừng
            <br />
            bạn trở lại.
          </h1>
          <p>
            Chăm chút từng hành trình.
            <br />
            Kết nối thêm nhiều trải nghiệm.
          </p>
          <form onSubmit={loginSubmit} aria-busy={busy}>
            <label htmlFor="adm-username">Tên đăng nhập</label>
            <input
              id="adm-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="adm-password">Mật khẩu</label>
            <div className="adm-password-wrap">
              <input
                id="adm-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="adm-password-toggle"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            <label className="adm-remember" htmlFor="adm-remember">
              <input
                id="adm-remember"
                name="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>
                Nhớ đăng nhập trong 30 ngày
                <small>Chỉ dùng trên máy cá nhân, không dùng máy lạ.</small>
              </span>
            </label>
            <button
              className="adm-primary"
              type="submit"
              disabled={busy || !username || !password}
            >
              {busy ? "Đang đăng nhập…" : "Vào SEA TRIP Studio →"}
            </button>
          </form>
          {notice && (
            <p className="adm-login-error" role="alert">
              {notice}
            </p>
          )}
        </section>
        <div className="adm-login-art" aria-hidden="true">
          <div className="adm-login-art-photo" />
          <div className="adm-login-art-shade" />
          <div className="adm-login-art-orb adm-login-art-orb-a" />
          <div className="adm-login-art-orb adm-login-art-orb-b" />
          <div className="adm-login-art-card">
            <p className="adm-login-art-eyebrow">SEA TRIP · Studio</p>
            <span className="adm-login-art-quote">
              Những chuyến đi
              <br />
              <em>bắt đầu từ đây.</em>
            </span>
            <p className="adm-login-art-caption">
              Chăm chút từng hành trình, từ Kỳ Co đến Phú Yên.
            </p>
            <p className="adm-login-art-chips">
              <span>Quy Nhơn – Phú Yên</span>
              <span>Tour trong nước</span>
            </p>
          </div>
        </div>
      </main>
    );
  return (
    <div
      className="adm-shell"
      onClickCapture={() => activitySerial.current++}
      onInputCapture={() => activitySerial.current++}
      onChangeCapture={(event) => {
        const editor = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-live-editor]",
        );
        if (editor?.dataset.liveEditor) {
          dirtyFields.current.add(editor.dataset.liveEditor);
          setDirty(true);
        }
      }}
    >
      <aside>
        <Link className="adm-brand" href="/">
          ✺ SEA TRIP <small>STUDIO</small>
        </Link>
        <p className="adm-eyebrow">Không gian quản trị</p>
        <nav aria-label="Quản trị">
          {TAB_GROUPS.map((group) => (
            <div key={group.label ?? "main"} className="adm-nav-group">
              {group.label && (
                <p className="adm-nav-label" aria-hidden="true">
                  {group.label}
                </p>
              )}
              {group.keys.map((key) => {
                const entry = tabs.find((t) => t[0] === key);
                if (!entry) return null;
                const [, label, icon] = entry;
                return (
                  <button
                    key={key}
                    aria-current={tab === key ? "page" : undefined}
                    onClick={() => void switchTab(key)}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <Link
          className="adm-site-link"
          href="/"
          target="_blank"
          rel="noreferrer"
        >
          Mở website ↗
        </Link>
        <button
          onClick={() =>
            void run(async () => {
              if (
                dirty &&
                !(await requestConfirm({
                  title: "Đăng xuất?",
                  body: "Bạn có thay đổi chưa lưu. Đăng xuất sẽ bỏ các thay đổi đó.",
                  confirmLabel: "Đăng xuất",
                  danger: true,
                }))
              )
                return;
              await api("auth", { method: "DELETE" });
              setCsrf(null);
              pushToast("info", "Đã đăng xuất khỏi Studio.");
            })
          }
        >
          Đăng xuất
        </button>
      </aside>
      <main className="adm-main">
        <header>
          <div>
            <span className="adm-eyebrow">SEA TRIP · Content & sales</span>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
            <p>Một nơi để chăm chút nội dung và những hành trình tiếp theo.</p>
          </div>
          <div className="adm-header-side">
            <button
              type="button"
              ref={helpButtonRef}
              className="adm-help-btn"
              aria-expanded={helpOpen}
              aria-controls="adm-help-panel"
              aria-label={
                helpOpen
                  ? "Đóng hướng dẫn sử dụng"
                  : "Mở hướng dẫn sử dụng trang này"
              }
              onClick={() => setHelpOpen((value) => !value)}
            >
              ?
            </button>
            <div className="adm-avatar" aria-label="Chủ quản trị">
              ST
            </div>
          </div>
        </header>
        {helpOpen && (
          <section
            id="adm-help-panel"
            className="adm-help-panel"
            aria-label={`Hướng dẫn: ${tabs.find((t) => t[0] === tab)?.[1]}`}
          >
            <div className="adm-help-head">
              <h2>Hướng dẫn: {tabs.find((t) => t[0] === tab)?.[1]}</h2>
              <button
                type="button"
                aria-label="Đóng hướng dẫn"
                onClick={() => setHelpOpen(false)}
              >
                ×
              </button>
            </div>
            {(() => {
              const guide = GUIDES[tab] ?? LIFECYCLE;
              return (
                <>
                  <p className="adm-help-purpose">{guide.purpose}</p>
                  <h3>Cách thao tác</h3>
                  <ol>
                    {guide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <h3>Trường bắt buộc</h3>
                  <p>{guide.required}</p>
                  <h3>Kết quả</h3>
                  <p>{guide.result}</p>
                  <h3>Lỗi thường gặp</h3>
                  <p>{guide.pitfalls}</p>
                  {["tours", "articles", "categories", "destinations"].includes(tab) && (
                    <details>
                      <summary>
                        Phân biệt Lưu nháp · Xuất bản · Ẩn · Thùng rác · Khôi
                        phục
                      </summary>
                      <ol>
                        {LIFECYCLE.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <p>{LIFECYCLE.result}</p>
                    </details>
                  )}
                </>
              );
            })()}
          </section>
        )}
        {hasUpdates && (
          <div className="adm-notice" role="status">
            Có cập nhật mới. Bản đang chỉnh sửa được giữ nguyên.
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => {
                void (async () => {
                  if (
                    dirty &&
                    !(await requestConfirm({
                      title: "Tải bản cập nhật?",
                      body: "Tải cập nhật sẽ bỏ thay đổi chưa lưu của bạn.",
                      confirmLabel: "Tải cập nhật",
                      danger: true,
                    }))
                  )
                    return;
                  void load();
                })();
              }}
            >
              Tải cập nhật
            </button>
          </div>
        )}
        {notice && (
          <div className="adm-notice" role="status">
            {notice}
            <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {tab === "overview" ? (
          <>{csrf ? <Overview csrf={csrf} /> : <p className="adm-empty">Đang tải…</p>}</>
        ) : tab === "account" ? (
          <section className="adm-panel adm-security">
            <div className="adm-security-head">
              <span className="adm-security-shield" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8 7.5 10 4.3-2 7.5-5.4 7.5-10v-6L12 2.5Z" />
                  <path d="m9 11.5 2.2 2.2L15.5 9.5" />
                </svg>
              </span>
              <div>
                <h2>Đổi mật khẩu</h2>
                <p>
                  Dùng ít nhất 14 ký tự. Sau khi đổi, mọi phiên đang đăng
                  nhập (kể cả máy này) sẽ bị thu hồi.
                </p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api("auth", {
                    method: "PATCH",
                    body: JSON.stringify({ current, password }),
                  });
                  setPassword("");
                  setCurrent("");
                  setCsrf(null);
                  setNotice("Đã đổi mật khẩu. Đăng nhập lại để tiếp tục.");
                });
              }}
            >
              <label htmlFor="adm-current-pw">Mật khẩu hiện tại</label>
              <div className="adm-password-wrap">
                <input
                  id="adm-current-pw"
                  type={showCurrentPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
                <button
                  type="button"
                  className="adm-password-toggle"
                  aria-label={showCurrentPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showCurrentPw}
                  onClick={() => setShowCurrentPw((v) => !v)}
                >
                  {showCurrentPw ? "Ẩn" : "Hiện"}
                </button>
              </div>
              <label htmlFor="adm-new-pw">Mật khẩu mới</label>
              <div className="adm-password-wrap">
                <input
                  id="adm-new-pw"
                  type={showNewPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={14}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="adm-password-toggle"
                  aria-label={showNewPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showNewPw}
                  onClick={() => setShowNewPw((v) => !v)}
                >
                  {showNewPw ? "Ẩn" : "Hiện"}
                </button>
              </div>
              {(() => {
                const len = password.length;
                const score =
                  (len >= 14 ? 1 : 0) +
                  (len >= 20 ? 1 : 0) +
                  (/[A-Z]/.test(password) && /[a-z]/.test(password) ? 1 : 0) +
                  (/\d/.test(password) && /[^A-Za-z0-9]/.test(password) ? 1 : 0);
                const label =
                  len === 0 ? "" : score <= 1 ? "Yếu" : score === 2 ? "Trung bình" : score === 3 ? "Khá" : "Mạnh";
                return (
                  <div className="adm-pw-meter" aria-live="polite">
                    <div className="adm-pw-meter-bar">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          data-on={i < score}
                          data-level={score}
                        />
                      ))}
                    </div>
                    <p>
                      {len === 0 ? (
                        <>Tối thiểu 14 ký tự, tối đa 200 ký tự.</>
                      ) : len < 14 ? (
                        <>Còn thiếu {14 - len} ký tự nữa mới đủ độ dài.</>
                      ) : (
                        <>Độ dài đạt yêu cầu · Độ mạnh: <strong>{label}</strong> (gợi ý thêm chữ hoa, số và ký tự đặc biệt).</>
                      )}
                    </p>
                  </div>
                );
              })()}
              <button
                className="adm-primary adm-security-submit"
                disabled={busy || password.length < 14 || !current}
              >
                {busy ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
              </button>
            </form>
          </section>
        ) : tab === "leads" ? (
          <>
            <div className="adm-stats">
              {[
                ["Tổng yêu cầu", leads.length],
                [
                  "Chưa liên hệ",
                  leads.filter((l) => l.status === "new").length,
                ],
                ["Đã chốt", leads.filter((l) => l.status === "won").length],
              ].map(([label, count]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <section className="adm-panel">
              <input
                aria-label="Tìm khách hàng"
                placeholder="Tìm tên hoặc số điện thoại…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {leads
                .filter((l) =>
                  JSON.stringify(l.data)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((lead) => (
                  <article
                    className="adm-lead"
                    key={lead.id}
                    data-live-editor={`lead:${lead.id}`}
                  >
                    <div>
                      <h2>{lead.data.fullName ?? lead.data.name}</h2>
                      <Link href={`tel:${lead.data.phone}`}>
                        {lead.data.phone}
                      </Link>
                      <p>{lead.data.interest ?? lead.data.tourSlug}</p>
                      <p>{lead.data.message}</p>
                      <small>
                        {new Date(lead.created_at).toLocaleString("vi-VN")} ·
                        Email: {lead.mail_status}
                      </small>
                    </div>
                    <div>
                      <label>
                        Trạng thái
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            setLeads(
                              leads.map((l) =>
                                l.id === lead.id
                                  ? { ...l, status: e.target.value }
                                  : l,
                              ),
                            )
                          }
                        >
                          {[
                            ["new", "Mới"],
                            ["contacted", "Đã liên hệ"],
                            ["qualified", "Tiềm năng"],
                            ["won", "Đã chốt"],
                            ["lost", "Chưa phù hợp"],
                          ].map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ghi chú
                        <textarea
                          value={lead.note}
                          onChange={(e) =>
                            setLeads(
                              leads.map((l) =>
                                l.id === lead.id
                                  ? { ...l, note: e.target.value }
                                  : l,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api("leads", {
                              method: "PATCH",
                              body: JSON.stringify({
                                id: lead.id,
                                status: lead.status,
                                note: lead.note,
                              }),
                            });
                            dirtyFields.current.delete(`lead:${lead.id}`);
                            setDirty(dirtyFields.current.size > 0);
                            pushToast("success", "Đã cập nhật khách hàng.");
                          })
                        }
                      >
                        Lưu chăm sóc
                      </button>
                      <button
                        disabled={busy || lead.mail_status === "sent"}
                        onClick={() =>
                          void run(async () => {
                            await api("leads", {
                              method: "POST",
                              body: JSON.stringify({ id: lead.id }),
                            });
                            await load();
                            pushToast("success", "Đã gửi lại email thông báo.");
                          })
                        }
                      >
                        Gửi lại email
                      </button>
                      <button
                        onClick={() => {
                          void (async () => {
                            const ok = await requestConfirm({
                              title: "Xóa dữ liệu khách hàng?",
                              body: `Xóa vĩnh viễn yêu cầu của "${lead.data.fullName ?? lead.data.name ?? lead.id}". Không thể khôi phục.`,
                              confirmLabel: "Xóa vĩnh viễn",
                              danger: true,
                            });
                            if (!ok) return;
                            void run(async () => {
                              await api("leads", {
                                method: "DELETE",
                                body: JSON.stringify({ id: lead.id }),
                              });
                              await load();
                              pushToast("success", "Đã xóa dữ liệu khách hàng.");
                            });
                          })();
                        }}
                      >
                        Xóa dữ liệu
                      </button>
                    </div>
                  </article>
                ))}
              {!leads.length && (
                <p className="adm-empty">
                  Các yêu cầu tư vấn mới sẽ xuất hiện tại đây.
                </p>
              )}
            </section>
          </>
        ) : tab === "media" ? (
          <section className="adm-panel">
            <h2>Khoảnh khắc cho những hành trình</h2>
            <p>
              JPEG, PNG hoặc WebP · tối đa 10 MB. Ảnh được tối ưu, bỏ metadata
              và không phóng lớn ảnh nhỏ.
            </p>
            <label className="adm-upload">
              ＋ Tải ảnh lên
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void run(async () => {
                      if (file.size > 10485760)
                        throw new Error("Ảnh vượt quá 10 MB");
                      await api("media", {
                        method: "POST",
                        headers: {
                          "content-type": file.type,
                          "x-image-alt": encodeURIComponent(file.name),
                        },
                        body: file,
                      });
                      await load();
                      pushToast(
                        "success",
                        "Đã tải ảnh. Sao chép đường dẫn để dùng trong nội dung.",
                      );
                    });
                }}
              />
            </label>
            <div className="adm-media-grid">
              {media.map((item) => (
                <article key={item.id} data-live-editor={`media:${item.id}`}>
                  <Image
                    unoptimized
                    width={300}
                    height={180}
                    src={item.src}
                    alt={item.alt}
                  />
                  <p>{item.alt}</p>
                  {!item.original && (
                    <>
                      <label>
                        Mô tả ảnh
                        <input
                          value={item.alt}
                          maxLength={300}
                          onChange={(e) =>
                            setMedia(
                              media.map((asset) =>
                                asset.id === item.id
                                  ? { ...asset, alt: e.target.value }
                                  : asset,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api("media", {
                              method: "PATCH",
                              body: JSON.stringify({
                                id: item.id,
                                alt: item.alt,
                              }),
                            });
                            dirtyFields.current.delete(`media:${item.id}`);
                            setDirty(dirtyFields.current.size > 0);
                            pushToast("success", "Đã lưu mô tả ảnh trong thư viện.");
                          })
                        }
                      >
                        Lưu mô tả
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(item.src)
                        .then(() =>
                          pushToast("success", "Đã sao chép đường dẫn ảnh."),
                        )
                        .catch(() =>
                          setNotice(
                            "Không sao chép được. Trình duyệt đã chặn clipboard.",
                          ),
                        );
                    }}
                  >
                    Sao chép đường dẫn
                  </button>
                  <button
                    disabled={item.original}
                    onClick={() => {
                      void (async () => {
                        const ok = await requestConfirm({
                          title: "Xóa ảnh khỏi thư viện?",
                          body: `Xóa "${item.alt || item.src}". Chỉ xóa được ảnh chưa dùng ở tour/bài viết.`,
                          confirmLabel: "Xóa ảnh",
                          danger: true,
                        });
                        if (!ok) return;
                        void run(async () => {
                          await api("media", {
                            method: "DELETE",
                            body: JSON.stringify({ id: item.id }),
                          });
                          await load();
                          pushToast("success", "Đã xóa ảnh khỏi thư viện.");
                        });
                      })();
                    }}
                  >
                    Xóa ảnh
                  </button>
                </article>
              ))}
            </div>
            {!media.length && (
              <p className="adm-empty">
                Thêm ảnh mới để kể câu chuyện của bạn. 28 ảnh gốc vẫn được giữ
                trong thư viện tour.
              </p>
            )}
          </section>
        ) : tab === "home" ? (
          <>
            <section className="adm-panel adm-home-intro">
              <div>
                <h2>Các khối trang chủ theo đúng thứ tự hiển thị</h2>
                <p>
                  Mỗi thẻ là một phần thật trên landing page. Bấm Sửa để mở
                  modal chỉ chứa trường của phần đó — lưu nháp hoặc xuất bản
                  ngay trong modal.
                </p>
              </div>
            </section>
            {loading && !homeData.hero && !homeData.landing ? (
              <p className="adm-empty">Nội dung đang được tải…</p>
            ) : (
              <HomeSections
                heroData={homeData.hero?.data ?? null}
                landingData={homeData.landing?.data ?? null}
                onEditHero={(title) =>
                  openHomeEditor({
                    key: "hero",
                    collection: "hero",
                    title,
                    where: "Đầu trang chủ — banner ảnh lớn",
                    illustration: "",
                  })
                }
                onEditSection={(meta) => openHomeEditor(meta)}
                onGoSettings={() => void switchTab("settings")}
              />
            )}
            {homeModal && selected && (
              <div
                className="adm-modal-veil"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closeHomeModal();
                }}
              >
                <div
                  className="adm-modal adm-section-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="adm-section-title"
                >
                  <div className="adm-section-modal-head">
                    <div>
                      <p className="adm-eyebrow">Trang chủ · {homeModal.where}</p>
                      <h2 id="adm-section-title">{homeModal.title}</h2>
                    </div>
                    <button
                      type="button"
                      aria-label="Đóng"
                      onClick={closeHomeModal}
                    >
                      ×
                    </button>
                  </div>
                  {homeModal.kind === "hero" ? (
                    <HeroEditor
                      value={selected.data as unknown as HeroConfig}
                      references={references}
                      onChange={(data) => {
                        setSelected({
                          ...selected,
                          data: data as unknown as Record<string, EditorValue>,
                        });
                        setDirty(true);
                      }}
                    />
                  ) : (
                    <Editor
                      value={{
                        [homeModal.key]: selected.data[homeModal.key],
                      }}
                      locked={selected.revision > 0}
                      references={references}
                      onChange={(value) => {
                        const next = value as Record<string, EditorValue>;
                        setSelected((current) =>
                          current
                            ? {
                                ...current,
                                data: {
                                  ...current.data,
                                  [homeModal.key]: next[homeModal.key],
                                },
                              }
                            : current,
                        );
                        setDirty(true);
                      }}
                    />
                  )}
                  <div className="adm-modal-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void save(
                          "save",
                          homeModal.kind === "hero" ? "hero" : "landing",
                        ).then((ok) => {
                          if (ok) setHomeModal(null);
                        });
                      }}
                    >
                      Lưu bản nháp
                    </button>
                    <button
                      type="button"
                      className="adm-primary"
                      disabled={busy}
                      onClick={() => {
                        void save(
                          "publish",
                          homeModal.kind === "hero" ? "hero" : "landing",
                        ).then((ok) => {
                          if (ok) setHomeModal(null);
                        });
                      }}
                    >
                      {busy ? "Đang lưu…" : "Xuất bản thay đổi ↗"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : selected ? (
          <section className="adm-panel adm-edit">
            <div className="adm-editor-header">
              <div>
                <button
                  onClick={() => {
                    void (async () => {
                      if (
                        !dirty ||
                        (await requestConfirm({
                          title: "Bỏ thay đổi chưa lưu?",
                          body: "Quay lại danh sách sẽ bỏ các thay đổi chưa lưu.",
                          confirmLabel: "Bỏ thay đổi",
                          danger: true,
                        }))
                      ) {
                        setSelected(null);
                        setDirty(false);
                      }
                    })();
                  }}
                >
                  ← Danh sách
                </button>
                <h2>
                  {tab === "hero"
                    ? "Khối mở đầu trang chủ"
                    : String(
                        selected.data.title ??
                          selected.data.name ??
                          selected.id,
                      )}
                </h2>
                <p>
                  {selected.state === "published"
                    ? "Đang xuất bản"
                    : selected.state === "deleted"
                      ? "Trong Thùng rác — lưu sẽ khôi phục thành bản nháp"
                      : "Bản nháp"}{" "}
                  · Phiên bản {selected.revision}
                  {dirty ? " · Có thay đổi chưa lưu" : ""}
                </p>
              </div>
              {["tours", "articles"].includes(tab) && (
                <Link
                  href={`/admin/preview/${tab}/${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem bản nháp ↗
                </Link>
              )}
            </div>
            {tab !== "hero" && (
              <div className="adm-optional">
                <p>Thêm phần nội dung cần dùng:</p>
                {Object.entries(
                  tab === "tours"
                    ? {
                        seo: { title: "", description: "" },
                        priceNote: "",
                        tourCode: "",
                        _en: {
                          title: String(selected.data.title ?? ""),
                          summary: String(selected.data.summary ?? ""),
                          overview: selected.data.overview,
                          itinerary: selected.data.itinerary,
                          highlights: selected.data.highlights,
                          included: selected.data.included,
                          excluded: selected.data.excluded,
                          notes: selected.data.notes,
                          policies: selected.data.policies,
                          tags: selected.data.tags,
                        },
                        _enReviewed: false,
                      }
                    : tab === "articles"
                      ? {
                          seo: { title: "", description: "" },
                          readingMinutes: 5,
                          _en: {
                            title: String(selected.data.title ?? ""),
                            excerpt: String(selected.data.excerpt ?? ""),
                            body: selected.data.body,
                            tags: selected.data.tags,
                          },
                          _enReviewed: false,
                        }
                      : tab === "categories"
                        ? {
                            _en: {
                              name: String(selected.data.name ?? ""),
                              description: String(
                                selected.data.description ?? "",
                              ),
                            },
                            _enReviewed: false,
                          }
                        : tab === "destinations"
                          ? {
                              _en: {
                                name: String(selected.data.name ?? ""),
                                summary: String(selected.data.summary ?? ""),
                              },
                              _enReviewed: false,
                            }
                          : {},
                )
                  .filter(([key]) => !(key in selected.data))
                  .map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelected({
                          ...selected,
                          data: {
                            ...selected.data,
                            [key]: value as EditorValue,
                          },
                        });
                        setDirty(true);
                      }}
                    >
                      ＋{" "}
                      {key === "_en"
                        ? "Nội dung tiếng Anh"
                        : key === "_enReviewed"
                          ? "Trạng thái duyệt bản dịch"
                          : key}
                    </button>
                  ))}
                {tab === "tours" && selected.data.priceFrom !== null && (
                  <button
                    onClick={() => {
                      setSelected({
                        ...selected,
                        data: {
                          ...selected.data,
                          priceFrom: null,
                          pricingOptions: [],
                        },
                      });
                      setDirty(true);
                    }}
                  >
                    Chuyển giá thành liên hệ tư vấn
                  </button>
                )}
              </div>
            )}
            {tab === "hero" ? (
              <HeroEditor
                value={selected.data as unknown as HeroConfig}
                references={references}
                onChange={(data) => {
                  setSelected({
                    ...selected,
                    data: data as unknown as Record<string, EditorValue>,
                  });
                  setDirty(true);
                }}
              />
            ) : (
              <Editor
                references={references}
                value={selected.data}
                locked={selected.revision > 0}
                onChange={(data) => {
                  setSelected({
                    ...selected,
                    data: data as Record<string, EditorValue>,
                  });
                  setDirty(true);
                }}
              />
            )}
            <div className="adm-savebar">
              <button disabled={busy} onClick={() => void save("save")}>
                Lưu bản nháp
              </button>
              <button
                className="adm-primary"
                disabled={busy}
                onClick={() => void save("publish")}
              >
                {busy ? "Đang lưu…" : "Xuất bản thay đổi ↗"}
              </button>
              {!["settings", "messages", "hero", "landing"].includes(tab) && (
                <button
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      const ok = await requestConfirm({
                        title: "Ẩn nội dung khỏi website?",
                        body: "Nội dung sẽ gỡ khỏi trang public nhưng bản nháp vẫn được giữ lại.",
                        confirmLabel: "Ẩn khỏi website",
                        danger: false,
                      });
                      if (ok) void save("unpublish");
                    })();
                  }}
                >
                  Ẩn khỏi website
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            <div className="adm-stats">
              {[
                [
                  "Tất cả nội dung",
                  rows.filter((r) => r.state !== "deleted").length,
                ],
                [
                  "Đang xuất bản",
                  rows.filter((r) => r.state === "published").length,
                ],
                ["Bản nháp", rows.filter((r) => r.state === "draft").length],
                ["Thùng rác", rows.filter((r) => r.state === "deleted").length],
              ].map(([label, count]) =>
                label === "Thùng rác" &&
                !["messages", "settings", "hero", "landing"].includes(tab) ? (
                  <button
                    key={label}
                    type="button"
                    className="adm-stat-btn"
                    onClick={() => setTrashOpen(true)}
                    title={`Mở thùng rác ${tabLabel} — giữ ${TRASH_RETENTION_DAYS} ngày`}
                  >
                    <span>{label} 🗑</span>
                    <strong>{count}</strong>
                    <small>
                      {trashUrgentCount > 0
                        ? `${trashUrgentCount} mục sắp bị xóa vĩnh viễn · Bấm để xem`
                        : `Tự xóa sau ${TRASH_RETENTION_DAYS} ngày · Bấm để xem`}
                    </small>
                  </button>
                ) : (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                    <small>Sẵn sàng cho hành trình tiếp theo</small>
                  </div>
                ),
              )}
            </div>
            <section className="adm-panel">
              <div className="adm-toolbar">
                <input
                  aria-label="Tìm nội dung"
                  placeholder="Tìm nội dung của bạn…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <AdmFilterSelect
                  value={filter}
                  onChange={setFilter}
                  options={[
                    {
                      value: "all",
                      label: "Tất cả",
                      count: rows.filter((r) => r.state !== "deleted").length,
                    },
                    {
                      value: "published",
                      label: "Đang xuất bản",
                      count: rows.filter((r) => r.state === "published").length,
                    },
                    {
                      value: "draft",
                      label: "Bản nháp",
                      count: rows.filter((r) => r.state === "draft").length,
                    },
                    {
                      value: "deleted",
                      label: "Thùng rác",
                      count: deletedCount,
                    },
                  ]}
                />
                <button
                  type="button"
                  className={`adm-trash-btn${trashOpen || filter === "deleted" ? " adm-trash-btn--active" : ""}`}
                  onClick={() => setTrashOpen(true)}
                  aria-pressed={trashOpen}
                  title={`Xem ${deletedCount} mục trong thùng rác — tự xóa sau ${TRASH_RETENTION_DAYS} ngày`}
                >
                  🗑 Thùng rác · {TRASH_RETENTION_DAYS} ngày
                  <span className="adm-trash-count">{deletedCount}</span>
                </button>
                {!["messages", "settings", "hero", "landing"].includes(tab) && (
                  <button
                    className="adm-primary"
                    disabled={busy}
                    onClick={create}
                  >
                    ＋ Thêm mới
                  </button>
                )}
              </div>
              {tab === "tours" && filter !== "deleted" && (
                <div className="adm-tour-chips" role="group" aria-label="Lọc tour">
                  <div className="adm-chip-row" role="group" aria-label="Thời lượng">
                    {(
                      [
                        ["all", "Tất cả"],
                        ["1day", `1 ngày (${countBy("1day", "all")})`],
                        ["multi", `Nhiều ngày (${countBy("multi", "all")})`],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className="adm-chip-btn"
                        data-active={durationFilter === value}
                        aria-pressed={durationFilter === value}
                        onClick={() => setDurationFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="adm-chip-row" role="group" aria-label="Tuyến tour">
                    {(
                      [
                        ["all", "Mọi tuyến"],
                        ["qnpy", `QN – Phú Yên (${countBy("all", "qnpy")})`],
                        ["domestic", `Trong nước (${countBy("all", "domestic")})`],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className="adm-chip-btn adm-chip-btn--line"
                        data-active={lineFilter === value}
                        aria-pressed={lineFilter === value}
                        onClick={() => setLineFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {filter === "deleted" && (
                <p className="adm-trash-note" role="note">
                  🗑 Thùng rác giữ nội dung đã xóa trong {TRASH_RETENTION_DAYS}{" "}
                  ngày rồi tự xóa vĩnh viễn. Cần gấp? Khôi phục thành bản nháp
                  để giữ lại.
                </p>
              )}
              <div className="adm-records">
                {tourSections ? (
                  tourSections.map((section) => (
                    <section key={section.key} className="adm-tour-group">
                      <header className="adm-tour-group-head">
                        <h3>{section.title}</h3>
                        <span className="adm-tour-group-count">
                          {section.items.length} tour
                        </span>
                      </header>
                      {section.items.map((row) => renderTourCard(row))}
                    </section>
                  ))
                ) : articleSections ? (
                  articleSections.map((section) => (
                    <section key={section.key} className="adm-tour-group">
                      <header className="adm-tour-group-head adm-article-group-head">
                        <div>
                          <h3>{section.title}</h3>
                          <p>{section.hint}</p>
                        </div>
                        <span className="adm-tour-group-count">
                          {section.items.length} bài
                        </span>
                      </header>
                      {section.items.map((row) => renderArticleCard(row))}
                    </section>
                  ))
                ) : tab === "articles" ? (
                  visibleRows.map((row) => renderArticleCard(row))
                ) : (
                  visibleRows.map((row) => (
                    <article key={row.id}>
                      <div className="adm-record-mark">
                        {tabs.find((t) => t[0] === tab)?.[2]}
                      </div>
                      <div className="adm-record-copy">
                        <span className={`adm-badge ${row.state}`}>
                          {row.state === "published"
                            ? "Đang xuất bản"
                            : row.state === "deleted"
                              ? "Thùng rác"
                              : "Bản nháp"}
                        </span>
                        <h2>
                          {tab === "hero"
                            ? "Section đầu trang chủ"
                            : tab === "landing"
                              ? "Các khối trang chủ (finder/story/FAQ/explore/regions/values)"
                              : String(row.data.title ?? row.data.name ?? row.id)}
                        </h2>
                        <p>
                          {String(
                            row.data.summary ??
                              row.data.excerpt ??
                              row.data.description ??
                              row.data.slug ??
                              row.id,
                          ).slice(0, 120)}
                        </p>
                        <small>
                          {new Date(row.updated_at).toLocaleDateString("vi-VN")}{" "}
                          · v{row.revision}
                          {row.state === "deleted" &&
                            (() => {
                              const left = trashDaysLeft(row.updated_at);
                              return left === null ? null : (
                                <>
                                  {" "}·{" "}
                                  <span className="adm-trash-left">
                                    Còn {left} ngày — tự xóa vĩnh viễn sau{" "}
                                    {TRASH_RETENTION_DAYS} ngày
                                  </span>
                                </>
                              );
                            })()}
                        </small>
                      </div>
                      <div className="adm-record-actions">
                        <button
                          onClick={() => {
                            setSelected(row);
                            setDirty(false);
                          }}
                        >
                          Chỉnh sửa ↗
                        </button>
                        {!["settings", "messages", "hero", "landing"].includes(
                          tab,
                        ) && (
                          <button onClick={() => trashOrRestore(row)}>
                            {row.state === "deleted" ? "Khôi phục" : "Thùng rác"}
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
              {loading && !rows.length ? (
                <p className="adm-empty">Nội dung đang được tải…</p>
              ) : (
                !visibleRows.length && (
                  <p className="adm-empty">
                    {filter === "deleted"
                      ? "Thùng rác trống. Nội dung đã xóa sẽ xuất hiện tại đây và có thể khôi phục thành bản nháp."
                      : search
                        ? "Không tìm thấy nội dung phù hợp với tìm kiếm."
                        : "Chưa có nội dung ở trạng thái này."}
                  </p>
                )
              )}
            </section>
          </>
        )}
        {trashOpen && (
          <div
            className="adm-trash-veil"
            role="dialog"
            aria-modal="true"
            aria-label={`Thùng rác ${tabLabel}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) setTrashOpen(false);
            }}
          >
            <section className="adm-trash-panel">
              <header className="adm-trash-head">
                <div>
                  <p className="adm-eyebrow">SEA TRIP · Thùng rác</p>
                  <h2>
                    🗑 {tabLabel} · {trashRows.length} mục
                  </h2>
                  <p>
                    Mỗi mục được giữ {TRASH_RETENTION_DAYS} ngày kể từ lúc xóa
                    rồi hệ thống tự xóa vĩnh viễn. Khôi phục để đưa về bản
                    nháp — chưa xuất bản lên website.
                  </p>
                </div>
                <button
                  type="button"
                  className="adm-trash-close"
                  aria-label="Đóng thùng rác"
                  onClick={() => setTrashOpen(false)}
                >
                  ×
                </button>
              </header>
              <div className="adm-trash-summary" role="status">
                <div>
                  <span>Đang giữ</span>
                  <strong>{trashRows.length}</strong>
                </div>
                <div data-urgent={trashUrgentCount > 0}>
                  <span>Sắp xóa ≤ 7 ngày</span>
                  <strong>{trashUrgentCount}</strong>
                </div>
                <div>
                  <span>Chu kỳ giữ</span>
                  <strong>{TRASH_RETENTION_DAYS} ngày</strong>
                </div>
              </div>
              {trashRows.length === 0 ? (
                <p className="adm-empty">
                  Thùng rác trống. Nội dung bạn chuyển vào thùng rác sẽ nằm ở
                  đây đủ {TRASH_RETENTION_DAYS} ngày trước khi tự xóa vĩnh
                  viễn.
                </p>
              ) : (
                <ul className="adm-trash-list">
                  {[...trashRows]
                    .sort((a, b) =>
                      String(a.updated_at).localeCompare(String(b.updated_at)),
                    )
                    .map((row) => {
                      const meta = trashMetaOf(row);
                      const title = String(
                        row.data.title ?? row.data.name ?? row.id,
                      );
                      const cover =
                        tab === "articles"
                          ? articleCoverSrcOf(row.data)
                          : coverSrcOf(row.data);
                      const urgent =
                        meta.left !== null && meta.left <= 7;
                      return (
                        <li
                          key={row.id}
                          className="adm-trash-item"
                          data-urgent={urgent}
                        >
                          <div
                            className="adm-trash-thumb"
                            aria-hidden="true"
                          >
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt="" loading="lazy" />
                            ) : (
                              <span>🗑</span>
                            )}
                          </div>
                          <div className="adm-trash-body">
                            <h3>{title}</h3>
                            <p className="adm-trash-dates">
                              Xóa lúc: {meta.deletedLabel} · Tự xóa vĩnh viễn:{" "}
                              {meta.deleteAtLabel}
                            </p>
                            <div
                              className="adm-trash-bar"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={TRASH_RETENTION_DAYS}
                              aria-valuenow={
                                meta.left === null
                                  ? undefined
                                  : TRASH_RETENTION_DAYS - meta.left
                              }
                              aria-label={`Còn ${meta.left ?? "?"} ngày trước khi tự xóa`}
                            >
                              <span
                                style={{
                                  width: `${Math.round((meta.ratio ?? 0) * 100)}%`,
                                }}
                              />
                            </div>
                            <p
                              className={`adm-trash-countdown${urgent ? " adm-trash-countdown--urgent" : ""}`}
                            >
                              {meta.left === null
                                ? "Không rõ hạn xóa"
                                : meta.left === 0
                                  ? "Sẽ tự xóa vĩnh viễn trong hôm nay"
                                  : `Còn ${meta.left} / ${TRASH_RETENTION_DAYS} ngày — tự xóa vĩnh viễn`}
                            </p>
                          </div>
                          <div className="adm-trash-actions">
                            <button
                              type="button"
                              className="adm-primary"
                              onClick={() => trashOrRestore(row)}
                            >
                              Khôi phục
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTrashOpen(false);
                                setSelected(row);
                                setDirty(false);
                              }}
                            >
                              Xem / Sửa
                            </button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
              <footer className="adm-trash-foot">
                <span>
                  Mẹo: khôi phục xong bấm “Xuất bản thay đổi” thì nội dung mới
                  hiện lại trên website.
                </span>
                <button type="button" onClick={() => setTrashOpen(false)}>
                  Đóng thùng rác
                </button>
              </footer>
            </section>
          </div>
        )}
        <ToastStack items={toasts} onClose={dismissToast} />
        <ConfirmModal
          request={confirmReq}
          busy={busy}
          onCancel={() => settleConfirm(false)}
          onConfirm={() => settleConfirm(true)}
        />
        <footer className="adm-footnote">
          SEA TRIP STUDIO · Nội dung tốt tạo nên những kết nối đẹp.
        </footer>
      </main>
    </div>
  );
}
