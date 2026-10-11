# KOMSI RUPA LIBRARY — V1.1

Website arsip visual KOMSI untuk desain, fotografi, ilustrasi, artwork, dan video. Tampilan responsif dengan gaya minimalis putih, galeri poster, pencarian, filter kategori, favorit, detail karya, serta panel login/upload admin.

## Isi folder
- `index.html` — struktur halaman dan dialog.
- `style.css` — tampilan desktop dan mobile.
- `app.js` — interaksi katalog, favorit, Supabase, login, upload.
- `schema.sql` — skema database dan kebijakan Supabase.

## Menjalankan mode demo
Buka `index.html` lewat browser atau jalankan menggunakan GitHub Pages. Mode demo memakai contoh karya lokal; login/upload sungguhan memerlukan konfigurasi Supabase.

## Menghubungkan Supabase
1. Buat project Supabase (paket gratis cukup untuk uji coba, sesuai batas kuota yang berlaku).
2. Periksa `schema.sql` di SQL Editor. Jika tabel sudah ada, periksa struktur dan policy terlebih dahulu; jangan menghapus tabel berisi data.
3. Buat bucket Storage bernama `rupa-library` dan atur akses sesuai kebutuhan.
4. Buka `app.js`, isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari Project Settings → API.
5. Buat akun admin melalui Supabase Authentication. Batasi hak upload hanya untuk admin yang ditentukan sebelum dipakai publik.
6. Deploy folder ke GitHub Pages atau layanan static hosting gratis.

## Catatan keamanan
- Jangan pernah menaruh `service_role` key di file frontend.
- Policy SQL perlu ditinjau dan diperketat untuk produksi. Login saja tidak otomatis menjadikan pengguna sebagai admin.
- Unggah hanya karya yang boleh dibagikan secara publik. Cantumkan kredit bila diperlukan.
- Kuota database/storage dan batas upload mengikuti paket Supabase serta konfigurasi project saat ini.

## Status
Paket ini belum terhubung ke project Supabase pengguna dan belum dipublikasikan ke hosting. Setelah URL dan anon key dimasukkan, database, Storage, dan policy perlu diuji.
