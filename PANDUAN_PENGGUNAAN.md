# Panduan Penggunaan — Pipeline Integrity System
**PHR Prabumulih Field**

---

## Apa Itu Sistem Ini?

Pipeline Integrity System adalah aplikasi web berbasis PWA (bisa diinstal seperti aplikasi di HP/laptop) untuk **memantau, mengelola, dan menganalisis kondisi integritas pipa** di Prabumulih Field. Sistem ini menggantikan pencatatan manual di Excel dan memberikan visibilitas real-time terhadap kondisi seluruh aset pipa.

---

## Cara Mengakses

- **Web:** https://pipeline-integrity-swart.vercel.app
- **Install di HP:** Buka link → ketuk ikon "Tambahkan ke Layar Utama"
- **Login:** Gunakan email dan password yang diberikan admin

---

## Modul & Cara Penggunaan

### 1. Dashboard
**Fungsi:** Ringkasan kondisi seluruh aset pipa dalam satu halaman.

**Informasi yang tersedia:**
- Total flowline dan segmen yang terdaftar
- Jumlah pipa berstatus **BAD** (perlu tindakan segera)
- Jumlah pipa **Prioritas P1**
- Total panjang flowline dan trunkline (km)
- Distribusi status: BAD / MONITOR / GOOD
- Alert COI/PLO yang akan berakhir ≤90 hari
- 5 kejadian kebocoran terbaru

**Cara pakai:**
1. Buka halaman Dashboard setelah login
2. Pantau card status BAD dan P1 — jika angka tinggi, perlu tindakan segera
3. Cek tabel "COI/PLO Akan Berakhir" — perpanjang sertifikat sebelum kedaluwarsa
4. Klik **Refresh** untuk memperbarui data tanpa reload halaman

---

### 2. Flowline Register
**Fungsi:** Master data seluruh flowline (pipa dari sumur ke stasiun pengumpul).

**Informasi yang dikelola:**
- Identitas pipa: nama, cluster, dari sumur → ke stasiun
- Spesifikasi: panjang (m), tahun konstruksi, jenis sumur
- Dokumen: RLA, RE, COI/PLO, sertifikat berlaku
- Status integritas: GOOD / MONITOR / BAD
- Prioritas: P1 (kritis) → P4 (normal)

**Cara pakai:**
1. **Tambah flowline baru:** Klik tombol **+ Tambah**, isi form, simpan
2. **Edit data:** Klik ikon pensil di baris yang ingin diubah
3. **Hapus:** Klik ikon hapus (konfirmasi diperlukan)
4. **Cari:** Ketik nama sumur, cluster, atau status di kotak pencarian
5. **Export Excel:** Klik **Export** untuk download semua data ke file .xlsx

**Manfaat:** Tidak perlu lagi buka Excel besar — semua data flowline terpusat dan bisa dicari dengan cepat.

---

### 3. Monitoring Inspeksi
**Fungsi:** Data teknis hasil inspeksi per segmen pipa (lebih detail dari flowline register).

**Informasi yang dikelola:**
- Lokasi segmen: dari titik → ke titik
- Kategori: FLOWLINE / TRUNKLINE / INJECTION LINE
- Spesifikasi teknis: diameter (inch), panjang (m), tahun konstruksi
- Hasil inspeksi: corrosion rate (mm/thn), remain life (thn), ANSI rating
- Status integritas dan tindak lanjut inspeksi
- Jumlah kejadian kebocoran per segmen (otomatis dari trigger)

**Cara pakai:**
1. **Filter status:** Pilih ALL / GOOD / MONITOR / BAD untuk filter cepat
2. **Cari segmen:** Ketik nama lokasi atau kategori
3. **Edit data inspeksi:** Klik pensil → update corrosion rate, remain life, status
4. **Export:** Download data monitoring ke Excel

**Manfaat:** Inspektor bisa update hasil inspeksi langsung dari lapangan via HP.

---

### 4. History Kebocoran
**Fungsi:** Pencatatan dan penelusuran seluruh kejadian kebocoran pipa.

**Informasi yang dicatat:**
- Lokasi bocor (kode sumur), distrik, struktur, KP
- Tanggal kejadian, mulai dan selesai perbaikan
- Jumlah titik: bocor, clamp, sadel, sisip (meter)
- Keterangan tambahan

**Cara pakai:**
1. **Catat kebocoran baru:** Klik **+ Catat**, isi form
   - **Wajib:** Pilih **Segmen Pipa** → otomatis update Decision Matrix
   - Field **Lokasi** terisi otomatis sesuai segmen yang dipilih
2. **Cari:** Ketik lokasi, distrik, atau struktur
3. **Summary cards** di atas tabel menampilkan total bocor/clamp/sadel/sisip dari **semua data** (bukan hanya halaman yang ditampilkan)
4. **Export All:** Download seluruh data ke Excel (bukan hanya halaman aktif)

**Manfaat:** Riwayat bocor lengkap dan terstruktur, bisa dianalisis per lokasi atau periode. Data langsung terhubung ke Decision Matrix.

---

### 5. Decision Matrix
**Fungsi:** Visualisasi risiko seluruh segmen pipa dalam format matriks PoF × CoF.

