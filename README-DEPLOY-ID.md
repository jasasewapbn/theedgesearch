# The Edge Search — Panduan Deploy (Cloudflare Pages)

Blog statis untuk **theedgesearch.my.id**. Bahasa: **English**. 1 artikel/hari,
12 Nov 2026 – 11 Nov 2027 (365 artikel), ±400 kata, 10 tag per artikel.
6 kategori: Search Engines & SEO, AI Search & Chatbots, Tech Trends & Gadgets,
How-To Guides & Tutorials, Digital Tools & Apps, Online Safety & Privacy.

Tidak ada PHP/MySQL/server. Situs dibuat oleh `build.js` (Node.js saja, tanpa
dependensi) dari `data/articles.json` menjadi file HTML statis di `dist/`.
Hanya artikel dengan `publish_date` ≤ hari ini (waktu Asia/Jakarta) yang
ikut dibuat — artikel masa depan tidak muncul di homepage, kategori, tag,
pencarian, maupun sitemap sampai tanggalnya tiba.

## Status saat ini (11 Nov 2026)
Skeleton selesai dan terverifikasi lokal. Isi `data/articles.json` sudah
**380 artikel — PROYEK SELESAI** (15 tayang 11 Nov 2026 + 365 terjadwal 12 Nov 2026–11 Nov 2027). Sisa 0.
(12 Des 2026–11 Nov 2027) dibuat bertahap per batch 30 hari.

## 1. Upload ke GitHub (sekali saja)
1. Buat repo baru di GitHub (mis. `theedgesearch`), private boleh.
2. Upload semua file folder ini **kecuali `dist/`** (folder `dist/` dibuat
   otomatis saat build; ada `.gitignore` untuk itu).
   - Cara termudah: drag-and-drop lewat web GitHub, atau `git push` dari komputer.
3. Pastikan file `.github/workflows/daily-rebuild.yml` ikut ter-upload.

## 2. Hubungkan ke Cloudflare Pages
1. Login Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pilih repo `theedgesearch`.
3. **Build settings:**
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: (kosong / repo root)
4. **Deploy.** Cloudflare memberi URL sementara `*.pages.dev` — cek dulu di sana.

## 3. Custom domain theedgesearch.my.id
1. Di project Pages → **Custom domains** → **Set up a custom domain** → isi `theedgesearch.my.id`.
2. Jika DNS domain sudah di Cloudflare (nameserver Cloudflare), record CNAME
   dibuat otomatis. Jika DNS di tempat lain, tambahkan CNAME ke
   `<project>.pages.dev` sesuai petunjuk Cloudflare.
3. Tunggu SSL aktif (biasanya beberapa menit), lalu cek `https://theedgesearch.my.id/`.

## 4. Auto-posting harian (1 artikel/hari, 09:00 WIB)
Ada **2 cara** — pilih salah satu:

### Cara A — GitHub Actions (disarankan, sudah disiapkan)
Workflow `.github/workflows/daily-rebuild.yml` jalan tiap hari 02:00 UTC
(= 09:00 WIB), rebuild, lalu deploy via Wrangler.
Yang perlu disiapkan (sekali saja):
1. Di Cloudflare: **My Profile → API Tokens → Create Token** → template
   **"Edit Cloudflare Workers"** (atau custom: Pages:Edit + Account:Read).
   Salin token-nya.
2. Di Cloudflare dashboard, catat **Account ID** (di halaman Workers & Pages,
   kolom kanan).
3. Di GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CF_API_TOKEN` = token dari langkah 1
   - `CF_ACCOUNT_ID` = Account ID dari langkah 2
4. Tes manual: tab **Actions → Daily rebuild → Run workflow**. Jika sukses,
   artikel tanggal hari itu akan muncul.
5. Pastikan nama project Pages sama dengan yang tertulis di workflow:
   `theedgesearch`. Kalau nama project berbeda, ubah baris
   `pages deploy dist --project-name theedgesearch` di workflow.

### Cara B — Deploy Hook (lebih sederhana, tanpa secret GitHub)
1. Di Cloudflare Pages project → **Settings → Builds & deployments → Deploy hooks → Create** → beri nama mis. `daily`.
2. Salin URL hook-nya, lalu buat cron/scheduler apa pun (mis. cron-job.org gratis)
   yang memanggil URL itu tiap hari 02:00 UTC. Setiap panggilan = rebuild +
   deploy otomatis dari commit terakhir di GitHub.
3. Catatan: cara ini hanya rebuild dari kode yang sudah di-push ke GitHub.
   Artikel baru tetap harus di-push dulu ke repo (batch artikel lanjutan).

> Alternatif manual: kapan saja jalankan `npm run build` lalu upload isi
> folder `dist/` lewat **Cloudflare Dashboard → Pages → Create deployment →
> Direct Upload**. Cocok untuk tes cepat, tapi bukan auto-posting.

## 5. AdSense (nanti, setelah ada konten)
- `ads.txt` di `dist/ads.txt` sudah berisi Publisher ID default Anda:
  `ca-pub-8784618714761378` — **mohon konfirmasi** apakah ID ini benar untuk
  domain ini sebelum pengajuan AdSense.
- Halaman standar sudah ada: `/about/`, `/contact/`, `/privacy-policy/`,
  `/disclaimer/`, `/terms/`, sitemap (`/sitemap.xml`), `robots.txt`.
- Setelah domain live dan ada cukup artikel terbit, daftarkan di Google
  AdSense, lalu tempel kode iklan (slot) bila diminta — beri tahu asisten
  agar slot dimasukkan ke template.

## 6. Menambah artikel (batch lanjutan)
1. Cek `data/registry.md` dulu — slug dan URL gambar **tidak boleh duplikat**.
2. Tambah artikel ke `data/articles.json` (tanggal `publish_date` berurutan,
   1/hari, 10 tag, ±400 kata, 2 internal link se-kategori bila sudah ada).
3. Daftarkan slug + gambar baru di `data/registry.md`.
4. Jalankan `node build.js` lokal untuk cek, lalu `git push` — deploy
   berikutnya (otomatis harian / manual) akan menerbitkannya tepat tanggalnya.

## Perintah lokal
```bash
npm run build          # build ke dist/
BUILD_DATE=2026-11-13 npm run build   # simulasi tanggal (untuk tes)
npm run serve          # build + server lokal http://localhost:8000
```

## File penting
- `build.js` — generator (Node stdlib saja)
- `data/articles.json` — semua artikel (saat ini 3 contoh)
- `data/registry.md` — daftar slug/gambar anti-duplikat
- `.github/workflows/daily-rebuild.yml` — cron harian 02:00 UTC
- `dist/` — hasil build (jangan diedit manual, dibuat ulang tiap build)
