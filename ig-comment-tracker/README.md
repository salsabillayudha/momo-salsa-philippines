# IG Comment Tracker

Mengumpulkan komentar (termasuk balasan) yang ditulis sebuah akun Instagram di post-post milik **akun yang dia follow** dan di profilnya sendiri, dari N hari terakhir.

Instagram tidak punya fitur "semua komentar @x", jadi tool ini membuka setiap post dari akun-akun tersebut lalu memfilter komentar milik target. Komentar di akun yang tidak dia follow tidak akan tertangkap.

## Setup
```bash
pip install -r requirements.txt
```

## Pakai
```bash
python ig_comment_tracker.py USERNAME_TARGET --login AKUN_CADANGANMU
```
Run pertama akan meminta password (dan 2FA kalau ada). Sesi login disimpan, jadi run berikutnya tidak perlu login lagi.

Opsi:
- `--days 180`: seberapa jauh ke belakang (default 180 = 6 bulan)
- `--max-followees 50`: hanya scan 50 akun pertama, berguna untuk uji coba
- `--db`, `--csv`: nama file progress dan output (default `<target>.db` dan `<target>_comments.csv`)

## Output
`<target>_comments.csv` berisi kolom waktu komentar, pemilik post, link post, tanggal post, isi komentar, jumlah like, apakah balasan, dan komentar yang dibalas. File ini bisa langsung dibuka di Excel atau Google Sheets.

## Penting
- **Pakai akun cadangan.** Akun yang dipakai login bisa kena limit, checkpoint, atau banned.
- **Prosesnya lambat.** Akun dengan banyak post dan komentar bisa memakan waktu berjam-jam sampai berhari-hari.
- **Bisa dilanjutkan.** Kalau kena rate-limit atau di-Ctrl+C, progress tetap tersimpan. Tunggu beberapa jam lalu jalankan perintah yang sama, dan scan akan lanjut dari titik terakhir. CSV selalu ditulis ulang di akhir setiap run.
- Akun private yang tidak di-follow oleh akun login akan dilewati. Kalau target sendiri private, akun login harus follow target dulu.
