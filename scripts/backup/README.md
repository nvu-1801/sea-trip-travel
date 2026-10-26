# SEA TRIP backup (host tool)

Công cụ này chạy trên **host VPS** bằng systemd, không chạy trong container web.
Web app chỉ đọc metadata và file `.seatar` qua mount read-only.

```bash
sudo /opt/seatrip/bin/backup/manage.sh check
sudo /opt/seatrip/bin/backup/manage.sh install
sudo /opt/seatrip/bin/backup/manage.sh run
sudo /opt/seatrip/bin/backup/manage.sh list
sudo /opt/seatrip/bin/backup/manage.sh verify <id>
sudo /opt/seatrip/bin/backup/manage.sh restore-test <id>
```

- Lịch: ngày 1 và 16 hằng tháng, 03:00 Asia/Bangkok, `Persistent=true`.
- Giữ 3 bản `auto` đã verify. Không xóa `pre-*`, `media-*`, bản manual.
- Archive `.seatar` được mã hóa AES-256-GCM bằng `/opt/seatrip/.backup/archive.key`.
- Nếu chưa cấu hình `BACKUP_OFFSITE_DIR`, trạng thái là **chưa cấu hình offsite**.
- Không có lệnh nào tự khôi phục đè production.

Đọc đầy đủ: `docs/BACKUP-RESTORE.md` trong repository.
