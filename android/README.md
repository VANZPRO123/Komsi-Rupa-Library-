# KOMSI RUPA ADMIN (Android)

Aplikasi Android khusus admin untuk mengakses KOMSI RUPA LIBRARY. Aplikasi menggunakan WebView Android yang membuka situs resmi sehingga autentikasi, data, dan fitur admin tetap memakai sistem website dan Supabase yang sudah ada.

## Build APK otomatis

1. Buka tab Actions pada repository GitHub.
2. Pilih workflow Build KOMSI RUPA ADMIN APK.
3. Tekan Run workflow.
4. Setelah status selesai, buka hasil run dan unduh artifact KOMSI-RUPA-ADMIN-APK.
5. Ekstrak ZIP, lalu pasang app-debug.apk di perangkat Android.

Workflow juga berjalan otomatis saat file di folder android/ berubah dan masuk ke branch main.

## Catatan

- APK debug dibuat untuk instalasi dan pengujian.
- Aplikasi tidak menyimpan kata sandi admin sendiri; login dilakukan melalui halaman resmi.
- Koneksi hanya menggunakan HTTPS. Upload file melalui pemilih berkas Android.
- APK belum ditandatangani dengan kunci rilis. Untuk distribusi publik atau Play Store, buat signing key privat dan pipeline release terpisah.
