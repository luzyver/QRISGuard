# QRISGuard

Sistem verifikasi pembayaran QRIS otomatis tanpa API official. Generate QRIS dinamis, polling pembayaran, dan verifikasi otomatis.

## Arsitektur

```mermaid
flowchart LR
    subgraph mobile[Mobile App]
        A[Dana / GoPay Notification]
    end

    subgraph webhook[Webhook Service]
        B[POST /api/notifications]
    end

    subgraph db[PostgreSQL]
        C[notifications]
    end

    subgraph qris[QRIS Service]
        D[Generate QR Dinamis]
        E[Verifikasi Pembayaran]
    end

    A -->|kirim notifikasi| B
    B -->|simpan| C
    C -->|ambil data| D
    D -->|tampilkan QR| F[User Scan dan Bayar]
    F -->|pembayaran masuk| E
    E -->|cek status| C
```

**Alur:**
1. Mobile app menangkap notifikasi pembayaran Dana/GoPay di HP
2. Notifikasi dikirim ke webhook dan disimpan di PostgreSQL
3. QRIS service generate QRIS dinamis dengan nominal unik, lalu polling webhook sampai pembayaran terdeteksi

## Komponen

| Komponen | Stack | Port | Fungsi |
|----------|-------|------|--------|
| `postgres/` | PostgreSQL 16 | 5432 | Database notifikasi |
| `webhook/` | Go + pgx | 3030 | REST API penyimpanan notifikasi |
| `qris/` | Go | 8888 | Generate QRIS + verifikasi pembayaran |
| `mobile/` | React Native | - | Notification listener (Dana & GoPay) |

## Quick Start

### Docker Compose

Setiap komponen punya `docker-compose.yml` sendiri. Jalankan berurutan:

```bash
# Buat satu kali agar ketiga Compose dapat saling menemukan
docker network inspect qrisguard >/dev/null 2>&1 || docker network create qrisguard

# 1. PostgreSQL
cd postgres
cp .env.example .env
docker compose up -d

# 2. Webhook
cd ../webhook
cp .env.example .env
docker compose up -d --build

# 3. QRIS
cd ../qris
cp .env.example .env
docker compose up -d --build
```

### Mobile App

```bash
cd mobile
npm install
npx react-native run-android
```

Masukkan API URL webhook di halaman Settings pada aplikasi.

## API

### QRIS (`localhost:8888`)

```
POST   /api/payments          Buat pembayaran baru
GET    /api/payments/{id}     Cek status pembayaran
GET    /api/payments/{id}/qr  Ambil QR code (PNG)
DELETE /api/payments/{id}     Batalkan sesi
```

**Contoh:**

```bash
# Buat pembayaran
curl -X POST http://localhost:8888/api/payments \
  -H "Content-Type: application/json" \
  -d '{"base_amount": 50000}'

# Response:
# {"id":"...","amount":50023,"qr_payload":"000201...","status":"waiting","created_at":"..."}

# Cek status
curl http://localhost:8888/api/payments/{id}

# Ambil QR code
curl http://localhost:8888/api/payments/{id}/qr -o qr.png
```

### Webhook (`localhost:3030`)

```
GET    /api/notifications              Ambil notifikasi (?packageName=id.dana)
POST   /api/notifications              Simpan notifikasi dari mobile
GET    /health                         Health check
```

## Environment Variables

### postgres/.env

```env
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=danabisnis
```

### webhook/.env

```env
DATABASE_URL=postgres://user:password@127.0.0.1:5432/danabisnis?sslmode=disable
PORT=3030
```

### qris/.env

```env
API_URL=http://127.0.0.1:3030/api/notifications
QRIS_STATIC=your-static-qris-string
PORT=8888
POLL_INTERVAL_SEC=5
```

## Build APK (CI)

APK di-build otomatis via GitHub Actions setiap push ke `master`. Download dari tab **Actions > Artifacts**.
