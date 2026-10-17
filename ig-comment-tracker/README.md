# IG Comment Tracker

Mengumpulkan komentar (termasuk balasan) yang ditulis sebuah akun Instagram di post-post milik **akun yang dia follow** dan di profilnya sendiri, dari N hari terakhir.

Instagram tidak punya fitur "semua komentar @x", jadi tool ini membuka setiap post dari akun-akun tersebut lalu memfilter komentar milik target. Komentar di akun yang tidak dia follow tidak akan tertangkap.

## Jalan di GitHub (tanpa laptop)

Simpan tool ini di repo **private**, karena hasilnya di-commit ke repo.

1. **Settings → Secrets and variables → Actions → Secrets**, tambahkan:
   - `IG_USERNAME`: username akun cadangan untuk login
   - `IG_PASSWORD`: password akun itu (**2FA harus mati**)
2. Di halaman yang sama, buka tab **Variables** dan tambahkan:
   - `IG_TARGET`: username yang mau dilacak (tanpa @)
   - `IG_DAYS` (opsional): default 180
3. **Actions → Scan comments → Run workflow.** Untuk uji coba, isi menit dengan `10`.
4. Hasilnya ada di folder `results/` di repo. File `<target>_comments.csv` bisa langsung dibaca di GitHub sebagai tabel.

Setelah itu workflow jalan sendiri 2x sehari dan melanjutkan dari titik terakhir sampai semua akun selesai di-scan. Kalau sudah selesai, setiap run hanya memakan sekitar 1 menit.

Kalau login ditolak dengan pesan "checkpoint", buka aplikasi Instagram dengan akun cadangan itu, pilih "Ini saya" pada notifikasi login, lalu jalankan workflow lagi.

Kuota gratis GitHub Actions untuk repo private adalah 2.000 menit per bulan. Setiap run dibatasi 100 menit, jadi kuota cukup untuk sekitar 9 hari scanning penuh.

## Jalan di komputer
```bash
pip install -r requirements.txt
python ig_comment_tracker.py USERNAME_TARGET --login AKUN_CADANGANMU
```
Opsi: `--days 180`, `--max-followees 50`, `--max-minutes 60`, `--db`, `--csv`. Progress tersimpan, jadi kalau berhenti (kena rate-limit atau Ctrl+C) cukup jalankan perintah yang sama untuk melanjutkan.

## Penting
- **Pakai akun cadangan.** Akun yang dipakai login bisa kena limit, checkpoint, atau banned.
- Akun private yang tidak di-follow oleh akun login akan dilewati.
- Akun yang gagal di-scan dicoba sekali lagi di run berikutnya, setelah itu dilewati.
