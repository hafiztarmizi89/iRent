[README.md](https://github.com/user-attachments/files/35197434/README.md)
# Sistem Sewa Bilik: Aplikasi Desktop (Windows .exe dan Mac .dmg)

Aplikasi ini membungkus sistem sewa bilik dalam tetingkap sendiri. Di dalamnya berjalan pelayan yang sama seperti edisi web, jadi iPhone atau peranti lain dalam Wi-Fi yang sama masih boleh membuka sistem melalui pelayar.

## Folder data (sama pada Windows dan Mac)

Data **tidak** disimpan di dalam aplikasi, jadi mengemas kini atau memasang semula aplikasi tidak memadam data. Lokasi lalai: `Documents/SewaBilik/`

```
SewaBilik/
  config/config.json   Port, kata laluan akses, titik pangkalan data dan lampiran
  database/            rental-db.json + sandaran harian (backup/)
  attachments/         receipts/, expenses/, tenants/
```

- **Memindahkan data ke peranti lain:** salin seluruh folder `SewaBilik` (USB, cakera luaran, NAS), kemudian pada peranti baharu pilih menu **Fail > Tukar folder data...** dan tunjuk ke folder itu. Format sama pada Windows dan Mac.
- **Folder dalam awan (iCloud, OneDrive, Dropbox):** boleh digunakan, tetapi hanya satu peranti pada satu masa. Aplikasi menulis fail kunci dan memberi amaran jika folder itu sedang digunakan oleh peranti lain. Jangan abaikan amaran ini kerana boleh merosakkan data.
- Konfigurasi boleh diedit terus pada `config/config.json` (mulakan semula aplikasi), atau melalui menu **Pangkalan data** dalam sistem.

## Cara membina

Pemasang `.exe` dan `.dmg` perlu dibina pada komputer anda. Saya tidak dapat membinanya di sini.

**Pilihan A: bina sendiri**
1. Pasang Node.js (versi LTS) dari nodejs.org.
2. **Mac (.dmg):** klik dua kali `build-mac.command`, atau jalankan `npm install` kemudian `npm run dist:mac`. Fail dalam folder `dist/`.
3. **Windows (.exe):** klik dua kali `build-windows.bat`, atau jalankan `npm install` kemudian `npm run dist:win`. Hasilnya pemasang (`Setup.exe`) dan versi portable. Fail dalam folder `dist/`.
4. `.dmg` hanya boleh dibina pada Mac. `.exe` paling mudah dibina pada Windows.

**Pilihan B: bina dalam awan (tidak perlu kedua-dua komputer)**
Muat naik projek ini ke repositori GitHub, kemudian jalankan workflow **Bina aplikasi desktop** (tab Actions). Ia membina `.exe` dan `.dmg` dan menyediakan fail untuk dimuat turun.

Untuk menjalankan tanpa memasang (ujian): `npm install` kemudian `npm start`.

## Kali pertama menggunakan

- **Kata laluan akses** dijana rawak semasa kali pertama dan disimpan dalam `config.json`. Aplikasi memasukkannya sendiri pada komputer ini. Untuk peranti lain, lihat menu **Fail > Maklumat sambungan**.
- Log masuk sistem dengan akaun demo (kata laluan `demo123`): 0123000000 (Pengurus), 0123111111 (Owner), 0134567890 (Penyewa).
- **Windows:** firewall mungkin bertanya sama ada membenarkan akses rangkaian. Pilih benarkan untuk rangkaian peribadi jika mahu iPhone menyambung.
- **Tanpa tandatangan kod:** Windows memaparkan amaran SmartScreen ("More info" kemudian "Run anyway"). Mac menyekat aplikasi yang tidak ditandatangani: klik kanan aplikasi, pilih Open. Jika Mac berkata aplikasi rosak, jalankan `xattr -cr "/Applications/Sistem Sewa Bilik.app"` di Terminal. Tandatangan dan notarization Apple memerlukan akaun Apple Developer berbayar.

## Had (baca sebelum guna sebenar)

- Pakej desktop ini belum diuji dibina atau dijalankan. Logik pelayan sudah diuji, tetapi tetingkap Electron dan pemasang belum.
- Pustaka PDF dan Excel dimuat dari internet pada kali pertama. Untuk luar talian, letakkan `jspdf.umd.min.js` dan `xlsx.full.min.js` dalam `app/public/vendor/` sebelum membina.
- Keselamatan: kata laluan akaun disimpan sebagai teks biasa dan log masuk peranan hanya mengawal paparan. Gunakan dalam rangkaian yang dipercayai sahaja.
- Electron dikunci pada versi 43 (`^43.0.0`) supaya aplikasi Mac boleh berjalan pada **macOS 12 (Monterey)**. Electron 44 dan ke atas memerlukan macOS 13. Jika semua Mac anda sudah macOS 13+, anda boleh naikkan versi ini. electron-builder menggunakan `latest`; selepas pembinaan berjaya, nyatakan versi tepat supaya pembinaan seterusnya konsisten.
