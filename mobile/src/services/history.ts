export interface NotificationHistoryItem {
  id: number;
  deviceId: string | null;
  packageName: string;
  appName: string | null;
  title: string | null;
  text: string | null;
  subText: string | null;
  bigText: string | null;
  postedAt: string;
  amountDetected: number;
}

interface HistoryEnvelope {
  success: boolean;
  message?: string;
  data?: unknown;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeItem(value: unknown): NotificationHistoryItem {
  const item = value as Record<string, unknown>;
  return {
    id: Number(item.id),
    deviceId: nullableString(item.device_id),
    packageName: String(item.package_name ?? ''),
    appName: nullableString(item.app_name),
    title: nullableString(item.title),
    text: nullableString(item.text),
    subText: nullableString(item.sub_text),
    bigText: nullableString(item.big_text),
    postedAt: String(item.posted_at ?? ''),
    amountDetected: Number(item.amount_detected),
  };
}

export async function fetchNotificationHistory(
  url: string,
): Promise<NotificationHistoryItem[]> {
  const endpoint = url.trim();
  if (!endpoint) {
    throw new Error('URL webhook belum diatur.');
  }

  const result = await fetch(endpoint, {headers: {Accept: 'application/json'}});
  if (!result.ok) {
    throw new Error(`Webhook merespons dengan status ${result.status}.`);
  }

  const body = (await result.json()) as HistoryEnvelope;
  if (!body.success) {
    throw new Error(body.message || 'Webhook gagal mengambil riwayat.');
  }
  if (!Array.isArray(body.data)) {
    throw new Error('Format riwayat dari webhook tidak valid.');
  }

  return body.data.map(normalizeItem);
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '');
}

export function formatHistoryTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Waktu tidak tersedia';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}
