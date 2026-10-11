# KOMSI RUPA LIBRARY — FINAL FIX

Website arsip visual KOMSI: desain, fotografi, ilustrasi, artwork, dan video. Paket ini berisi `index.html`, `style.css`, `app.js`, `schema.sql`, dan panduan ini.

## Yang sudah diperbaiki
- Supabase Project URL dan publishable key diisi berdasarkan konfigurasi yang diberikan.
- Mode demo tetap tersedia jika konfigurasi atau koneksi database belum siap.
- Katalog membaca tabel `public.artworks` dan menangani error tanpa membuat halaman kosong.
- Upload menyimpan `image_url` sekaligus `file_url` agar kompatibel dengan skema lama yang mewajibkan `image_url`.
- Pemeriksaan admin sisi aplikasi menggunakan UID admin yang disiapkan; kebijakan database/Storage juga membatasi mutasi ke UID yang sama.
- Validasi ukuran file maksimal 50 MB dan checkbox izin berbagi publik.

## Deploy di GitHub Pages
1. Ekstrak ZIP ini.
2. Unggah/replace kelima file di root repositori GitHub Pages: `index.html`, `style.css`, `app.js`, `schema.sql`, `README.md`.
3. Tunggu beberapa menit, lalu buka website dengan hard refresh atau tab Incognito untuk menghindari cache.

## Setup Supabase (perlu dilakukan satu kali)
1. Buka Supabase → SQL Editor.
2. Tinjau `schema.sql`, lalu jalankan. Script tidak menghapus tabel atau baris data, tetapi mengganti beberapa policy dengan policy bernama sama untuk admin yang UID-nya ditentukan.
3. Pastikan user admin di Authentication memiliki UID `b520cf6e-be06-4338-976d-8604877fd632`. Jika UID akun berbeda, ubah UID tersebut di `app.js` dan semua policy pada `schema.sql` agar sama.
4. Di Storage, buat bucket bernama `rupa-library` jika belum ada. Karena kode memakai `getPublicUrl()`, bucket perlu diatur Public hanya jika file memang boleh diakses siapa saja yang memiliki URL. Public bucket tidak membuat operasi upload publik; policy insert tetap membatasi admin.
5. Di Authentication, pastikan email admin sudah terdaftar dan email/password yang digunakan benar.

## Konfigurasi frontend
- `app.js` berisi Project URL dan `sb_publishable_...` key untuk browser.
- Jangan pernah memasukkan `sb_secret_...` atau `service_role` ke file frontend/GitHub.
- Publishable key memang dapat terlihat di browser; keamanan data ditentukan oleh Row Level Security dan Storage policies.

## Mode demo
Jika Supabase belum dikonfigurasi, contoh karya ditampilkan sebagai demo. Jika Supabase sudah tersambung tetapi katalog masih kosong, situs menampilkan keadaan kosong yang sebenarnya agar contoh tidak tercampur dengan karya nyata. Jika permintaan katalog gagal, contoh demo ditampilkan sementara dengan pesan peringatan.

## Catatan
Paket ini sudah diperiksa untuk sintaks JavaScript, tetapi tidak dapat menjamin kondisi dashboard Supabase, status bucket, kebijakan yang sudah ada, atau akun admin di luar file. Setelah deploy, lakukan tes: buka katalog, login admin, upload satu file kecil yang memang boleh dipublikasikan, lalu cek hasilnya di halaman dan Storage.
