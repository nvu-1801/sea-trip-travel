"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Editor, type EditorValue, type ReferenceOptions } from "./editor";
import { TourEditor, type TourEditorHandle } from "./tour-editor";
import {
  DestinationEditor,
  type DestinationEditorHandle,
} from "./destination-editor";
import { useContentUpdates } from "@/lib/use-content-updates";
import { HeroEditor } from "./hero-editor";
import { ThemePanel } from "./theme-panel";
import type { ThemeId } from "@/config/themes";
import { Overview } from "./overview";
import { ActivityCheck } from "./activity-check";
import { HomeSections } from "./home-sections";
import { HomeFeaturedEditor } from "./home-featured-editor";
import type { HomeSectionMeta } from "@/lib/home-sections";
import { HOME_SECTIONS } from "@/lib/home-sections";
import {
  ToastStack,
  ConfirmModal,
  type ConfirmRequest,
  type ToastItem,
  type ToastKind,
} from "./notify";
import { AdmFilterSelect, AdmLeadStatusSelect } from "./ui-select";
import { mediaSelectOptions } from "@/lib/admin-media-options";
import { adminSectionHref } from "@/lib/admin-routes";
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
import { AssetImage } from "@/components/ui/asset-image";
import { homeSectionDraft } from "@/lib/admin-home-draft";
import { AdminIcon, type AdminIconName } from "./admin-icons";
import { SearchIcon } from "@/components/ui/icons";
import { searchKey } from "@/lib/search";
import {
  ADMIN_SEARCH_GROUP_LABELS,
  rankAdminSearch,
  type AdminSearchItem,
  type AdminSearchKind,
} from "@/lib/admin-search";
/** Mirrors `MAX_HOME_DESTINATIONS`; kept local so the client bundle skips zod. */
const HOME_DESTINATION_LIMIT = 3;
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

