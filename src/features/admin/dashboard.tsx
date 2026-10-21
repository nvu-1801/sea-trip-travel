"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Editor, type EditorValue, type ReferenceOptions } from "./editor";
import { useContentUpdates } from "@/lib/use-content-updates";
import { HeroEditor } from "./hero-editor";
import { Overview } from "./overview";
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
  ["tours", "Tour du lịch", "◈"],
  ["articles", "Cẩm nang", "▤"],
  ["categories", "Danh mục", "▦"],
  ["destinations", "Điểm đến", "◎"],
  ["hero", "Giao diện trang chủ", "◫"],
  ["landing", "Trang chủ sections", "▦"],
  ["media", "Thư viện ảnh", "▧"],
  ["messages", "Nội dung VI / EN", "Aa"],
  ["settings", "Website & footer", "⚙"],
  ["leads", "Yêu cầu tư vấn", "✉"],
  ["account", "Bảo mật", "◇"],
];
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
  hero: {
    purpose:
      "Chọn giữa carousel ảnh lớn và bố cục ảnh ghép cho section đầu trang chủ.",
    steps: [
      "Chỉnh sửa cấu hình home, chọn kiểu section đầu.",
      "Chọn ảnh từ thư viện; chỉnh vị trí ngang/dọc để giữ chủ thể trên màn hình nhỏ.",
      "Nhập nội dung tiếng Việt/English và các đường dẫn CTA nội bộ.",
      "Carousel cho phép thêm, bỏ, đổi thứ tự slide và bật/tắt tự chuyển.",
      "Lưu nháp chưa đổi website. Xuất bản để các trang đang mở cập nhật trong khoảng 5 giây.",
    ],
    required:
      "Luôn giữ 1–8 slide, mô tả ảnh, chú thích VI/EN; đường dẫn nút bắt đầu bằng /.",
    result:
      "Chuyển kiểu không làm mất cấu hình của kiểu còn lại. Bỏ slide không xoá file ảnh.",
    pitfalls:
      "Tự chuyển dừng khi giảm chuyển động, tab ẩn hoặc thao tác bàn phím. Ảnh mới tải ở Thư viện ảnh trước khi chọn.",
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
  landing: {
    purpose: "Sửa các khối trang chủ mà tab khác không bao phủ: gợi ý tìm kiếm, câu chuyện, FAQ, tiêu đề Explore/Regions, ảnh Values.",
    steps: [
      "Mở bản ghi home-sections rồi bấm Chỉnh sửa.",
      "Sửa gợi ý QuickFinder (label + query), mốc story, câu hỏi FAQ (VI + EN).",
      "Đổi tiêu đề Explore/Regions, tâm trạng vùng miền, ảnh + huy hiệu Values (chọn từ thư viện media).",
      "Lưu nháp rồi Xuất bản thay đổi để lên web ngay, không cần build lại.",
    ],
    required: "Giữ ít nhất 1 gợi ý, 1 mốc story, 1 FAQ; ảnh Values phải là đường dẫn /... trong thư viện.",
    result: "Trang chủ cập nhật ngay sau xuất bản; bản nháp không ảnh hưởng web.",
    pitfalls: "Xoá hết mảng sẽ bị schema từ chối — để trống 1 mục thay vì xoá sạch.",
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
    [filter, setFilter] = useState("all");
  const [references, setReferences] = useState<ReferenceOptions>({});
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
      const result =
        next === "leads"
          ? await api("leads")
          : next === "media" || next === "account"
            ? null
            : await api(`content/${next}`);
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
  function switchTab(next: string) {
    if (dirty && !confirm("Bạn có thay đổi chưa lưu. Rời màn hình này?"))
      return;
    loadSerial.current++;
    setSelected(null);
    setDirty(false);
    setRows([]);
    setSearch("");
    setFilter("all");
    setHelpOpen(false);
    setTab(next);
    setNotice("");
  }
  async function save(action: string) {
    if (!selected) return;
    await run(async () => {
      await api(`content/${tab}`, {
        method: "POST",
        body: JSON.stringify({
          data: selected.data,
          revision: selected.revision,
          action,
        }),
      });
      await load();
      setNotice(
        action === "publish"
          ? "Đã xuất bản. Nội dung mới có hiệu lực trên website."
          : action === "unpublish"
            ? "Đã ẩn khỏi website. Bản nháp vẫn được giữ lại."
            : action === "delete"
              ? "Đã chuyển vào Thùng rác. Mở bộ lọc Thùng rác để xem hoặc khôi phục."
              : action === "restore"
                ? "Đã khôi phục thành bản nháp."
                : "Đã lưu thay đổi.",
      );
      if (action === "restore") setFilter("all");
    });
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
  const visibleRows = rows.filter(
    (row) =>
      (filter === "all" ? row.state !== "deleted" : row.state === filter) &&
      JSON.stringify(row.data).toLowerCase().includes(search.toLowerCase()),
  );
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
          {tabs.map(([key, label, icon]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => switchTab(key)}
            >
              <span>{icon}</span>
              {label}
            </button>
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
              if (dirty && !confirm("Bỏ thay đổi chưa lưu và đăng xuất?"))
                return;
              await api("auth", { method: "DELETE" });
              setCsrf(null);
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
                if (
                  dirty &&
                  !confirm("Tải cập nhật sẽ bỏ thay đổi chưa lưu. Tiếp tục?")
                )
                  return;
                void load();
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
                            setNotice("Đã cập nhật khách hàng");
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
                            setNotice("Đã gửi lại email thông báo.");
                          })
                        }
                      >
                        Gửi lại email
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Xóa vĩnh viễn dữ liệu khách hàng này?"))
                            void run(async () => {
                              await api("leads", {
                                method: "DELETE",
                                body: JSON.stringify({ id: lead.id }),
                              });
                              await load();
                            });
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
                      setNotice(
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
                            setNotice("Đã lưu mô tả ảnh trong thư viện.");
                          })
                        }
                      >
                        Lưu mô tả
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(item.src)
                        .then(() => setNotice("Đã sao chép đường dẫn ảnh"))
                    }
                  >
                    Sao chép đường dẫn
                  </button>
                  <button
                    disabled={item.original}
                    onClick={() => {
                      if (confirm("Xóa ảnh chưa sử dụng?"))
                        void run(async () => {
                          await api("media", {
                            method: "DELETE",
                            body: JSON.stringify({ id: item.id }),
                          });
                          await load();
                        });
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
        ) : selected ? (
          <section className="adm-panel adm-edit">
            <div className="adm-editor-header">
              <div>
                <button
                  onClick={() => {
                    if (!dirty || confirm("Bỏ thay đổi chưa lưu?")) {
                      setSelected(null);
                      setDirty(false);
                    }
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
                    if (confirm("Ẩn nội dung này khỏi website?"))
                      void save("unpublish");
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
              ].map(([label, count]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                  <small>Sẵn sàng cho hành trình tiếp theo</small>
                </div>
              ))}
            </div>
            <section className="adm-panel">
              <div className="adm-toolbar">
                <input
                  aria-label="Tìm nội dung"
                  placeholder="Tìm nội dung của bạn…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Trạng thái nội dung"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="published">Đang xuất bản</option>
                  <option value="draft">Bản nháp</option>
                  <option value="deleted">
                    Thùng rác (
                    {rows.filter((r) => r.state === "deleted").length})
                  </option>
                </select>
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
              <div className="adm-records">
                {visibleRows.map((row) => (
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
                        {new Date(row.updated_at).toLocaleDateString("vi-VN")} ·
                        v{row.revision}
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
                      {!["settings", "messages", "hero", "landing"].includes(tab) && (
                        <button
                          onClick={() => {
                            const action =
                              row.state === "deleted" ? "restore" : "delete";
                            if (
                              confirm(
                                action === "delete"
                                  ? "Chuyển nội dung vào thùng rác?"
                                  : "Khôi phục thành bản nháp?",
                              )
                            )
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
                                  setNotice("Đã khôi phục thành bản nháp.");
                                } else {
                                  setNotice(
                                    "Đã chuyển vào Thùng rác. Mở bộ lọc Thùng rác để xem hoặc khôi phục.",
                                  );
                                }
                              });
                          }}
                        >
                          {row.state === "deleted" ? "Khôi phục" : "Thùng rác"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
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
        <footer className="adm-footnote">
          SEA TRIP STUDIO · Nội dung tốt tạo nên những kết nối đẹp.
        </footer>
      </main>
    </div>
  );
}
