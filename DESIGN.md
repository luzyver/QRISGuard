---
version: alpha
name: "QRISGuard Listener"
description: "Utilitas pemantau pembayaran yang tenang, aman, dan mudah dipindai saat operasional."
colors:
  primary: "#0B6B5E"
  primary-pressed: "#075348"
  background: "#F4F7F6"
  surface: "#FFFFFF"
  ink: "#14201E"
  muted: "#5F6F6B"
  border: "#DCE5E2"
  success: "#147D64"
  success-soft: "#E4F3EE"
  warning: "#9A6700"
  warning-soft: "#FFF4D6"
  danger: "#B42318"
  danger-soft: "#FDEAE8"
typography:
  sans:
    fontFamily: "Roboto, system-ui, sans-serif"
  numeric:
    fontFamily: "Roboto, system-ui, sans-serif"
rounded:
  sm: "0.5rem"
  DEFAULT: "0.75rem"
  lg: "1rem"
  full: "999px"
spacing:
  control: "0.75rem"
  content: "1.25rem"
  section: "1.75rem"
components:
  button:
    minHeight: "3rem"
  input:
    minHeight: "3.25rem"
  panel:
    borderColor: "#DCE5E2"
  tabs:
    minHeight: "3rem"
---

# QRISGuard Listener Design System

## Overview

### Creative North Star

Panel status pada perangkat kasir: informasi penting terbaca dalam satu pandangan, indikator jelas, dan permukaan tenang yang tidak bersaing dengan pekerjaan pengguna.

### Product context and register

- **Audience and primary job:** operator QRIS di Indonesia yang perlu memastikan listener aktif, webhook benar, dan transaksi telah diterima server.
- **Target market(s) and evidence:** Indonesia, berdasarkan fungsi QRIS, locale permintaan, dan kontrak data proyek.
- **Locale(s) and language policy:** seluruh UI milik aplikasi memakai Bahasa Indonesia; nama package dan payload teknis tidak diterjemahkan.
- **Usage scene:** ponsel Android operasional, diperiksa singkat tetapi berulang, sering saat transaksi sedang berlangsung.
- **Register:** product utility.
- **Memorable signature:** perisai yang menyatukan sudut pemindai QR dan gelombang notifikasi.
- **Restraint:** form, daftar, status, dan error memakai affordance Material yang familiar tanpa dekorasi tambahan.
- **Anti-references:** neon cyber-security, gradient penuh, glassmorphism, kartu warna-warni, dan bayangan berat.
- **Token ownership/runtime mapping:** file ini menetapkan keputusan; nilai runtime dipetakan satu-ke-satu di `mobile/src/theme.ts` dan dikonsumsi screen utama.

## Colors

`primary` hanya untuk aksi utama, selection, focus, dan status aktif. Surface netral memisahkan kelompok lewat border. `success`, `warning`, dan `danger` selalu disertai teks atau simbol, tidak pernah menjadi satu-satunya pembeda.

## Typography

Roboto/system mengikuti platform dan pengaturan ukuran teks. Heading memakai weight 700, label 600, body 400–500. Teks memakai sentence case; package ID dan URL boleh membungkus tanpa dipotong permanen.

## Layout

Satu top app bar, satu tablist, lalu satu scroll owner pada panel aktif. Padding halaman 20 dp, gap section 28 dp, dan kontrol minimal 48 dp. Safe area serta keyboard resize harus menjaga input dan aksi tetap terjangkau.

## Elevation & Depth

Hierarki utama datang dari tonal surface dan border. Shadow sangat tipis hanya untuk header/elemen yang benar-benar berada di atas konten; panel statis tetap datar.

## Shapes

Kontrol memakai radius 12 dp, panel 16 dp, badge/status pill radius penuh. Bentuk konsisten dan tidak mencampur sudut tajam dengan pill dekoratif.

## Components

### Foundational visual states

Press memakai perubahan tone, focus memakai primary, disabled memakai opacity dengan label tetap terbaca, busy mempertahankan ukuran, error memakai copy pemulihan, dan loading menjaga ruang konten.

### Buttons and actions

Filled teal untuk aksi utama, outline untuk aksi sekunder, text danger untuk hapus. Satu area keputusan hanya memiliki satu aksi utama.

### Navigation and data display

Tab Ringkasan dan Riwayat adalah peer view lokal. Riwayat memakai daftar virtual, mempertahankan data lama saat refresh, serta menyediakan loading, empty, dan retry.

### Forms and overlays

Input memiliki label nyata, hint, validation copy, dan target 52 dp. Feedback simpan muncul inline; tidak memakai alert, toast native, atau dialog browser.

### Iconography

Simbol sederhana, geometric, dan solid/outline konsisten. Icon-only action wajib memiliki label aksesibilitas; aksi tidak umum tetap memakai teks.

### Motion

Motion hanya feedback press dan pergantian state singkat. Tidak ada animasi dekoratif atau urutan page-load.

### Content and data visualization

Copy langsung dan operasional. Nominal memakai format Rupiah tanpa desimal; waktu history memakai `Asia/Jakarta` dan locale Indonesia.

## Do's and Don'ts

- **Do:** prioritaskan status listener dan langkah pemulihan.
- **Do:** pertahankan istilah yang sama untuk aksi dan feedback.
- **Don't:** memberi tiap section warna latar berbeda.
- **Don't:** memakai warna, kapital penuh, atau ikon saja sebagai satu-satunya penanda status.
