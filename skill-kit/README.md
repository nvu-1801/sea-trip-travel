# Landing page + admin skill kit

Bộ 8 skill cho project landing page có trang quản trị. Chỉ cài hướng dẫn và tài nguyên cho agent; không tạo website, thay dependency hoặc deploy.

| Skill | Vai trò |
| --- | --- |
| landing-admin | Điều phối thiết kế, public/admin, dữ liệu và kiểm tra |
| frontend-design | Bố cục, typography và hướng hình ảnh |
| vercel-react-best-practices | Hiệu năng React/Next.js |
| web-design-guidelines | Adapter kiểm tra UI theo nguồn Vercel hiện hành |
| ui-ux-pro-max | Tra cứu màu, font, UX và stack bằng dữ liệu local |
| ponytail | Code vừa đủ, tái sử dụng phần có sẵn |
| humanizer | Nội dung tự nhiên, giữ đúng dữ kiện |
| i-have-adhd | Phong cách trả lời rõ hành động, bật khi người dùng yêu cầu |

## Cài vào project khác

Cần Node.js 22+. Giải nén bộ kit, sau đó chạy từ thư mục kit:

```powershell
node install.mjs "C:/Projects/my-landing-page"
```

Đích phải là thư mục project đã tồn tại. Script thêm `.agents/skills/`, thông tin nguồn ở `.agents/landing-admin-kit/`, và nối một khối hướng dẫn vào `AGENTS.md`. Nội dung AGENTS.md hiện có được giữ nguyên. Cài lại cùng phiên bản không thêm khối trùng. Nếu có skill cùng đường dẫn nhưng nội dung khác, script dừng trước khi ghi: so sánh và hợp nhất thủ công, không ghi đè bằng force.

Trong repo Sea Trip Travel, dùng `node skill-kit/install.mjs "C:/Projects/my-landing-page"`. Không cần tải lại các repo upstream. Project khác giữ nguyên chính sách kiểm thử/deploy của nó, không nhận hostname, secret hay quyền release từ Sea Trip.

Mở chat mới trong project đích để agent khám phá skill. Hoặc yêu cầu trực tiếp: `Đọc .agents/skills/landing-admin/SKILL.md và làm theo cho task này.`

## Dùng bộ skill

Ví dụ yêu cầu:

- `Dùng $landing-admin tạo landing page cho dịch vụ của tôi, có admin sửa nội dung. Đọc stack và quy định project trước.`
- `Dùng $landing-admin sửa modal chỉnh sửa sản phẩm; giữ nguyên design system hiện tại.`
- `Dùng $web-design-guidelines review form liên hệ và màn hình admin vừa sửa.`

Python 3 chỉ cần cho công cụ tìm kiếm UI UX Pro Max (không cần package ngoài). Chạy từ root của project đích:

```powershell
python .agents/skills/ui-ux-pro-max/scripts/search.py "travel booking landing" --design-system -p "My Project"
python .agents/skills/ui-ux-pro-max/scripts/search.py "keyboard focus modal" --domain ux
```

Kết quả tìm kiếm là gợi ý; chọn theo thương hiệu và nhu cầu thực tế. Lệnh trên không lưu hay thay design system. Trong chat, agent cần dùng đường dẫn tuyệt đối tới script nếu cwd khác root project.

Web Design Guidelines cần truy cập mạng để đọc quy tắc Vercel mới nhất; khi offline, skill dùng checklist local và báo rõ giới hạn. Các skill khác có nội dung local. Bộ kit không cài plugin hooks hoặc cấu hình global.

## Xuất bản sao dùng lại

Từ repo nguồn:

```powershell
node skill-kit/install.mjs --export "C:/Exports/landing-admin-skill-kit"
Compress-Archive -LiteralPath "C:/Exports/landing-admin-skill-kit" -DestinationPath "C:/Exports/landing-admin-skill-kit.zip"
```

Thư mục export và file ZIP nên chưa tồn tại. Bộ export có đủ payload, installer, tài liệu và nguồn phiên bản; có thể chuyển sang máy khác. Không chứa source website, `.env`, dữ liệu khách hàng hoặc lịch sử Git.

Nguồn và commit được ghi trong `sources.json`. Giữ giấy phép trong từng skill khi sao chép. Vercel React khai báo MIT trong frontmatter upstream nhưng không kèm file LICENSE riêng ở snapshot này. Web Design Guidelines là adapter do project viết, tham chiếu nguồn Vercel, không đóng gói nguyên văn nội dung nguồn chưa có khai báo giấy phép.

## Kiểm tra bộ đóng gói

```powershell
node --test skill-kit/install.test.mjs
```

Các kiểm tra này xác nhận installer, cài lại, xung đột và bản export; không thay thế test ứng dụng hoặc kiểm tra UI thực tế.