**Cara membaca:**
- **PoF (Probability of Failure)** = seberapa sering pipa bocor
  - PoF 1: 0-1× bocor | PoF 2: 2-3× | PoF 3: 4-7× | PoF 4: 8-14× | PoF 5: ≥15×
- **CoF (Consequence of Failure)** = seberapa besar dampak jika bocor
  - CoF 5: Status BAD | CoF 4: MONITOR + Gas | CoF 3: MONITOR + Oil | CoF 2: GOOD + Gas | CoF 1: GOOD
- **Risk Level:** R1-R2 (hijau, aman) → R3 (oranye, perlu pantau) → R4-R5 (merah, berbahaya)

**Cara pakai:**
1. Klik sel matriks untuk melihat daftar segmen di posisi risiko tersebut
2. Segmen di R4-R5 adalah prioritas utama untuk penanganan
3. Matrix **otomatis berubah** ketika:
   - Data kebocoran baru diinput (PoF naik)
   - Status inspeksi diupdate dari MONITOR → GOOD (CoF turun)

**Manfaat:** Membantu pengambilan keputusan berbasis risiko — segmen mana yang harus ditangani lebih dulu.

---

### 6. CBA Kalkulator
**Fungsi:** Menghitung kelayakan ekonomi penggantian pipa (Cost-Benefit Analysis).

**Cara pakai:**
1. **Pilih segmen pipa** dari dropdown — data teknis terisi otomatis:
   - Diameter, panjang, umur pipa
   - Frekuensi bocor per tahun (dari data historis)
   - Toggle Oil/Gas dari service fluid segmen
2. **Isi parameter ekonomi** (harga oil/gas, biaya mobilisasi, gaji crew, WACC, dll)
3. **Tentukan panjang pipa yang akan diganti** (Panjang Ganti)
4. Klik **Hitung CBA**

**Membaca hasil:**
- **Kerugian Tahunan:** Total kerugian produksi + emergency cost akibat bocor per tahun
- **Total CAPEX:** Biaya penggantian pipa (material + mobilisasi + crew + mesin)
- **NPV:** Jika positif → penggantian **LAYAK** secara ekonomi
- **Payback:** Berapa tahun modal kembali dari penghematan kerugian
- Tabel tahunan menunjukkan proyeksi cashflow 1-10 tahun

**Manfaat:** Menyediakan justifikasi ekonomi untuk pengajuan budget penggantian pipa ke manajemen.

---

### 7. Manajemen User *(Admin only)*
**Fungsi:** Mengelola akun pengguna sistem.

**Role yang tersedia:**
| Role | Akses |
|---|---|
| Admin | Semua fitur + User Management + Import Excel |
| Inspektor | Dashboard, Flowline, Monitoring, Kebocoran, Matrix, CBA |
| Sr. Mekanik | Sama seperti Inspektor |
| Mekanik | Sama seperti Inspektor |
| Viewer | Hanya bisa lihat, tidak bisa edit |

**Cara tambah user baru:**
1. Isi form: Username, Nama Lengkap, NIP, Role
2. Klik **Generate SQL**
3. Copy SQL yang muncul → paste di Supabase SQL Editor → Run
4. Berikan email dan password kepada user baru

---

### 8. Import Excel *(Admin only)*
**Fungsi:** Upload data massal dari file Excel ke database.

**Format yang diterima:** File .xlsx dengan 3 sheet:
1. **Sheet 1:** Data Flowline (master register)
2. **Sheet 2:** Data Segmen (monitoring inspeksi)
3. **Sheet 3:** Data Kebocoran (history bocor)

**Cara pakai:**
1. Klik **Pilih File Excel** → pilih file
2. Preview data yang akan diimport (jumlah baris per sheet)
3. Sistem otomatis **skip duplikat** (cek berdasarkan nama lokasi)
4. Klik **Import** untuk memasukkan ke database

**Manfaat:** Migrasi data lama dari Excel ke sistem bisa dilakukan sekaligus tanpa input manual satu per satu.

---

## Alur Kerja Harian

```
Lapangan bocor
     ↓
Catat di History Kebocoran → pilih segmen → lokasi auto-terisi
     ↓
Trigger otomatis update leak_event di segmen tersebut
     ↓
Decision Matrix otomatis naik PoF-nya
     ↓
Segmen berpindah ke zona risiko lebih tinggi (misal R3 → R4)
     ↓
Tim identifikasi segmen R4-R5 dari Decision Matrix
     ↓
Jalankan CBA untuk segmen tersebut → dapat justifikasi ekonomi
     ↓
Ajukan budget penggantian ke manajemen
     ↓
Setelah pipa diganti → update status inspeksi: BAD → GOOD
     ↓
Decision Matrix CoF turun → segmen kembali ke zona aman
```

---

## Notifikasi Update Aplikasi

Saat ada versi baru sistem yang di-deploy, banner biru akan muncul di bawah layar:
> **"Versi baru tersedia"** [UPDATE]

Klik tombol **UPDATE** untuk memuat versi terbaru tanpa kehilangan data.

---

## Kontak & Support

Untuk pertanyaan teknis atau penambahan fitur, hubungi administrator sistem.
