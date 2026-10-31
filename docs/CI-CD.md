# CI/CD: từ một nhánh tới bản deploy trên `main`

Tài liệu này là nguồn duy nhất mô tả pipeline trong
`.github/workflows/ci-deploy.yml`. Mọi lần push lên `main` đều là một lần
release thật, nên quy trình dưới đây là bắt buộc, không phải gợi ý.

## 1. Pipeline làm gì

| Trigger | Job | Nội dung |
| --- | --- | --- |
| `pull_request` | `check` | Gate đầy đủ, không deploy |
| `push` `main` | `check` → `deploy` | Gate đầy đủ, sau đó deploy lên VPS |
| `workflow_dispatch` | `check` → `deploy` (nếu chọn `main`) | Chạy lại thủ công |

Job `security` chạy song song với `check`: tests của scanner runner, Semgrep,
Gitleaks working tree và Gitleaks toàn bộ lịch sử Git. Deploy phải chờ cả hai
job thành công. Các ngoại lệ đã review nằm trong [SECURITY-TRIAGE.md](SECURITY-TRIAGE.md).
CI cũng chạy `verify:depth` và `verify:seo` như full preflight cục bộ.

`check` chạy đúng thứ tự sau, dừng ngay ở bước đầu tiên lỗi:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test && npm run test:cms`
5. `npm run build`
6. cài Chromium cho Playwright
7. `npm run verify:ui`
8. `npm run verify:tour-import`
9. `npm run verify:cms` (bao gồm luồng đăng nhập Studio, quick search,
   URL-backed section, đăng xuất và đổi mật khẩu)
10. `npm run verify:hero`
11. `docker build` với `APP_SHA=$GITHUB_SHA`
12. smoke test container: filesystem read-only, volume `data` bền vững,
    `/api/health` trả đúng SHA + `database: connected`, `/` và `/admin`
    trả 200, restart container vẫn healthy

`deploy` chỉ chạy khi `vars.DEPLOY_ENABLED == 'true'` và ref là `main`:

1. kiểm tra SHA trên runner vẫn là `origin/main` mới nhất (bỏ qua deploy cũ)
2. `git archive` đúng commit đã pass gate + `release-notes.json`
3. `scp` archive lên VPS và chạy `scripts/deploy/deploy.sh` qua `ssh`
4. `curl` `PROD_HEALTH_URL`, đòi `status: ok`, `database: connected` và
   `sha` bằng đúng SHA vừa merge
5. gửi email cập nhật đến `SALES_RECIPIENTS` (dự phòng `RELEASE_NOTICE_RECIPIENTS`)
   bằng `scripts/deploy/notify.sh`; lỗi gửi thư làm bước thông báo thất bại,
   không rollback website đã kiểm tra thành công.

Mỗi thay đổi cần thông báo phải có dòng `Customer-Note: ...` trong commit,
viết bằng tiếng Việt dễ hiểu: thay đổi gì, lợi ích và cách sử dụng. Giữ các
dòng này khi squash. Không có ghi chú thì email nói rõ không có mô tả thay đổi.

## 2. Quy trình bắt buộc khi push `main`

```sh
git switch -c <type>/<slug> origin/main
# ... code ...
npm run verify:preflight -- --full     # phải xanh trước khi push
git push -u origin <type>/<slug>
gh pr create --fill
gh pr checks --watch                    # chờ job check xanh
gh pr merge --squash --delete-branch
```

Sau khi merge, theo dõi run trên `main` tới khi `deploy` xong:

```sh
gh run list --branch main --limit 1
gh run watch "$(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
curl -fsS https://sea-trip-travel.duckdns.org/api/health
```

Điều kiện "đã deploy xong" là cả ba:

- run trên `main` kết thúc `success`;
- `gh run view <id> --log` có bước `Verify public release` xanh;
- `/api/health` trả `status: "ok"`, `database: "connected"` và `sha` bằng
  commit vừa merge.

## 3. Khi CI đỏ

Không merge, không push thêm commit mù. Vòng lặp cố định:

1. `gh run view <id> --log-failed` để lấy đúng bước lỗi.
2. Tái hiện cục bộ bằng chính lệnh đó (`npm run lint`, `npm test`,
   `npm run verify:cms`, …). Với bước browser, chạy `npm run verify:*` trên
   máy để thấy message thật thay vì đọc log nén.
3. Sửa nguyên nhân, không nới lỏng test và không `continue-on-error` cho
   bước đang đỏ.
4. Chạy lại `npm run verify:preflight -- --full` tới khi xanh.
5. Push tiếp lên cùng nhánh; PR tự chạy lại. Lặp tới khi `check` xanh.

Nếu `main` đã đỏ sau merge:

- sửa tiếp trên nhánh mới và mở PR ngay, hoặc
- `git revert` commit gây lỗi rồi merge PR revert (revert là ngoại lệ duy
  nhất được phép đi thẳng vào `main`).
- Không deploy tay lên VPS để "chữa cháy": runner và VPS sẽ lệch SHA, lần
  deploy sau lại ghi đè.

## 4. Thay đổi hạ tầng

Sửa `Dockerfile`, `compose.yml`, `scripts/deploy/**` hoặc
`.github/workflows/ci-deploy.yml` thì phải kiểm tra thêm trước khi merge:

```sh
docker build --build-arg APP_SHA="$(git rev-parse HEAD)" -t sea-trip:local .
# chạy container read-only + volume data như bước smoke test trong workflow
```

Lý do: job `deploy` không build lại trên VPS, nó dùng chính archive đã qua
smoke test. Sai ở bước này thì lỗi chỉ lộ ra trên production.

## 5. Biến và secret cần có

| Loại | Tên | Dùng cho |
| --- | --- | --- |
| Variable | `DEPLOY_ENABLED` | bật job `deploy` (`true`) |
| Variable | `VPS_APP_DIR` | thư mục app trên VPS |
| Variable | `PROD_HEALTH_URL` | URL `/api/health` công khai |
| Secret | `VPS_HOST`, `VPS_USER`, `VPS_PORT` | SSH tới VPS |
| Secret | `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` | SSH key + host key pinning |

Email cập nhật chủ site đọc `RELEASE_NOTICE_*` trong `.env.production`
trên VPS; thiếu cấu hình thì bước gửi mail chỉ cảnh báo.

## 6. Agent chịu trách nhiệm tới khi release hoàn tất

Khi người dùng yêu cầu "push vào main và deploy", agent được phép thực hiện commit các thay đổi thuộc task, push nhánh, tạo/cập nhật PR, chờ checks, merge và xác nhận deploy trong chat đang hoạt động. Áp dụng cho nhánh hiện tại, nhánh feature mới và khi bắt đầu ở main (phải chuyển thay đổi sang nhánh feature trước khi commit). Giữ nguyên các thay đổi ngoài phạm vi task; nếu chưa rõ phạm vi release thì xác nhận trước khi gom chúng vào commit.

Quy tắc đầy đủ nằm trong `AGENTS.md`, mục `Complete release ownership during an active chat`:

- Theo dõi đúng workflow/run và SHA của PR mới nhất; sau merge lấy SHA thực tế trên main. Không dùng run xanh của commit khác hoặc dispatch workflow trùng với trigger PR/push.
- CI PR lỗi: đọc log step lỗi, tái hiện nếu có thể, sửa nguyên nhân, chạy full preflight rồi push lại cùng nhánh tới khi xanh. Chỉ rerun khi có bằng chứng lỗi hạ tầng tạm thời.
- CI/deploy main lỗi: tạo nhánh fix và PR mới, đi qua đầy đủ gate rồi theo dõi run main thay thế. Không bỏ check hoặc deploy tay trên VPS.
- Deploy bị skip hoặc chưa bật không phải thành công. Thiếu quyền, review, credential hoặc kết nối hạ tầng thì báo blocker cụ thể; không vượt branch protection hay tự đổi secret.
- Chỉ hoàn tất khi run main thành công, deploy và public verification xanh, health có status ok, database connected và đúng SHA. Nếu main thay đổi đồng thời, xác định release mới và kiểm tra run/health tương ứng.
- Giữ lượt chat hoạt động trong lúc chờ và sửa; cập nhật ngắn ít nhất mỗi 60 giây. Báo link PR, Actions, SHA và health khi kết thúc. Không có cơ chế tự thức dậy sau khi lượt chat kết thúc.
