# Nevermind Admin Web (`nvm-admin-web`)

Dashboard internal dan sistem backoffice untuk operasional e-commerce **Nevermind Store** (Flypick-Nevermind). Dibangun khusus untuk mengelola katalog produk, pesanan pelanggan, pelacakan logistik cross-border (China ke Indonesia), kupon voucher diskon, dan kategori produk.

---

## 🌟 Fitur Utama

- **📊 Dashboard & Ringkasan Penjualan**
  - Statistik real-time: total omset, jumlah pesanan masuk, produk aktif, dan voucher aktif.
  - Tabel pesanan terbaru dengan status pembayaran dan status pelacakan logistik.
  - Navigasi cepat (*Quick Actions*) ke manajemen katalog dan logistik.

- **👗 Manajemen Produk (Products)**
  - Tampilan daftar produk dengan foto, varian harga, stok, dan tag kategori.
  - Pencarian dan filter produk berdasarkan kategori (misal: *cute-finds*, *y2k-core*, *shoulder-bag*).
  - Modal form pembuatan produk baru dengan integrasi langsung ke backend API.
  - Hapus produk dengan konfirmasi aman.

- **🏷️ Kategori Produk (Categories)**
  - Manajemen master kategori produk (`product-category-types`).
  - Integrasi dengan sistem filter storefront pelanggan.

- **🚚 Manajemen Pesanan & Logistik (Orders & Tracking)**
  - Daftar pesanan masuk lengkap dengan rincian item, data pengiriman pelanggan, dan nomor WhatsApp.
  - Manajemen status pembayaran (`paid`, `pending`, `failed`).
  - **Cross-Border Pipeline Tracker**: Update tahapan logistik pesanan dari:
    `payment_confirmed` ➔ `china_warehouse` ➔ `qc_passed` ➔ `in_transit` ➔ `customs_cleared` ➔ `local_delivery` ➔ `delivered`.
  - Input nomor resi China (*China Tracking Number*) & kurir lokal.

- **🎟️ Voucher & Promo Diskon (Vouchers)**
  - Buat kupon promo baru dengan pilihan diskon persentase (`%`) atau potongan tetap (`IDR`).
  - Atur batas kuota penggunaan, minimum belanja, dan maksimum potongan diskon.
  - Toggle aktif/non-aktifkan voucher secara instan.

- **🔐 Autentikasi & Session**
  - Panel login admin dengan persistent auth state via Zustand & localStorage.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) dengan compiler Turbopack
- **Library UI**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Linting**: ESLint 9

---

## 📁 Struktur Direktori

```text
nvm-admin-web/
├── public/                 # Aset publik statis (favicon, icons, dsb)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── categories/     # Halaman manajemen kategori
│   │   ├── orders/         # Halaman manajemen & pelacakan pesanan
│   │   ├── products/       # Halaman katalog produk & tambah produk
│   │   ├── vouchers/       # Halaman kupon promo & voucher diskon
│   │   ├── globals.css     # Tailwind v4 tema & styling global
│   │   ├── layout.tsx      # Root layout & navigasi admin shell
│   │   └── page.tsx        # Dashboard home / ringkasan statistik
│   ├── components/         # Komponen UI Reusable
│   │   ├── AdminHeader.tsx # Header admin dengan notifikasi & profil
│   │   └── AdminSidebar.tsx# Sidebar navigasi rute admin
│   ├── lib/
│   │   └── api.ts          # Admin API client, endpoints, dan fallback data demo
│   ├── store/
│   │   └── adminAuthStore.ts # Global auth store (Zustand)
│   └── types/
│       └── index.ts        # TypeScript interface & types model
├── .env.local              # Konfigurasi environment lokal (diabaikan git)
├── next.config.ts          # Konfigurasi Next.js
├── package.json            # Dependency & script npm
└── tsconfig.json           # Konfigurasi TypeScript
```

---

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat
- **Node.js**: Versi 18.18+ atau 20+ disarankan
- **npm** atau **yarn** / **pnpm**

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Buat atau sesuaikan file `.env.local` di root folder:
```env
NEXT_PUBLIC_API_URL=https://service-nvm-production.up.railway.app/api
```

> **Catatan**: Jika API backend sedang tidak aktif atau lambat merespons, aplikasi admin secara otomatis menggunakan data mock/demo (*fallback mode*) sehingga UI dan flow tetap dapat diuji tanpa hambatan.

### 4. Menjalankan Server Development
```bash
npm run dev
```

Secara default, aplikasi admin berjalan pada port **3001** agar tidak bentrok dengan storefront utama:
Buka [http://localhost:3001](http://localhost:3001) di browser Anda.

### 5. Build untuk Produksi
```bash
npm run build
npm run start
```

---

## 🔗 Ekosistem Nevermind

| Repository / Service | Deskripsi | URL / Port Default |
| :--- | :--- | :--- |
| **`nvm-store-web`** | Storefront web untuk pelanggan Nevermind | `http://localhost:3000` |
| **`nvm-admin-web`** | Dashboard backoffice admin (repo ini) | `http://localhost:3001` |
| **`service-nvm`** | Backend API & Database (Go / Gin / PostgreSQL) | `https://service-nvm-production.up.railway.app/api` |

---

## 📄 Lisensi
Hak Cipta © 2026 **Flypick-Nevermind**. Seluruh hak cipta dilindungi undang-undang.
