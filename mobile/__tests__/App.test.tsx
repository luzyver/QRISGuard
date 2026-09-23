/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('../src/native/NotificationListener', () => ({
  isPermissionGranted: jest.fn(() => new Promise(() => {})),
  openNotificationSettings: jest.fn().mockResolvedValue(undefined),
  getWhitelist: jest.fn(() => new Promise(() => {})),
  setWhitelist: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/settings', () => ({
  getBackendUrl: jest.fn(() => new Promise(() => {})),
  setBackendUrl: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/history', () => ({
  fetchNotificationHistory: jest.fn().mockResolvedValue([]),
  formatRupiah: jest.fn((value: number) => `Rp${value}`),
  formatHistoryTime: jest.fn(() => '28 Agu 2026, 15.00'),
}));

test('menampilkan identitas dan navigasi utama QRISGuard Listener', () => {
  jest.useFakeTimers();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const rendered = JSON.stringify(renderer.toJSON());
  expect(rendered).toContain('QRISGuard Listener');
  expect(rendered).toContain('Ringkasan');
  expect(rendered).toContain('Riwayat');

  ReactTestRenderer.act(() => renderer.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
});