/** One row in the header quick-search palette. */
type QuickEntry = {
  key: string;
  kind: "nav" | AdminSearchKind;
  tab: string;
  id?: string;
  slug?: string;
  title: string;
  subtitle: string;
  status?: string;
};
const tabs = [
  ["overview", "Tổng quan", "overview"],
  ["home", "Trang chủ", "home"],
  ["theme", "Giao diện", "theme"],
  ["tours", "Tour du lịch", "tours"],
  ["articles", "Cẩm nang", "articles"],
  ["categories", "Danh mục", "categories"],
  ["destinations", "Điểm đến", "destinations"],
  ["media", "Thư viện ảnh", "media"],
  ["messages", "Nội dung VI / EN", "messages"],
  ["settings", "Website & footer", "settings"],
  ["leads", "Yêu cầu tư vấn", "leads"],
  ["activity", "Kiểm tra hoạt động", "activity"],
  ["account", "Bảo mật", "account"],
] as const;
const TAB_GROUPS: { label: string | null; keys: string[] }[] = [
  { label: null, keys: ["overview", "activity"] },
  {
    label: "Nội dung website",
    keys: ["home", "theme", "tours", "articles", "categories", "destinations", "media"],
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
  theme: {
    purpose:
      "Chọn giao diện màu sắc cho toàn bộ landing page public: nền, chữ, nút, liên kết, thẻ tour và menu.",
    steps: [
      "Bấm một theme để xem trước ngay trong khung bên phải.",
      "Kiểm tra độ dễ đọc của chữ, nút và thẻ ở cả desktop lẫn mobile.",
      "Bấm Lưu & áp dụng để đổi website ngay; hoặc Lưu bản nháp để giữ lựa chọn cho sau.",
    ],
    required:
      "Chọn đúng một theme trong danh sách; theme hiện tại luôn có sẵn.",
    result:
      "Theme đã xuất bản được giữ sau khi tải lại và áp dụng cho mọi trang public.",
    pitfalls:
      "Studio giữ giao diện quản trị riêng. Theme không thay logo, ảnh hay bố cục nội dung.",
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
    purpose:
      "Danh mục = kệ để xếp tour, quyết định menu, trang /tour-... và breadcrumb. Tour nào muốn hiện ở tuyến nào thì gắn danh mục đó trong form tour.",
    steps: [
      "Nhìn 2 nhóm Gốc bên dưới: Quy Nhơn – Phú Yên và Tour Trong Nước — mỗi nhóm là một trang danh sách tour riêng.",
      "Bấm Chỉnh sửa để đổi tên, mô tả, ảnh, thứ tự; đường dẫn /danh-muc/... bị khóa sau lần lưu đầu để không gãy link.",
      "Muốn tour hiện ở tuyến nào: mở tab Tour du lịch → form tour → mục Danh mục → tick chọn (không gõ tay).",
      "Xuất bản danh mục mới là menu, footer và trang tuyến cập nhật ngay.",
    ],
    required:
      "Tên, đường dẫn đúng dạng /danh-muc/<slug>; danh mục con phải chọn danh mục cha, không tạo vòng lặp.",
    result:
      "Danh mục mới có trang riêng ngay sau xuất bản; đổi tên không đổi đường dẫn cũ; số tour đang dùng hiện ngay trên từng thẻ.",
    pitfalls:
      "Không xóa danh mục đang có tour hoặc danh mục con tham chiếu — gỡ liên kết trong form tour trước.",
  },
  destinations: {
    purpose:
      "Điểm đến là địa danh như Quy Nhơn, Kỳ Co – Eo Gió, Cù Lao Xanh. Đây không phải mục “Điểm nổi bật” trong nội dung riêng của một tour.",
    steps: [
      "Bật “Hiển thị trong khối Khám phá trên trang chủ” cho tối đa 3 điểm; đặt “Thứ tự trong khối Khám phá” (1 = hiện đầu tiên).",
      "Bấm Xem trước thẻ để kiểm tra đúng ảnh, tên, tóm tắt và liên kết trước khi xuất bản.",
      "Muốn tour đi qua điểm nào: mở tab Tour du lịch → form tour → mục Điểm đến → tick chọn.",
      "Lưu bản nháp để giữ thay đổi; Xuất bản để thẻ và thứ tự mới lên website.",
    ],
    required:
      "Tên, tóm tắt; ảnh nên có mô tả (alt) rõ ràng. Tối đa 3 điểm được bật Khám phá.",
    result:
      "Điểm đang bật và đã xuất bản hiện thành thẻ Khám phá theo thứ tự bạn đặt. Điểm gắn vào tour vẫn hiện trên thẻ tour, thông tin tour và tìm kiếm dù đang tắt Khám phá.",
    pitfalls:
      "Đã đủ 3/3 thì không bật thêm được — tắt bớt một điểm trước. Không xóa điểm đang được tour hoặc bài viết tham chiếu.",
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
  activity: {
    purpose:
      "Xem nhanh các thao tác quản trị gần đây và biết có hoạt động nào cần xem lại hay không.",
    steps: [
      "Chọn khoảng thời gian, admin, loại thao tác hoặc kết quả cần xem.",
      "Đọc thẻ trạng thái phía trên: bình thường, cần xem lại hay chưa đủ dữ liệu.",
      "Bấm vào một dòng để xem ai làm, làm gì, lúc nào, IP và thay đổi trước/sau.",
      "Đọc mục “Vì sao được đánh dấu?” để biết quy tắc nào đã khớp.",
    ],
    required:
      "Cần có bản ghi audit trong khoảng thời gian đã chọn; log cũ có thể thiếu người thực hiện hoặc IP.",
    result:
      "Danh sách chỉ đọc, không sửa hay xóa log. Thời gian hiển thị theo giờ Việt Nam.",
    pitfalls:
      "Log trống hoặc thiếu trường không có nghĩa là hệ thống bình thường; trang sẽ báo “Chưa đủ dữ liệu”.",
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
  section = "overview",
  initialEdit,
}: {
  initialCsrf: string | null;
  initialVersion?: string;
  /** URL section; the sidebar and quick search navigate instead of setting it. */
  section?: string;
  /** `?edit=` id/slug from a direct link or quick search. */
  initialEdit?: string;
}) {
  const tab = section;
  const [hasUpdates, setHasUpdates] = useState(false);
  const [csrf, setCsrf] = useState(initialCsrf),
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
    [lineFilter, setLineFilter] = useState<"all" | "qnpy" | "domestic">("all"),
    [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [references, setReferences] = useState<ReferenceOptions>({});
  const [qnpyIds, setQnpyIds] = useState<ReadonlySet<string>>(new Set());
  const [tourLinks, setTourLinks] = useState<
    { categoryIds: string[]; destinationIds: string[] }[]
  >([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const [confirmReq, setConfirmReq] = useState<
    (ConfirmRequest & { resolve: (ok: boolean) => void }) | null
  >(null);
  const [homeData, setHomeData] = useState<{
    hero: RecordRow | null;
    landing: RecordRow | null;
  }>({ hero: null, landing: null });
  const [themeRecord, setThemeRecord] = useState<RecordRow | null>(null);
  const [homeTours, setHomeTours] = useState<RecordRow[]>([]);
  const [homeModal, setHomeModal] = useState<
    | {
        kind: "hero";
        title: string;
        where: string;
        icon: string;
        tip: string;
        num: number;
      }
    | {
        kind: "section";
        key: string;
        title: string;
        where: string;
        icon: string;
        tip: string;
        num: number;
      }
    | null
  >(null);
  const loadSerial = useRef(0);
  const activitySerial = useRef(0);
  /** Record to open from `?edit=` when the section list arrives. */
  const pendingOpen = useRef<{
    tab: string;
    id: string;
    slug?: string;
  } | null>(
    initialEdit
      ? { tab: section, id: initialEdit, slug: initialEdit }
      : null,
  );
  /** Set just before a confirmed document navigation, to skip beforeunload. */
  const skipUnload = useRef(false);
  const dirtyFields = useRef(new Set<string>());
  const tourEditorRef = useRef<TourEditorHandle>(null);
  const destinationEditorRef = useRef<DestinationEditorHandle>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const quickButtonRef = useRef<HTMLButtonElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const quickDialogRef = useRef<HTMLDivElement>(null);
  const sectionDialogRef = useRef<HTMLDivElement>(null);
  const sectionBodyRef = useRef<HTMLDivElement>(null);
  const quickFetchedAt = useRef(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickItems, setQuickItems] = useState<AdminSearchItem[] | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickActive, setQuickActive] = useState(0);
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
  const [mediaQuery, setMediaQuery] = useState("");
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [remember, setRemember] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [trashOpen, setTrashOpen] = useState(false),
    [homePreview, setHomePreview] = useState<RecordRow | null>(null),
    [current, setCurrent] = useState(""),
    [showCurrentPw, setShowCurrentPw] = useState(false),
    [showNewPw, setShowNewPw] = useState(false);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !skipUnload.current) {
        e.preventDefault();
        e.returnValue = "";
      }
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
  useEffect(() => {
    if (!homeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHomeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [homeModal]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lock the page behind the section modal: otherwise the document scrollbar
  // stays visible next to the modal and the wheel chains to the page once the
  // modal body reaches its end. Focus moves into the modal body and returns to
  // the trigger on close, so keyboard users never land on the dimmed page.
  useEffect(() => {
    if (!homeModal) return;
    const { body, documentElement } = document;
    const dialog = sectionDialogRef.current;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollbarGap = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;
    sectionBodyRef.current?.focus({ preventScroll: true });

    const focusables = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null)
        : [];

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog?.addEventListener("keydown", keepFocusInside);
    return () => {
      dialog?.removeEventListener("keydown", keepFocusInside);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [homeModal]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (quickOpen) {
          setQuickOpen(false);
          setQuickQuery("");
          setQuickActive(0);
        } else {
          void openQuickSearch();
        }
        return;
      }
      if (event.key === "Escape" && quickOpen) {
        event.preventDefault();
        setQuickOpen(false);
        setQuickQuery("");
        setQuickActive(0);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (!quickOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const trigger = quickButtonRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    quickInputRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      const target = previous && previous.isConnected ? previous : trigger;
      target?.focus();
    };
  }, [quickOpen]);
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
      if (response.status === 401) {
        skipUnload.current = true;
        window.location.replace("/admin/login?expired=1");
      }
      throw new Error(body.error ?? "Có lỗi xảy ra");
    }
    return body;
  }
  async function load(next = tab, background = false) {
    const serial = ++loadSerial.current;
    const activity = activitySerial.current;
    if (!background) setLoading(true);
    try {
      if (next === "activity") {
        // The activity page owns its own read-only feed and filters.
        setSelected(null);
        setDirty(false);
        dirtyFields.current.clear();
        setHasUpdates(false);
        return true;
      }
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
        const [heroRows, landingRows, tourRows] = await Promise.all([
          api("content/hero").catch(() => null),
          api("content/landing").catch(() => null),
          api("content/tours").catch(() => null),
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
        setHomeTours((tourRows as RecordRow[] | null) ?? []);
        setReferences({
          ...options,
          media: mediaSelectOptions(library),
        });
        setSelected(null);
        setDirty(false);
        dirtyFields.current.clear();
        setHasUpdates(false);
        return true;
      }
      if (next === "theme") {
        const themeRows = (await api("content/theme")) as RecordRow[];
        if (
          serial !== loadSerial.current ||
          (background && activity !== activitySerial.current)
        )
          return false;
        setReferences({
          ...options,
          media: mediaSelectOptions(library),
        });
        setThemeRecord(themeRows.find((row) => row.id === "site") ?? null);
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
      // Category/destination tabs show live tour usage counts, so the owner
      // sees where each entry appears before editing or trashing it.
      let links: { categoryIds: string[]; destinationIds: string[] }[] = [];
      if (next === "categories" || next === "destinations") {
        try {
          const tourRows = (await api("content/tours")) as {
            data: { categoryIds?: unknown; destinationIds?: unknown };
          }[];
          links = tourRows.map((row) => ({
            categoryIds: Array.isArray(row.data.categoryIds)
              ? row.data.categoryIds.filter((v): v is string => typeof v === "string")
              : [],
            destinationIds: Array.isArray(row.data.destinationIds)
              ? row.data.destinationIds.filter((v): v is string => typeof v === "string")
              : [],
          }));
        } catch {
          links = [];
        }
      }
      if (
        serial !== loadSerial.current ||
        (background && activity !== activitySerial.current)
      )
        return false;
      setReferences({
        ...options,
        media: mediaSelectOptions(library),
      });
      setSelected(null);
      setDirty(false);
      dirtyFields.current.clear();
      if (next === "leads") setLeads(result);
      else if (next === "media") setMedia(library);
      else if (next !== "account") setRows(result);
      // Quick search / "Tour nổi bật": open the chosen record as soon as the
      // target tab's list arrives.
      const pending = pendingOpen.current;
      if (pending && pending.tab === next) {
        pendingOpen.current = null;
        const row = (result as RecordRow[]).find(
          (item) =>
            item.id === pending.id ||
            String(item.data.slug ?? "") === pending.id ||
            (pending.slug
              ? String(item.data.slug ?? "") === pending.slug
              : false),
        );
        if (row) setSelected(row);
      }
      setQnpyIds(next === "tours" ? qnpyCategoryIds(categoryTree) : new Set());
      setTourLinks(
        next === "categories" || next === "destinations" ? links : [],
      );
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
      if (tab === "account" || tab === "overview" || tab === "activity") return true;
      if (dirty || selected) {
        setHasUpdates(true);
        return false;
      }
      return load(tab, true);
    },
    onUnauthorized: () => {
      skipUnload.current = true;
      window.location.replace("/admin/login?expired=1");
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
  async function refreshMediaLibrary() {
    try {
      const library = (await api("media")) as {
        id: string;
        name: string;
        alt: string;
        src: string;
        original: boolean;
      }[];
      setMedia(library);
      setReferences((current) => ({
        ...current,
        media: mediaSelectOptions(library),
      }));
    } catch {
      // Thư viện sẽ đồng bộ ở lần tải trang sau; ảnh vừa tải vẫn dùng được ngay.
    }
  }
  async function uploadImage(file: File): Promise<{ src: string; alt: string }> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new Error("Chỉ nhận file JPEG, PNG hoặc WebP.");
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Ảnh vượt quá 10 MB.");
    const uploaded = (await api("media", {
      method: "POST",
      headers: {
        "content-type": file.type,
        "x-image-alt": encodeURIComponent(file.name),
      },
      body: file,
    })) as { src: string; alt: string };
    if (!uploaded?.src) throw new Error("Máy chủ không trả về ảnh.");
    await refreshMediaLibrary();
    pushToast("success", "Đã tải ảnh lên thư viện.");
    return { src: uploaded.src, alt: uploaded.alt ?? file.name };
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
  async function navigateTo(
    next: string,
    open?: { id: string; slug?: string },
  ) {
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
    skipUnload.current = true;
    // Deliberate document navigation: it gives Back/Forward and beforeunload
    // the browser's native unsaved-changes guard.
    window.location.href = adminSectionHref(next, open);
  }

  function leaveToWebsite() {
    void (async () => {
      if (
        dirty &&
        !(await requestConfirm({
          title: "Về website?",
          body: "Bạn có thay đổi chưa lưu. Về website sẽ bỏ các thay đổi đó; phiên đăng nhập vẫn được giữ.",
          confirmLabel: "Về website",
          danger: false,
        }))
      )
        return;
      skipUnload.current = true;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    })();
  }

  function logoutFromStudio() {
    void (async () => {
      if (
        dirty &&
        !(await requestConfirm({
          title: "Đăng xuất khỏi Studio?",
          body: "Bạn có thay đổi chưa lưu. Đăng xuất sẽ bỏ các thay đổi đó.",
          confirmLabel: "Đăng xuất",
          danger: true,
        }))
      )
        return;
      await run(async () => {
        await api("auth", { method: "DELETE" });
        skipUnload.current = true;
        window.location.replace("/admin/login?loggedOut=1");
      });
    })();
  }
  function closeQuickSearch() {
    setQuickOpen(false);
    setQuickQuery("");
    setQuickActive(0);
  }
  async function openQuickSearch() {
    setQuickOpen(true);
    setQuickQuery("");
    setQuickActive(0);
    if (quickItems && Date.now() - quickFetchedAt.current < 30_000) return;
    setQuickLoading(true);
    try {
      const payload = (await api("search-index")) as {
        items?: AdminSearchItem[];
      };
      setQuickItems(Array.isArray(payload.items) ? payload.items : []);
      quickFetchedAt.current = Date.now();
    } catch (error) {
      setQuickItems([]);
      setNotice(
        error instanceof Error
          ? error.message
          : "Không tải được dữ liệu tìm kiếm.",
      );
    } finally {
      setQuickLoading(false);
    }
  }
  function chooseQuick(entry: QuickEntry) {
    closeQuickSearch();
    if (entry.kind === "nav") {
      void navigateTo(entry.tab);
      return;
    }
    if (tab === entry.tab) {
      const row = rows.find(
        (item) =>
          item.id === entry.id ||
          (entry.slug
            ? String(item.data.slug ?? "") === entry.slug
            : false),
      );
      if (row) {
        setSelected(row);
        return;
      }
    }
    void navigateTo(entry.tab, { id: entry.id ?? "", slug: entry.slug });
  }
  async function save(action: string, collection: string = tab): Promise<boolean> {
    if (!selected) return false;
    if (
      collection === "tours" &&
      tab === "tours" &&
      (action === "save" || action === "publish") &&
      tourEditorRef.current &&
      !tourEditorRef.current.validate()
    ) {
      setNotice(
        "Còn mục chưa hợp lệ. Kiểm tra danh sách lỗi phía trên form trước khi lưu.",
      );
      return false;
    }
    if (
      collection === "destinations" &&
      tab === "destinations" &&
      (action === "save" || action === "publish") &&
      destinationEditorRef.current &&
      !destinationEditorRef.current.validate()
    ) {
      setNotice(
        "Còn mục chưa hợp lệ. Kiểm tra danh sách lỗi phía trên form trước khi lưu.",
      );
      return false;
    }
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
  async function saveTheme(theme: ThemeId, action: "save" | "publish") {
    if (!themeRecord) return;
    await run(async () => {
      await api("content/theme", {
        method: "POST",
        body: JSON.stringify({
          data: { ...themeRecord.data, theme },
          revision: themeRecord.revision,
          action,
        }),
      });
      await load("theme");
      pushToast(
        "success",
        action === "publish"
          ? "Đã lưu và áp dụng giao diện mới trên website."
          : "Đã lưu nháp giao diện. Xuất bản để áp dụng.",
      );
    });
  }
  /**
   * Single sticky action bar for the record editor. It sits above the form and
   * stays in view while scrolling, so it never covers the last field.
   */
  function editorActions() {
    return (
      <div className="adm-savebar adm-edit-actions">
        <span className="adm-edit-status" aria-live="polite">
          {busy
            ? "Đang lưu thay đổi…"
            : dirty
              ? "Có thay đổi chưa lưu"
              : "Chưa có thay đổi"}
        </span>
        <div className="adm-edit-buttons">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("save")}
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            className="adm-primary"
            disabled={busy}
            onClick={() => void save("publish")}
          >
            {busy ? "Đang lưu…" : "Xuất bản thay đổi ↗"}
          </button>
          {!["settings", "messages", "hero", "landing"].includes(tab) && (
            <button
              type="button"
              className="adm-hide-action"
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
      </div>
    );
  }
  function openHomeEditor(meta: HomeSectionMeta) {
    const record = meta.key === "hero" ? homeData.hero : homeData.landing;
    if (!record) {
      pushToast("error", "Chưa tải được dữ liệu trang chủ. Hãy tải lại trang.");
      return;
    }
    const num = HOME_SECTIONS.findIndex((s) => s.key === meta.key) + 1;
    // Rows written before a landing section existed have no key. Merge the
    // defaults under the saved record so the modal never opens with an
    // undefined value (which used to crash the generic editor).
    const data = homeSectionDraft(record.data, meta.key) as Record<
      string,
      EditorValue
    >;
    setSelected({
      ...record,
      data,
    });
    setDirty(false);
    setHomeModal(
      meta.key === "hero"
        ? {
            kind: "hero",
            title: meta.title,
            where: meta.where,
            icon: meta.icon,
            tip: meta.tip,
            num,
          }
        : {
            kind: "section",
            key: meta.key,
            title: meta.title,
            where: meta.where,
            icon: meta.icon,
            tip: meta.tip,
            num,
          },
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
  function editTourFromHome(key: string) {
    void navigateTo("tours", { id: key, slug: key });
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
    // A new destination must start opted out of the home block: copying the
    // template row would otherwise consume one of the three public slots.
    if (tab === "destinations") {
      data.showOnHome = false;
      data.homeOrder = 0;
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
  const filteredMedia = (() => {
    const needle = mediaQuery.trim().toLowerCase();
    if (!needle) return media;
    return media.filter((item) =>
      `${item.alt} ${item.name} ${item.src}`.toLowerCase().includes(needle),
    );
  })();
  const tabPosition = tabs.findIndex((entry) => entry[0] === tab);
  const tabGroup =
    TAB_GROUPS.find((group) => group.keys.includes(tab))?.label ?? "Studio";

  /* --- Quick search palette --------------------------------------------- */
  const quickNeedle = quickQuery.trim();
  const quickNav: QuickEntry[] = tabs
    .filter(([key, label]) => {
      if (!quickNeedle) return true;
      const needle = searchKey(quickNeedle).replace(/\s+/g, "");
      return searchKey(`${label} ${key}`)
        .replace(/\s+/g, "")
        .includes(needle);
    })
    .map(([key, label]) => ({
      key: `nav:${key}`,
      kind: "nav" as const,
      tab: key,
      title: label,
      subtitle: "Trang quản trị",
    }))
    .slice(0, quickNeedle ? 6 : tabs.length);
  const quickGroups = rankAdminSearch(quickItems ?? [], quickNeedle);
  const quickEntries: QuickEntry[] = [
    ...quickNav,
    ...quickGroups.flatMap((group) =>
      group.items.map((item) => ({
        key: `${item.kind}:${item.id}`,
        kind: item.kind,
        tab: item.kind,
        id: item.id,
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle,
        status: item.status,
      })),
    ),
  ];
  const quickCursor = Math.min(
    quickActive,
    Math.max(0, quickEntries.length - 1),
  );
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
            <AdminIcon name="tours" size={28} />
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
            Card tour · {badge ?? "chưa rõ thời lượng"} ·{" "}
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
            Chỉnh sửa
          </button>
          <button onClick={() => trashOrRestore(row)}>Xoá</button>
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
            <AdminIcon name="articles" size={28} />
          )}
          {isFeatured && <span className="adm-article-flag">Nổi bật</span>}
        </div>
        <div className="adm-article-body">
          <div className="adm-tour-badges">
            <span className={`adm-badge ${row.state}`}>
              {row.state === "published" ? "Đang xuất bản" : "Bản nháp"}
            </span>
            {publishedAt && (
              <span className="adm-article-meta">{publishedAt}</span>
            )}
            {reading !== null && (
              <span className="adm-article-meta">{reading} phút đọc</span>
            )}
          </div>
          <h2>{String(data.title ?? row.id)}</h2>
          <p className="adm-article-excerpt">{excerpt.slice(0, 140)}</p>
          <p className="adm-card-place">
            {isFeatured ? "Card lớn đầu trang" : "Card lưới danh sách"} ·{" "}
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
            Chỉnh sửa
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
          <button onClick={() => trashOrRestore(row)}>Xoá</button>
        </div>
      </article>
    );
  }
  // Danh mục: nhóm theo cây cha → con để nhìn là biết trang nào chứa trang nào.
  const REGION_LABELS: Record<string, string> = {
    "quy-nhon-phu-yen": "Quy Nhơn – Phú Yên",
    "mien-bac": "Miền Bắc",
    "mien-trung": "Miền Trung",
    "mien-nam": "Miền Nam",
    "tay-nguyen": "Tây Nguyên",
  };
  const categorySections =
    tab === "categories" && filter !== "deleted" && !search
      ? (() => {
          const byId = new Map(rows.map((r) => [r.id, r]));
          const roots = visibleRows.filter(
            (r) =>
              typeof r.data.parentId !== "string" || !byId.has(r.data.parentId as string),
          );
          return roots
            .map((root) => ({
              key: root.id,
              title: `${String(root.data.name ?? root.id)} — trang tuyến chính`,
              hint: typeof root.data.path === "string" ? `Trang ${root.data.path} · chứa các nhóm con bên dưới` : undefined,
              path: typeof root.data.path === "string" ? root.data.path : "",
              items: [
                root,
                ...visibleRows.filter((r) => r.data.parentId === root.id),
              ],
            }))
            .filter((section) => section.items.length > 0);
        })()
      : null;
  const homeEnabledCount = rows.filter(
    (row) => row.state !== "deleted" && row.data.showOnHome === true,
  ).length;
  const homeSlotsFull = homeEnabledCount >= HOME_DESTINATION_LIMIT;
  const featuredTourMeta: Record<
    string,
    { price: string | null; duration: string | null; state: string }
  > = {};
  for (const row of homeTours) {
    const value = {
      price: priceLabelOf(row.data),
      duration: durationBadgeOf(row.data),
      state: row.state,
    };
    featuredTourMeta[row.id] = value;
    const slug = String(row.data.slug ?? "");
    if (slug) featuredTourMeta[slug] = value;
  }
  const homeOrderOf = (row: RecordRow) => {
    const value = row.data.homeOrder;
    return typeof value === "number" && value > 0
      ? value
      : Number.MAX_SAFE_INTEGER;
  };
  const regionOrderOf = (row: RecordRow) =>
    typeof row.data.order === "number" ? row.data.order : 0;
  // Điểm đến: một nhóm riêng cho các thẻ đang bật Khám phá (theo thứ tự hiển
  // thị), sau đó là các vùng miền với những điểm chưa bật.
  const destinationSections =
    tab === "destinations" && filter !== "deleted" && !search
      ? (() => {
          const enabled = visibleRows
            .filter((row) => row.data.showOnHome === true)
            .sort(
              (a, b) =>
                homeOrderOf(a) - homeOrderOf(b) ||
                regionOrderOf(a) - regionOrderOf(b) ||
                String(a.data.name ?? a.id).localeCompare(
                  String(b.data.name ?? b.id),
                  "vi",
                ),
            );
          const rest = visibleRows.filter(
            (row) => row.data.showOnHome !== true,
          );
          const sections: {
            key: string;
            title: string;
            hint?: string;
            items: RecordRow[];
          }[] = [];
          if (enabled.length)
            sections.push({
              key: "home",
              title: `Khám phá trang chủ · ${enabled.length}/${HOME_DESTINATION_LIMIT} điểm đang bật`,
              hint:
                "Đúng thứ tự thẻ trên landing page. Điểm phải được xuất bản mới lên web.",
              items: enabled,
            });
          for (const region of [
            "quy-nhon-phu-yen",
            "mien-bac",
            "mien-trung",
            "mien-nam",
            "tay-nguyen",
          ] as const) {
            const items = rest.filter((row) => row.data.region === region);
            if (items.length)
              sections.push({
                key: region,
                title: `${REGION_LABELS[region] ?? region} · dùng trong tour + tìm kiếm`,
                hint: "Chưa bật Khám phá — vẫn gắn được vào tour và hiện ở trang tour.",
                items,
              });
          }
          return sections;
        })()
      : null;
  function tourUsageOf(id: string, kind: "category" | "destination") {
    return tourLinks.filter((t) =>
      kind === "category"
        ? t.categoryIds.includes(id)
        : t.destinationIds.includes(id),
    ).length;
  }
  function renderTaxonomyCard(
    row: RecordRow,
    kind: "category" | "destination",
    parentName?: string,
  ) {
    const data = row.data as Record<string, EditorValue>;
    const cover =
      typeof data.image === "object" && data.image !== null
        ? String((data.image as Record<string, unknown>).src ?? "")
        : typeof data.image === "string"
          ? data.image
          : "";
    const name = String(data.name ?? row.id);
    const path = typeof data.path === "string" ? data.path : "";
    const using = tourUsageOf(row.id, kind);
    const order = typeof data.order === "number" ? data.order : null;
    const region =
      typeof data.region === "string"
        ? (REGION_LABELS[data.region] ?? data.region)
        : "";
    const province = typeof data.province === "string" ? data.province : "";
    const showOnHome = data.showOnHome === true;
    const homeLive = showOnHome && row.state === "published";
    const homeOrder =
      typeof data.homeOrder === "number" && data.homeOrder > 0
        ? data.homeOrder
        : null;
    const hasImage = Boolean(cover);
    const homeReason =
      row.state === "deleted"
        ? "đang ở Thùng rác — khôi phục và xuất bản trước khi lên trang chủ"
        : showOnHome
          ? row.state === "published"
            ? "đang là một trong các thẻ Khám phá"
            : "đang bật nhưng mới là bản nháp — xuất bản để lên trang chủ"
          : row.state !== "published"
            ? "bản nháp — xuất bản rồi bật Khám phá nếu muốn lên trang chủ"
            : homeSlotsFull
              ? `đã đủ ${HOME_DESTINATION_LIMIT}/${HOME_DESTINATION_LIMIT} điểm trên Khám phá — tắt một điểm khác để bật điểm này`
              : "đang tắt cho khối Khám phá";
    const viewHref =
      kind === "category" && path
        ? `/vi${path}`
        : `/vi/tim-tour?q=${encodeURIComponent(name.split(" – ")[0].split(" - ")[0])}`;
    return (
      <article key={row.id} className="adm-tour-card">
        <div className="adm-tour-thumb" aria-hidden="true">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" />
          ) : (
            <AdminIcon name={kind === "category" ? "categories" : "destinations"} size={28} />
          )}
        </div>
        <div className="adm-tour-body">
          <div className="adm-tour-badges">
            <span className={`adm-badge ${row.state}`}>
              {row.state === "published" ? "Đang xuất bản" : "Bản nháp"}
            </span>
            {kind === "category" ? (
              <>
                <span className="adm-tour-line">
                  {parentName ? `Con của ${parentName}` : "Danh mục Gốc"}
                </span>
                {order !== null && (
                  <span className="adm-tour-dur">Thứ tự {order}</span>
                )}
              </>
            ) : (
              <>
                <span className={`adm-home-pill ${homeLive ? "on" : "off"}`}>
                  {homeLive
                    ? "Đang hiện ở Khám phá trang chủ"
                    : "Không hiện ở trang chủ"}
                </span>
                {showOnHome && !homeLive && row.state !== "deleted" && (
                  <span className="adm-home-pill warn">
                    Đã bật · chờ xuất bản
                  </span>
                )}
                {region && <span className="adm-tour-line">{region}</span>}
                {showOnHome && homeOrder !== null && (
                  <span className="adm-tour-dur">Khám phá #{homeOrder}</span>
                )}
                {!showOnHome && order !== null && (
                  <span className="adm-tour-dur">Thứ tự vùng {order}</span>
                )}
                <span className={`adm-img-pill ${hasImage ? "on" : "off"}`}>
                  {hasImage ? "Có ảnh" : "Chưa có ảnh — dùng nền"}
                </span>
              </>
            )}
          </div>
          <h2>{name}</h2>
          <p>
            {String(
              data.tagline ?? data.summary ?? data.description ?? "",
            ).slice(0, 120) || "Chưa có mô tả — bấm Chỉnh sửa để bổ sung."}
          </p>
          <p className="adm-card-place">
            {kind === "category" ? (
              <>
                Trang <code>{path || "—"}</code> · {using} tour đang dùng
                {province ? ` · ${province}` : ""}
              </>
            ) : (
              <>
                {province ? `${province} · ` : ""}
                {using} tour đang dùng ·{" "}
                <span className="adm-home-reason">{homeReason}</span>
              </>
            )}
          </p>
          <small>
            {new Date(row.updated_at).toLocaleDateString("vi-VN")} · v
            {row.revision} · {using === 0 ? "chưa gắn vào tour nào" : `${using} tour`}
          </small>
        </div>
        <div className="adm-record-actions">
          <button
            onClick={() => {
              setSelected(row);
              setDirty(false);
            }}
          >
            Chỉnh sửa
          </button>
          {kind === "destination" && (
            <button onClick={() => setHomePreview(row)}>Xem trước thẻ</button>
          )}
          <a
            className="adm-ghost-link"
            href={viewHref}
            target="_blank"
            rel="noreferrer"
          >
            Xem trên web ↗
          </a>
          <button onClick={() => trashOrRestore(row)}>Xoá</button>
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
            SEA TRIP <small>STUDIO</small>
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
        <Link
          className="adm-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            leaveToWebsite();
          }}
        >
          SEA TRIP <small>STUDIO</small>
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
                    onClick={() => void navigateTo(key)}
                  >
                    <AdminIcon name={icon as AdminIconName} size={17} />
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
          onClick={(event) => {
            event.preventDefault();
            leaveToWebsite();
          }}
        >
          Về website <span aria-hidden="true">↗</span>
        </Link>
        <button
          type="button"
          className="adm-logout"
          onClick={logoutFromStudio}
        >
          Đăng xuất khỏi Studio
        </button>
      </aside>
      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-lead">
            <span className="adm-topbar-brand">
              SEA TRIP <b>STUDIO</b>
            </span>
            <span className="adm-topbar-slash" aria-hidden="true">
              /
            </span>
            <span className="adm-topbar-section">{tabLabel}</span>
          </div>
          <div className="adm-topbar-actions">
            {!selected &&
            ["tours", "articles", "categories", "destinations"].includes(
              tab,
            ) ? (
              <button
                type="button"
                className="adm-topbar-new"
                onClick={create}
                disabled={busy || loading}
              >
                <AdminIcon name="plus" size={15} />
                <span>Tạo mới</span>
              </button>
            ) : null}
            <button
              type="button"
              ref={quickButtonRef}
              className="adm-search"
              aria-haspopup="dialog"
              aria-expanded={quickOpen}
              aria-keyshortcuts="Control+K Meta+K"
              aria-label="Tìm kiếm nhanh trong Studio"
              onClick={() => void openQuickSearch()}
            >
              <SearchIcon className="adm-search-icon" />
              <span className="adm-search-text">
                Tìm tour, bài viết, điểm đến…
              </span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              type="button"
              ref={helpButtonRef}
              className="adm-topbar-icon"
              aria-expanded={helpOpen}
              aria-controls="adm-help-panel"
              aria-label={
                helpOpen
                  ? "Đóng hướng dẫn sử dụng"
                  : "Mở hướng dẫn sử dụng trang này"
              }
              title="Hướng dẫn sử dụng trang này"
              onClick={() => setHelpOpen((value) => !value)}
            >
              ?
            </button>
            <button
              type="button"
              className="adm-topbar-icon"
              aria-label="Mở website trong tab mới"
              title="Mở website"
              onClick={leaveToWebsite}
            >
              ↗
            </button>
            <button
              type="button"
              className="adm-avatar adm-topbar-user"
              aria-label="Bảo mật tài khoản"
              title="Bảo mật tài khoản"
              onClick={() => void navigateTo("account")}
            >
              ST
            </button>
          </div>
        </header>
        <header className="adm-masthead">
          <div className="adm-masthead-copy">
            <p className="adm-masthead-kicker">
              <span className="adm-masthead-brand">SEA TRIP</span>
              <span className="adm-masthead-sep" aria-hidden="true">
                ·
              </span>
              <span className="adm-masthead-label">Content &amp; sales</span>
            </p>
            <h1>{tabLabel}</h1>
            <p className="adm-masthead-deck">
              {tab === "activity"
                ? "Theo dõi thao tác quản trị và những điểm cần xem lại."
                : "Một nơi để chăm chút nội dung và những hành trình tiếp theo."}
            </p>
          </div>
          <div className="adm-masthead-side">
            <p className="adm-masthead-chapter">
              <span className="adm-masthead-chapter-no" aria-hidden="true">
                {String(tabPosition + 1).padStart(2, "0")}
              </span>
              <span className="adm-masthead-chapter-rule" aria-hidden="true" />
              <span>{tabGroup}</span>
            </p>
          </div>
          <span className="adm-masthead-folio" aria-hidden="true">
            {String(tabPosition + 1).padStart(2, "0")}
          </span>
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
        ) : tab === "activity" ? (
          <ActivityCheck />
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
                  skipUnload.current = true;
                  window.location.replace("/admin/login?loggedOut=1");
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
              {(
                [
                  ["Tổng yêu cầu", leads.length, "all", "leads"],
                  [
                    "Mới · cần liên hệ",
                    leads.filter((l) => l.status === "new").length,
                    "new",
                    "new",
                  ],
                  [
                    "Tiềm năng",
                    leads.filter((l) => l.status === "qualified").length,
                    "qualified",
                    "star",
                  ],
                  ["Đã chốt", leads.filter((l) => l.status === "won").length, "won", "trophy"],
                ] as const
              ).map(([label, count, value, icon]) => (
                <button
                  key={label}
                  type="button"
                  className="adm-stat-btn"
                  data-active={leadStatusFilter === value}
                  onClick={() =>
                    setLeadStatusFilter(leadStatusFilter === value ? "all" : value)
                  }
                  title={
                    value === "all"
                      ? "Xem tất cả yêu cầu"
                      : `Lọc yêu cầu: ${label}`
                  }
                >
                  <span>
                    <i aria-hidden="true">
                      <AdminIcon name={icon as AdminIconName} size={14} />
                    </i>
                    {label}
                  </span>
                  <strong>{count}</strong>
                  <small>
                    {leadStatusFilter === value
                      ? "Đang lọc · bấm để bỏ lọc"
                      : "Bấm để lọc nhanh"}
                  </small>
                </button>
              ))}
            </div>
            <section className="adm-panel">
              <div className="adm-lead-head">
                <div>
                  <h2>Chăm sóc từng yêu cầu</h2>
                  <p>
                    Đổi trạng thái bằng dropdown, ghi chú nội bộ được mã hóa,
                    rồi bấm <strong>Lưu chăm sóc</strong>.
                  </p>
                </div>
              </div>
              <div className="adm-toolbar">
                <input
                  aria-label="Tìm khách hàng"
                  placeholder="Tìm tên hoặc số điện thoại…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div
                className="adm-chip-row adm-lead-chips"
                role="group"
                aria-label="Lọc theo trạng thái"
              >
                {(
                  [
                    ["all", `Tất cả (${leads.length})`],
                    ["new", `Mới (${leads.filter((l) => l.status === "new").length})`],
                    [
                      "contacted",
                      `Đã liên hệ (${leads.filter((l) => l.status === "contacted").length})`,
                    ],
                    [
                      "qualified",
                      `Tiềm năng (${leads.filter((l) => l.status === "qualified").length})`,
                    ],
                    ["won", `Đã chốt (${leads.filter((l) => l.status === "won").length})`],
                    [
                      "lost",
                      `Chưa phù hợp (${leads.filter((l) => l.status === "lost").length})`,
                    ],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="adm-chip-btn"
                    data-active={leadStatusFilter === value}
                    aria-pressed={leadStatusFilter === value}
                    onClick={() => setLeadStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(() => {
                const statusVi: Record<string, string> = {
                  new: "Mới",
                  contacted: "Đã liên hệ",
                  qualified: "Tiềm năng",
                  won: "Đã chốt",
                  lost: "Chưa phù hợp",
                };
                const mailVi: Record<string, string> = {
                  sent: "Đã gửi ✓",
                  sending: "Đang gửi…",
                  pending: "Chờ gửi",
                  failed: "Gửi lỗi",
                };
                const filtered = leads.filter(
                  (l) =>
                    (leadStatusFilter === "all" ||
                      l.status === leadStatusFilter) &&
                    JSON.stringify(l.data)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                );
                if (!filtered.length)
                  return (
                    <p className="adm-empty">
                      {leads.length === 0
                        ? "Các yêu cầu tư vấn mới sẽ xuất hiện tại đây."
                        : "Không có yêu cầu nào khớp bộ lọc. Thử đổi trạng thái hoặc từ tìm kiếm."}
                    </p>
                  );
                return (
                  <div className="adm-lead-list">
                    {filtered.map((lead) => {
                      const name = String(
                        lead.data.fullName ?? lead.data.name ?? "Khách mới",
                      );
                      const initial = (
                        name.trim().charAt(0).toUpperCase() || "?"
                      ).slice(0, 1);
                      const interest = String(
                        lead.data.interest ?? lead.data.tourSlug ?? "",
                      );
                      const message = String(lead.data.message ?? "");
                      return (
                        <article
                          className="adm-lead-card"
                          key={lead.id}
                          data-live-editor={`lead:${lead.id}`}
                        >
                          <div className="adm-lead-info">
                            <div className="adm-lead-top">
                              <span
                                className="adm-lead-avatar"
                                aria-hidden="true"
                              >
                                {initial}
                              </span>
                              <div className="adm-lead-who">
                                <h2>{name}</h2>
                                {lead.data.phone ? (
                                  <Link
                                    className="adm-lead-phone"
                                    href={`tel:${String(lead.data.phone).replace(/\s+/g, "")}`}
                                  >
                                    {String(lead.data.phone)}
                                  </Link>
                                ) : (
                                  <small>Chưa có số điện thoại</small>
                                )}
                              </div>
                              <span
                                className="adm-lead-pill"
                                data-tone={lead.status}
                              >
                                {statusVi[lead.status] ?? lead.status}
                              </span>
                            </div>
                            {interest && (
                              <p className="adm-lead-interest">
                                {interest}
                              </p>
                            )}
                            {message && (
                              <p className="adm-lead-message">“{message}”</p>
                            )}
                            <p className="adm-lead-meta">
                              {lead.created_at
                                ? new Date(lead.created_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : "—"}
                              {" · "}
                              Email:{" "}
                              <span
                                className="adm-mail-badge"
                                data-mail={lead.mail_status}
                              >
                                {mailVi[lead.mail_status] ?? lead.mail_status}
                              </span>
                            </p>
                          </div>
                          <div className="adm-lead-care">
                            <AdmLeadStatusSelect
                              value={lead.status}
                              onChange={(next) =>
                                setLeads(
                                  leads.map((l) =>
                                    l.id === lead.id
                                      ? { ...l, status: next }
                                      : l,
                                  ),
                                )
                              }
                            />
                            <label className="adm-lead-note">
                              <span>
                                Ghi chú nội bộ{" "}
                                <small>(được mã hóa, khách không thấy)</small>
                              </span>
                              <textarea
                                rows={2}
                                placeholder="VD: đã gọi 2 lần, hẹn cuối tuần chốt…"
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
                            <div className="adm-lead-actions">
                              <button
                                className="adm-primary"
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
                                    dirtyFields.current.delete(
                                      `lead:${lead.id}`,
                                    );
                                    setDirty(dirtyFields.current.size > 0);
                                    pushToast(
                                      "success",
                                      "Đã cập nhật khách hàng.",
                                    );
                                  })
                                }
                              >
                                ✓ Lưu chăm sóc
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
                                    pushToast(
                                      "success",
                                      "Đã gửi lại email thông báo.",
                                    );
                                  })
                                }
                              >
                                Gửi lại email
                              </button>
                              <button
                                className="adm-danger-ghost"
                                onClick={() => {
                                  void (async () => {
                                    const ok = await requestConfirm({
                                      title: "Xóa dữ liệu khách hàng?",
                                      body: `Xóa vĩnh viễn yêu cầu của "${name}". Không thể khôi phục.`,
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
                                      pushToast(
                                        "success",
                                        "Đã xóa dữ liệu khách hàng.",
                                      );
                                    });
                                  })();
                                }}
                              >
                                Xóa dữ liệu
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          </>
        ) : tab === "media" ? (
          <section className="adm-panel adm-media">
            <header className="adm-media-head">
              <div>
                <p className="adm-eyebrow">Thư viện ảnh</p>
                <h2>Khoảnh khắc cho những hành trình</h2>
                <p>
                  JPEG, PNG hoặc WebP · tối đa 10 MB. Ảnh được tối ưu, bỏ
                  metadata và không phóng lớn ảnh nhỏ.
                </p>
              </div>
              <span className="adm-media-count">{media.length} ảnh</span>
            </header>

            <div className="adm-media-toolbar">
              <label className="adm-media-search">
                <SearchIcon className="h-4 w-4" aria-hidden="true" />
                <input
                  value={mediaQuery}
                  onChange={(event) => setMediaQuery(event.target.value)}
                  placeholder="Tìm theo mô tả, tên tệp hoặc đường dẫn…"
                  aria-label="Tìm ảnh trong thư viện"
                />
                {mediaQuery ? (
                  <button
                    type="button"
                    className="adm-media-search-clear"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => setMediaQuery("")}
                  >
                    ×
                  </button>
                ) : null}
              </label>
              {mediaQuery ? (
                <span className="adm-media-filter-count">
                  {filteredMedia.length}/{media.length} ảnh
                </span>
              ) : null}
            </div>

            <div className="adm-media-grid">
              {!mediaQuery ? (
                <label className="adm-media-upload-card">
                  <span className="adm-media-upload-icon">
                    <AdminIcon name="image" size={28} />
                  </span>
                  <strong>Thêm ảnh mới</strong>
                  <span>JPEG, PNG, WebP · tối đa 10 MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    aria-label="Tải ảnh mới lên thư viện"
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
              ) : null}

              {filteredMedia.map((item) => (
                <article
                  key={item.id}
                  className="adm-media-card"
                  data-live-editor={`media:${item.id}`}
                >
                  <div className="adm-media-thumb">
                    <Image
                      unoptimized
                      width={640}
                      height={440}
                      src={item.src}
                      alt={item.alt}
                      className="adm-media-photo"
                    />
                    <span
                      className="adm-media-origin"
                      data-original={item.original ? "true" : undefined}
                    >
                      {item.original ? "Ảnh gốc" : "Tải lên"}
                    </span>
                  </div>

                  <div className="adm-media-body">
                    <p className="adm-media-name" title={item.src}>
                      {item.name}
                    </p>

                    {item.original ? (
                      <p className="adm-media-alt-readonly">{item.alt}</p>
                    ) : (
                      <label className="adm-media-alt">
                        <span>
                          Mô tả ảnh <em>{(item.alt ?? "").length}/300</em>
                        </span>
                        <input
                          value={item.alt}
                          maxLength={300}
                          placeholder="Mô tả ảnh để tìm kiếm và dùng cho trợ năng…"
                          onChange={(e) => {
                            setMedia(
                              media.map((asset) =>
                                asset.id === item.id
                                  ? { ...asset, alt: e.target.value }
                                  : asset,
                              ),
                            );
                            dirtyFields.current.add(`media:${item.id}`);
                            setDirty(true);
                          }}
                        />
                      </label>
                    )}

                    <div className="adm-media-actions">
                      {!item.original ? (
                        <button
                          type="button"
                          className="adm-media-save"
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
                              pushToast(
                                "success",
                                "Đã lưu mô tả ảnh trong thư viện.",
                              );
                            })
                          }
                        >
                          Lưu mô tả
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="adm-media-copy"
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
                      {item.original ? (
                        <span
                          className="adm-media-locked"
                          title="Ảnh gốc được giữ để bảo toàn dữ liệu"
                        >
                          Ảnh gốc được giữ
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="adm-media-delete"
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
                                pushToast(
                                  "success",
                                  "Đã xóa ảnh khỏi thư viện.",
                                );
                              });
                            })();
                          }}
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!media.length ? (
              <p className="adm-media-empty">
                Thêm ảnh mới để kể câu chuyện của bạn. 28 ảnh gốc vẫn được giữ
                trong thư viện tour.
              </p>
            ) : filteredMedia.length === 0 ? (
              <p className="adm-media-empty">
                Không tìm thấy ảnh phù hợp. Thử từ khóa khác.
              </p>
            ) : null}
          </section>
        ) : tab === "home" ? (
          <>
            <section className="adm-panel adm-home-intro">
              <div className="adm-home-intro-top">
                <div>
                  <h2>Các khối trang chủ theo đúng thứ tự hiển thị</h2>
                  <p>
                    Mỗi thẻ là một phần thật trên landing page, chia 3 nhóm
                    Đầu – Giữa – Cuối trang. Bấm Sửa để mở modal chỉ chứa
                    trường của phần đó.
                  </p>
                </div>
                <div className="adm-home-states" role="status">
                  <span
                    className={`adm-badge ${homeData.hero ? (homeData.hero.state === "published" ? "" : "draft") : "draft"}`}
                  >
                    Banner:{" "}
                    {homeData.hero
                      ? homeData.hero.state === "published"
                        ? "Đang xuất bản"
                        : "Bản nháp"
                      : "Đang tải…"}
                  </span>
                  <span
                    className={`adm-badge ${homeData.landing ? (homeData.landing.state === "published" ? "" : "draft") : "draft"}`}
                  >
                    Sections:{" "}
                    {homeData.landing
                      ? homeData.landing.state === "published"
                        ? "Đang xuất bản"
                        : "Bản nháp"
                      : "Đang tải…"}
                  </span>
                </div>
              </div>
              <ol className="adm-home-steps">
                <li>
                  <strong>1 · Xem</strong>
                  <span>Tìm đúng số thứ tự của khối trên trang</span>
                </li>
                <li>
                  <strong>2 · Sửa</strong>
                  <span>Mở modal, chỉ sửa trường của khối đó</span>
                </li>
                <li>
                  <strong>3 · Xuất bản</strong>
                  <span>Lưu nháp để giữ, xuất bản để lên web ngay</span>
                </li>
              </ol>
            </section>
            {loading && !homeData.hero && !homeData.landing ? (
              <p className="adm-empty">Nội dung đang được tải…</p>
            ) : (
              <HomeSections
                heroData={homeData.hero?.data ?? null}
                landingData={homeData.landing?.data ?? null}
                heroState={homeData.hero?.state}
                landingState={homeData.landing?.state}
                onEditHero={(meta) => openHomeEditor(meta)}
                onEditSection={(meta) => openHomeEditor(meta)}
                onGoSettings={() => void navigateTo("settings")}
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
                  ref={sectionDialogRef}
                  className="adm-modal adm-section-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="adm-section-title"
                >
                  <div className="adm-section-modal-banner">
                    <span className="adm-section-modal-icon" aria-hidden="true">
                      <AdminIcon
                        name={homeModal.icon as AdminIconName}
                        size={26}
                      />
                    </span>
                    <div className="adm-section-modal-titles">
                      <p className="adm-eyebrow">
                        Trang chủ · Phần {String(homeModal.num).padStart(2, "0")}{" "}
                        · {homeModal.where}
                      </p>
                      <h2 id="adm-section-title">{homeModal.title}</h2>
                      <p className="adm-section-modal-tip">
                        {homeModal.tip}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="adm-section-modal-close"
                      aria-label="Đóng (Esc)"
                      onClick={closeHomeModal}
                    >
                      ×
                    </button>
                  </div>
                  <div className="adm-section-modal-status" role="status">
                    <span
                      className={`adm-badge ${selected.state === "published" ? "" : "draft"}`}
                    >
                      {selected.state === "published"
                        ? "Đang xuất bản"
                        : "Bản nháp"}
                    </span>
                    <span>
                      Phiên bản {selected.revision}
                      {dirty ? " · Có thay đổi chưa lưu" : " · Chưa có gì mới"}
                    </span>
                  </div>
                  <div
                    ref={sectionBodyRef}
                    className="adm-section-modal-body"
                    tabIndex={0}
                    role="group"
                    aria-label={`Nội dung phần ${homeModal.title}`}
                  >
                    {homeModal.kind === "hero" ? (
                      <HeroEditor
                        value={selected.data as unknown as HeroConfig}
                        references={references}
                        onUploadImage={uploadImage}
                        onChange={(data) => {
                          setSelected({
                            ...selected,
                            data: data as unknown as Record<string, EditorValue>,
                          });
                          setDirty(true);
                        }}
                      />
                    ) : homeModal.key === "featured" ? (
                      <HomeFeaturedEditor
                        value={
                          (selected.data.featured ?? { tourIds: [] }) as Record<
                            string,
                            unknown
                          >
                        }
                        options={references.tours ?? []}
                        meta={featuredTourMeta}
                        onEditTour={editTourFromHome}
                        onChange={(featured) => {
                          setSelected({
                            ...selected,
                            data: {
                              ...selected.data,
                              featured: featured as EditorValue,
                            },
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
                        onUploadImage={uploadImage}
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
                  </div>
                  <div className="adm-modal-actions">
                    <span className="adm-modal-hint">
                      {dirty
                        ? "Có thay đổi chưa lưu — lưu nháp để giữ, xuất bản để lên web ngay."
                        : "Chưa có thay đổi nào trong phần này."}
                    </span>
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
        ) : tab === "theme" ? (
          <ThemePanel
            record={themeRecord}
            busy={busy}
            onSave={(theme, action) => void saveTheme(theme, action)}
          />
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
                  href={
                    tab === "tours"
                      ? `/vi/xem-truoc/tour/${selected.id}`
                      : `/admin/preview/${tab}/${selected.id}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  title={
                    tab === "tours"
                      ? "Xem bản nháp đã lưu trong giao diện thật (chỉ tài khoản quản trị)"
                      : undefined
                  }
                >
                  Xem bản nháp ↗
                </Link>
              )}
            </div>
            {tab !== "hero" && tab !== "tours" && tab !== "destinations" && (
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
                      +{" "}
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
            {editorActions()}
            {tab === "hero" ? (
              <HeroEditor
                value={selected.data as unknown as HeroConfig}
                references={references}
                onUploadImage={uploadImage}
                onChange={(data) => {
                  setSelected({
                    ...selected,
                    data: data as unknown as Record<string, EditorValue>,
                  });
                  setDirty(true);
                }}
              />
            ) : tab === "tours" ? (
              <TourEditor
                ref={tourEditorRef}
                value={selected.data as unknown as Record<string, unknown>}
                references={references}
                onUploadImage={uploadImage}
                onNavigateTab={(next) => void navigateTo(next)}
                locked={selected.revision > 0}
                onChange={(data) => {
                  setSelected({
                    ...selected,
                    data: data as Record<string, EditorValue>,
                  });
                  setDirty(true);
                }}
              />
            ) : tab === "destinations" ? (
              <DestinationEditor
                ref={destinationEditorRef}
                value={selected.data as unknown as Record<string, unknown>}
                media={references.media ?? []}
                onUploadImage={uploadImage}
                siblings={
                  rows as unknown as {
                    id: string;
                    data: Record<string, unknown>;
                    state?: string;
                  }[]
                }
                recordState={selected.state}
                locked={selected.revision > 0}
                onChange={(data) => {
                  setSelected({
                    ...selected,
                    data: data as Record<string, EditorValue>,
                  });
                  setDirty(true);
                }}
              />
            ) : (
              <Editor
                references={references}
                value={selected.data}
                locked={selected.revision > 0}
                onUploadImage={uploadImage}
                onChange={(data) => {
                  setSelected({
                    ...selected,
                    data: data as Record<string, EditorValue>,
                  });
                  setDirty(true);
                }}
              />
            )}
          </section>
        ) : (
          <>
            <div className="adm-stats" role="group" aria-label="Tổng quan trạng thái">
              {(
                [
                  {
                    key: "all",
                    icon: "overview",
                    tone: "total",
                    label: "Tất cả nội dung",
                    count: rows.filter((r) => r.state !== "deleted").length,
                    hint:
                      tab === "settings"
                        ? "Cấu hình website đang quản lý"
                        : tab === "messages"
                          ? "Gói ngôn ngữ VI / EN"
                          : "Đang quản lý (chưa tính Thùng rác)",
                  },
                  {
                    key: "published",
                    icon: "eye",
                    tone: "live",
                    label: "Đang xuất bản",
                    count: rows.filter((r) => r.state === "published").length,
                    hint: "Đang hiển thị trên website",
                  },
                  {
                    key: "draft",
                    icon: "edit",
                    tone: "draft",
                    label: "Bản nháp",
                    count: rows.filter((r) => r.state === "draft").length,
                    hint: "Chưa lên web — cần kiểm tra",
                  },
                ] as const
              ).map((stat) => (
                <button
                  key={stat.key}
                  type="button"
                  className="adm-stat-btn"
                  data-tone={stat.tone}
                  data-active={filter === stat.key}
                  aria-pressed={filter === stat.key}
                  title={`${stat.label}: ${stat.count} — ${stat.hint}. Bấm để lọc.`}
                  onClick={() => setFilter(stat.key)}
                >
                  <span className="adm-stat-label">
                    <i aria-hidden="true">
                      <AdminIcon
                        name={stat.icon as AdminIconName}
                        size={14}
                      />
                    </i>
                    {stat.label}
                  </span>
                  <strong>{stat.count}</strong>
                  <small>{stat.hint}</small>
                </button>
              ))}
              {!["messages", "settings", "hero", "landing"].includes(tab) ? (
                <button
                  key="trash"
                  type="button"
                  className="adm-stat-btn"
                  data-tone="trash"
                  onClick={() => setTrashOpen(true)}
                  title={`Mở thùng rác ${tabLabel} — giữ ${TRASH_RETENTION_DAYS} ngày`}
                >
                  <span className="adm-stat-label">
                    <i aria-hidden="true">
                      <AdminIcon name="trash" size={14} />
                    </i>
                    Thùng rác
                  </span>
                  <strong>{rows.filter((r) => r.state === "deleted").length}</strong>
                  <small>
                    {trashUrgentCount > 0
                      ? `${trashUrgentCount} mục sắp bị xóa vĩnh viễn · Bấm để xem`
                      : `Tự xóa sau ${TRASH_RETENTION_DAYS} ngày · Bấm để xem`}
                  </small>
                </button>
              ) : (
                <div className="adm-stat-note" aria-live="polite">
                  <span className="adm-stat-label">
                    <i aria-hidden="true">✓</i>{" "}
                    {tab === "settings"
                      ? "Tự động lên web khi xuất bản"
                      : "Lưu nháp → xuất bản để lên web"}
                  </span>
                  <strong>
                    v
                    {Math.max(
                      0,
                      ...rows.map((r) => r.revision ?? 0),
                      0,
                    )}
                  </strong>
                  <small>
                    {rows[0]?.updated_at
                      ? `Cập nhật ${new Date(rows[0].updated_at).toLocaleDateString("vi-VN")}`
                      : "Chưa có thay đổi"}{" "}
                    · Không dùng Thùng rác ở mục này
                  </small>
                </div>
              )}
            </div>
            <section className="adm-panel">
              {["messages", "settings", "hero", "landing"].includes(tab) ? (
                <p className="adm-where-note" role="note">
                  {tab === "settings"
                    ? "1 cấu hình duy nhất cho toàn website: tên thương hiệu, hotline, email, địa chỉ, footer và mạng xã hội. Bấm Chỉnh sửa ở thẻ bên dưới, xuất bản là header/footer cập nhật ngay."
                    : "Mỗi dòng chữ VI / EN hiển thị đúng vị trí trên website. Sửa câu chữ ở đây, xuất bản là lên web ngay."}
                </p>
              ) : (
              <div className="adm-toolbar">
                <input
                  aria-label={`Tìm trong ${tabLabel}`}
                  placeholder={`Tìm trong ${tabLabel} — gõ tên, slug…`}
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
                  Thùng rác · {TRASH_RETENTION_DAYS} ngày
                  <span className="adm-trash-count">{deletedCount}</span>
                </button>
                {!["messages", "settings", "hero", "landing"].includes(tab) && (
                  <button
                    className="adm-primary"
                    disabled={busy}
                    onClick={create}
                  >
                    + Thêm mới
                  </button>
                )}
              </div>
              )}
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
              {(tab === "categories" || tab === "destinations") &&
                filter !== "deleted" && (
                  <div className="adm-where-panel" role="note">
                    <h3>
                      {tab === "categories"
                        ? "Danh mục dùng để làm gì?"
                        : "Điểm đến dùng để làm gì?"}
                    </h3>
                    <p className="adm-where-lead">
                      {tab === "categories" ? (
                        "Danh mục là kệ xếp tour. Muốn tour hiện ở tuyến nào → mở form tour → tick danh mục đó."
                      ) : (
                        <>
                          <strong>Điểm đến là địa danh</strong> như Quy Nhơn, Kỳ
                          Co – Eo Gió, Cù Lao Xanh. Đây không phải mục “Điểm nổi
                          bật” trong nội dung riêng của một tour.
                        </>
                      )}
                    </p>
                    {tab === "destinations" ? (
                      <>
                        <ul>
                          <li>
                            <strong>Khối “Khám phá” trên trang chủ</strong>
                            <span>
                              Bật “Hiển thị trong khối Khám phá trên trang chủ”
                              để điểm được phép thành thẻ. Tối đa{" "}
                              {HOME_DESTINATION_LIMIT} điểm; thứ tự do bạn chọn.
                            </span>
                            <a href="/vi" target="_blank" rel="noreferrer">
                              Xem trang chủ ↗
                            </a>
                          </li>
                          <li>
                            <strong>Thẻ tour + thông tin tour</strong>
                            <span>
                              Gắn điểm trong form tour → tên điểm hiện trên thẻ
                              tour và khối thông tin chi tiết.
                            </span>
                          </li>
                          <li>
                            <strong>Tìm tour</strong>
                            <span>
                              Tên điểm được dùng khi khách gõ ở /tim-tour; thẻ
                              Khám phá mở sẵn đúng từ khóa này.
                            </span>
                            <a href="/vi/tim-tour" target="_blank" rel="noreferrer">
                              Thử tìm kiếm ↗
                            </a>
                          </li>
                          <li>
                            <strong>Không phải “Điểm nổi bật” của tour</strong>
                            <span>
                              Mục đó nằm trong nội dung riêng của từng tour và
                              không liên quan đến danh sách này.
                            </span>
                          </li>
                        </ul>
                        <p className="adm-home-count" role="status">
                          Đang bật <strong>{homeEnabledCount}/{HOME_DESTINATION_LIMIT}</strong>{" "}
                          điểm cho khối Khám phá.{" "}
                          {homeSlotsFull
                            ? "Đã đủ 3 điểm — tắt một điểm trước khi bật thêm."
                            : `Còn ${HOME_DESTINATION_LIMIT - homeEnabledCount} chỗ trống.`}
                        </p>
                        <p className="adm-home-count" role="status">
                          Website:{" "}
                          <strong>
                            {
                              rows.filter((row) => row.state === "published")
                                .length
                            }{" "}
                            đang xuất bản
                          </strong>{" "}
                          ·{" "}
                          {
                            rows.filter((row) => row.state === "draft").length
                          }{" "}
                          bản nháp. Dùng bộ lọc phía trên để chỉ xem một nhóm.
                        </p>
                      </>
                    ) : (
                      <ul>
                        <li>
                          <strong>Menu + footer</strong>
                          <span>2 danh mục Gốc hiện ở menu và footer.</span>
                          <a href="/vi" target="_blank" rel="noreferrer">Xem menu ↗</a>
                        </li>
                        <li>
                          <strong>Trang tuyến</strong>
                          <span>Mỗi danh mục là 1 trang /tour-... liệt kê tour con.</span>
                          <a href="/vi/tour-quy-nhon-phu-yen" target="_blank" rel="noreferrer">Xem trang tuyến ↗</a>
                        </li>
                        <li>
                          <strong>Trong form tour</strong>
                          <span>Mục “Danh mục” — tick chọn, không gõ tay mã.</span>
                        </li>
                        <li>
                          <strong>Breadcrumb + sitemap</strong>
                          <span>Tự sinh từ cây cha → con; đổi tên không đổi link.</span>
                        </li>
                      </ul>
                    )}
                  </div>
                )}
              {filter === "deleted" && (
                <p className="adm-trash-note" role="note">
                  Thùng rác giữ nội dung đã xóa trong {TRASH_RETENTION_DAYS}{" "}
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
                ) : categorySections ? (
                  categorySections.map((section) => (
                    <section key={section.key} className="adm-tour-group">
                      <header className="adm-tour-group-head adm-article-group-head">
                        <div>
                          <h3>{section.title}</h3>
                          {section.hint && <p>{section.hint}</p>}
                        </div>
                        <span className="adm-tour-group-count">
                          {section.items.length} danh mục
                        </span>
                      </header>
                      {section.items.map((row) => {
                        const parentId =
                          typeof row.data.parentId === "string"
                            ? row.data.parentId
                            : "";
                        const parent = rows.find((r) => r.id === parentId);
                        return renderTaxonomyCard(
                          row,
                          "category",
                          parent ? String(parent.data.name ?? parent.id) : undefined,
                        );
                      })}
                      {section.path && (
                        <a
                          className="adm-ghost-link"
                          href={`/vi${section.path}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Xem trang tuyến này ↗
                        </a>
                      )}
                    </section>
                  ))
                ) : destinationSections ? (
                  destinationSections.map((section) => (
                    <section key={section.key} className="adm-tour-group">
                      <header className="adm-tour-group-head adm-article-group-head">
                        <div>
                          <h3>{section.title}</h3>
                          <p>{section.hint}</p>
                        </div>
                        <span className="adm-tour-group-count">
                          {section.items.length} điểm
                        </span>
                      </header>
                      {section.items.map((row) => renderTaxonomyCard(row, "destination"))}
                    </section>
                  ))
                ) : tab === "categories" || tab === "destinations" ? (
                  visibleRows.map((row) =>
                    renderTaxonomyCard(
                      row,
                      tab === "categories" ? "category" : "destination",
                    ),
                  )
                ) : (
                  visibleRows.map((row) => (
                    <article key={row.id}>
                      <div className="adm-record-mark">
                        {(() => {
                          const icon = tabs.find((t) => t[0] === tab)?.[2];
                          return icon ? (
                            <AdminIcon name={icon as AdminIconName} size={25} />
                          ) : null;
                        })()}
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
                              : tab === "settings"
                                ? `${String(row.data.name ?? "Cấu hình website")} · mã “${row.id}”`
                                : tab === "messages"
                                  ? row.id === "vi"
                                    ? "🇻🇳 Tiếng Việt — câu chữ chính"
                                    : row.id === "en"
                                      ? "🇬🇧 Tiếng Anh — bản dịch"
                                      : String(row.data.title ?? row.data.name ?? row.id)
                                  : String(row.data.title ?? row.data.name ?? row.id)}
                        </h2>
                        <p>
                          {tab === "settings"
                            ? (() => {
                                const contact = (row.data.contact ?? {}) as Record<string, unknown>;
                                const hotline = typeof contact.hotline === "string" ? contact.hotline : "";
                                const email = typeof contact.email === "string" ? contact.email : "";
                                const footer = Array.isArray(row.data.footerLinks)
                                  ? (row.data.footerLinks as unknown[]).length
                                  : 0;
                                const social = Array.isArray(row.data.socialLinks)
                                  ? (row.data.socialLinks as unknown[]).length
                                  : 0;
                                return `Hotline ${hotline || "—"} · ${email || "—"} · ${footer} link footer · ${social} mạng xã hội`;
                              })()
                            : tab === "messages"
                              ? row.id === "vi"
                                ? "Mọi tiêu đề, nút bấm, nhãn form tiếng Việt trên website."
                                : "Bản dịch tiếng Anh tương ứng — xuất bản để lên web ngay."
                              : String(
                                  row.data.summary ??
                                    row.data.excerpt ??
                                    row.data.description ??
                                    row.data.slug ??
                                    row.id,
                                ).slice(0, 120)}
                        </p>
                        {(tab === "settings" ||
                          tab === "messages" ||
                          tab === "hero" ||
                          tab === "landing") && (
                          <p className="adm-card-place">
                            {tab === "settings"
                              ? "Hiện ở: header · footer · trang liên hệ · nút gọi/Zalo"
                              : tab === "messages"
                                ? "Hiện ở: trang chủ · liên hệ · chính sách · thông báo"
                                : "Hiện ở: trang chủ"}
                          </p>
                        )}
                        <small>
                          {new Date(row.updated_at).toLocaleDateString("vi-VN")}{" "}
                          · v{row.revision}
                          {(tab === "categories" || tab === "destinations") &&
                            (() => {
                              const using = tourLinks.filter((t) =>
                                tab === "categories"
                                  ? t.categoryIds.includes(row.id)
                                  : t.destinationIds.includes(row.id),
                              ).length;
                              const path =
                                tab === "categories" &&
                                typeof row.data.path === "string"
                                  ? row.data.path
                                  : null;
                              return (
                                <>
                                  {" "}·{" "}
                                  <span className="adm-use-hint">
                                    {path ? (
                                      <>
                                        Trang <code>{path}</code> ·{" "}
                                      </>
                                    ) : row.data.showOnHome === true ? (
                                      <>Khám phá trang chủ · </>
                                    ) : (
                                      <>Không hiện Khám phá · </>
                                    )}
                                    {using} tour đang dùng
                                  </span>
                                </>
                              );
                            })()}
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
                          Chỉnh sửa
                        </button>
                        {!["settings", "messages", "hero", "landing"].includes(
                          tab,
                        ) && (
                          <button onClick={() => trashOrRestore(row)}>
                            {row.state === "deleted" ? "Khôi phục" : "Xoá"}
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
                    {tabLabel} · {trashRows.length} mục
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
                              <AdminIcon name="trash" size={22} />
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
        {homePreview &&
          (() => {
            const d = homePreview.data;
            const name = String(d.name ?? homePreview.id);
            const summary = String(d.summary ?? "");
            const province = String(d.province ?? "");
            const showOnHome = d.showOnHome === true;
            const homeOrder =
              typeof d.homeOrder === "number" && d.homeOrder > 0
                ? d.homeOrder
                : null;
            const rawImage =
              d.image && typeof d.image === "object" && !Array.isArray(d.image)
                ? (d.image as { src?: unknown; alt?: unknown })
                : undefined;
            const imageAsset = rawImage
              ? {
                  src:
                    typeof rawImage.src === "string" ? rawImage.src : undefined,
                  alt:
                    typeof rawImage.alt === "string" && rawImage.alt
                      ? rawImage.alt
                      : name,
                }
              : undefined;
            const hasImage = Boolean(imageAsset?.src);
            const query = name.split(" – ")[0].split(" - ")[0];
            const href = `/vi/tim-tour?q=${encodeURIComponent(query)}`;
            return (
              <div
                className="adm-home-preview-veil"
                role="dialog"
                aria-modal="true"
                aria-label="Xem trước thẻ Khám phá"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setHomePreview(null);
                }}
              >
                <section className="adm-home-preview">
                  <header>
                    <div>
                      <p className="adm-eyebrow">SEA TRIP · Xem trước</p>
                      <h2>Thẻ Khám phá trên trang chủ</h2>
                      <p>
                        Đúng nội dung sẽ render trên landing page. Ảnh thiếu
                        được thay bằng nền thương hiệu, không bị ẩn.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="adm-trash-close"
                      aria-label="Đóng xem trước"
                      onClick={() => setHomePreview(null)}
                    >
                      ×
                    </button>
                  </header>
                  <div className="adm-home-preview-stage">
                    <div className="adm-home-preview-card">
                      <AssetImage
                        image={imageAsset}
                        altFallback={name}
                        className="adm-home-preview-photo"
                        sizes="(max-width: 700px) 100vw, 560px"
                      />
                      <div className="adm-home-preview-copy">
                        <span>
                          {showOnHome && homeOrder
                            ? `0${homeOrder} / KHÁM PHÁ`
                            : "CHƯA BẬT KHÁM PHÁ"}
                        </span>
                        <h3>{name}</h3>
                        {province ? (
                          <small className="adm-home-preview-province">
                            {province}
                          </small>
                        ) : null}
                        <p>{summary || "Chưa có tóm tắt."}</p>
                        <span
                          className="adm-home-preview-arrow"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                      </div>
                    </div>
                  </div>
                  <dl className="adm-home-preview-facts">
                    <div>
                      <dt>Xuất bản</dt>
                      <dd
                        data-tone={
                          homePreview.state === "published" ? "on" : "draft"
                        }
                      >
                        {homePreview.state === "published"
                          ? "Đang xuất bản trên website"
                          : "Bản nháp — chưa lên website"}
                      </dd>
                    </div>
                    <div>
                      <dt>Khám phá</dt>
                      <dd data-tone={showOnHome ? "on" : "off"}>
                        {showOnHome ? "Đang bật" : "Đang tắt"}
                      </dd>
                    </div>
                    <div>
                      <dt>Thứ tự</dt>
                      <dd>{homeOrder ? `#${homeOrder}` : "—"}</dd>
                    </div>
                    <div>
                      <dt>Ảnh</dt>
                      <dd>{hasImage ? "Có ảnh thật" : "Chưa có ảnh — dùng nền"}</dd>
                    </div>
                    <div>
                      <dt>Liên kết</dt>
                      <dd>
                        <code>{href}</code>
                      </dd>
                    </div>
                  </dl>
                  <footer>
                    <span>
                      {homePreview.state === "published"
                        ? "Đang xuất bản — thay đổi chỉ lên web sau khi bấm Xuất bản."
                        : "Bản nháp — chưa lên website."}
                    </span>
                    <a
                      className="adm-ghost-link"
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở liên kết thẻ ↗
                    </a>
                    <button
                      type="button"
                      className="adm-primary"
                      onClick={() => {
                        const row = homePreview;
                        setHomePreview(null);
                        setSelected(row);
                        setDirty(false);
                      }}
                    >
                      Sửa điểm đến
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomePreview(null)}
                    >
                      Đóng
                    </button>
                  </footer>
                </section>
              </div>
            );
          })()}
        <ToastStack items={toasts} onClose={dismissToast} />
        <ConfirmModal
          request={confirmReq}
          busy={busy}
          onCancel={() => settleConfirm(false)}
          onConfirm={() => settleConfirm(true)}
        />
        {quickOpen ? (
          <div
            className="adm-palette-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeQuickSearch();
            }}
          >
            <div
              ref={quickDialogRef}
              className="adm-palette"
              role="dialog"
              aria-modal="true"
              aria-label="Tìm kiếm nhanh trong Studio"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setQuickActive((current) =>
                    Math.min(current + 1, quickEntries.length - 1),
                  );
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setQuickActive((current) => Math.max(current - 1, 0));
                  return;
                }
                if (event.key === "Enter") {
                  if (event.target instanceof HTMLButtonElement) return;
                  event.preventDefault();
                  const entry = quickEntries[quickCursor];
                  if (entry) chooseQuick(entry);
                  return;
                }
                if (event.key === "Tab") {
                  const focusables =
                    quickDialogRef.current?.querySelectorAll<HTMLElement>(
                      "button, input",
                    );
                  if (!focusables?.length) return;
                  const first = focusables[0];
                  const last = focusables[focusables.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                  }
                }
              }}
            >
              <div className="adm-palette-head">
                <SearchIcon className="adm-palette-icon" />
                <input
                  ref={quickInputRef}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="adm-palette-list"
                  aria-autocomplete="list"
                  aria-label="Tìm nhanh trong Studio"
                  aria-activedescendant={
                    quickEntries[quickCursor]
                      ? `adm-palette-option-${quickCursor}`
                      : undefined
                  }
                  placeholder="Tìm tour, bài viết, điểm đến, danh mục hoặc trang…"
                  value={quickQuery}
                  onChange={(event) => {
                    setQuickQuery(event.target.value);
                    setQuickActive(0);
                  }}
                />
                <button
                  type="button"
                  className="adm-palette-close"
                  aria-label="Đóng tìm kiếm nhanh"
                  onClick={closeQuickSearch}
                >
                  Esc
                </button>
              </div>
              <div
                id="adm-palette-list"
                role="listbox"
                aria-label="Kết quả tìm kiếm nhanh"
                className="adm-palette-list"
              >
                {quickLoading ? (
                  <p className="adm-palette-note">Đang tải dữ liệu…</p>
                ) : null}
                {!quickLoading && quickNeedle && !quickEntries.length ? (
                  <p className="adm-palette-note">
                    Không tìm thấy “{quickNeedle}”. Thử tên khác hoặc gõ không
                    dấu.
                  </p>
                ) : null}
                {quickNav.length ? (
                  <div
                    className="adm-palette-group"
                    role="group"
                    aria-label="Trang quản trị"
                  >
                    <p className="adm-palette-group-label" aria-hidden="true">
                      Trang quản trị
                    </p>
                    {quickNav.map((entry, index) => (
                      <button
                        key={entry.key}
                        type="button"
                        id={`adm-palette-option-${index}`}
                        role="option"
                        aria-selected={quickCursor === index}
                        className="adm-palette-option"
                        onMouseEnter={() => setQuickActive(index)}
                        onClick={() => chooseQuick(entry)}
                      >
                        <span className="adm-palette-option-main">
                          <span className="adm-palette-option-title">
                            {entry.title}
                          </span>
                          <span className="adm-palette-option-sub">
                            {entry.subtitle}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {(() => {
                  let offset = quickNav.length;
                  return quickGroups.map((group) => {
                    const start = offset;
                    offset += group.items.length;
                    return (
                      <div
                        key={group.kind}
                        className="adm-palette-group"
                        role="group"
                        aria-label={ADMIN_SEARCH_GROUP_LABELS[group.kind]}
                      >
                        <p
                          className="adm-palette-group-label"
                          aria-hidden="true"
                        >
                          {ADMIN_SEARCH_GROUP_LABELS[group.kind]}
                        </p>
                        {group.items.map((item, index) => {
                          const cursor = start + index;
                          return (
                            <button
                              key={`${item.kind}:${item.id}`}
                              type="button"
                              id={`adm-palette-option-${cursor}`}
                              role="option"
                              aria-selected={quickCursor === cursor}
                              className="adm-palette-option"
                              onMouseEnter={() => setQuickActive(cursor)}
                              onClick={() =>
                                chooseQuick({
                                  key: `${item.kind}:${item.id}`,
                                  kind: item.kind,
                                  tab: item.kind,
                                  id: item.id,
                                  slug: item.slug,
                                  title: item.title,
                                  subtitle: item.subtitle,
                                  status: item.status,
                                })
                              }
                            >
                              <span className="adm-palette-option-main">
                                <span className="adm-palette-option-title">
                                  {item.title}
                                </span>
                                {item.subtitle ? (
                                  <span className="adm-palette-option-sub">
                                    {item.subtitle}
                                  </span>
                                ) : null}
                              </span>
                              {item.status && item.status !== "unknown" ? (
                                <span
                                  className="adm-palette-badge"
                                  data-status={item.status}
                                >
                                  {item.status === "published"
                                    ? "Đang xuất bản"
                                    : "Bản nháp"}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
              <footer className="adm-palette-foot" aria-hidden="true">
                <span>↑ ↓ chọn</span>
                <span>↵ mở</span>
                <span>Esc đóng</span>
              </footer>
            </div>
          </div>
        ) : null}
        <footer className="adm-footnote">
          SEA TRIP STUDIO · Nội dung tốt tạo nên những kết nối đẹp.
        </footer>
      </main>
    </div>
  );
}
