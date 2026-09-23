import {
  fetchNotificationHistory,
  formatHistoryTime,
  formatRupiah,
} from './history';

const response = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);

afterEach(() => {
  jest.restoreAllMocks();
});

test('mengambil dan menormalkan riwayat notifikasi dari webhook', async () => {
  jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
    response({
      success: true,
      message: 'berhasil mengambil notifikasi',
      data: [
        {
          id: 8,
          device_id: 'kasir-1',
          package_name: 'id.dana',
          app_name: 'DANA',
          title: 'Pembayaran diterima',
          text: 'Rp50.023',
          sub_text: null,
          big_text: null,
          posted_at: '2026-08-28T15:00:00+07:00',
          amount_detected: '50023',
        },
      ],
      error: null,
    }),
  );

  await expect(
    fetchNotificationHistory('https://example.com/api/notifications'),
  ).resolves.toEqual([
    {
      id: 8,
      deviceId: 'kasir-1',
      packageName: 'id.dana',
      appName: 'DANA',
      title: 'Pembayaran diterima',
      text: 'Rp50.023',
      subText: null,
      bigText: null,
      postedAt: '2026-08-28T15:00:00+07:00',
      amountDetected: 50023,
    },
  ]);
});

test('menolak URL kosong sebelum melakukan request', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  await expect(fetchNotificationHistory('   ')).rejects.toThrow(
    'URL webhook belum diatur.',
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('menolak respons HTTP dan envelope webhook yang gagal', async () => {
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(() => response({}, false, 503))
    .mockImplementationOnce(() =>
      response({success: false, message: 'database tidak tersedia', data: null}),
    );

  await expect(fetchNotificationHistory('https://example.com')).rejects.toThrow(
    'Webhook merespons dengan status 503.',
  );
  await expect(fetchNotificationHistory('https://example.com')).rejects.toThrow(
    'database tidak tersedia',
  );
});

test('menolak data history yang bukan array', async () => {
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => response({success: true, data: {id: 1}}));

  await expect(fetchNotificationHistory('https://example.com')).rejects.toThrow(
    'Format riwayat dari webhook tidak valid.',
  );
});

test('memformat nominal rupiah dan waktu WIB tanpa melempar untuk input invalid', () => {
  expect(formatRupiah(50023)).toBe('Rp50.023');
  expect(formatHistoryTime('2026-08-28T15:00:00+07:00')).toContain('28 Agu 2026');
  expect(formatHistoryTime('bukan-tanggal')).toBe('Waktu tidak tersedia');
});
