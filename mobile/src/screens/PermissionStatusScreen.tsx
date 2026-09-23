import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  getWhitelist,
  isPermissionGranted,
  openNotificationSettings,
  setWhitelist,
} from '../native/NotificationListener';
import {PERMISSION_REFRESH_INTERVAL} from '../constants';
import {
  fetchNotificationHistory,
  formatHistoryTime,
  formatRupiah,
  NotificationHistoryItem,
} from '../services/history';
import {getBackendUrl, setBackendUrl} from '../services/settings';
import {colors, radii, spacing} from '../theme';

type Tab = 'summary' | 'history';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

export default function PermissionStatusScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState('');
  const [configuredUrl, setConfiguredUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [apps, setApps] = useState<string[]>([]);
  const [newApp, setNewApp] = useState('');
  const [appError, setAppError] = useState('');
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyRequest = useRef(0);
  const mounted = useRef(true);

  const checkPermission = useCallback(async () => {
    const granted = await isPermissionGranted();
    if (mounted.current) {
      setPermissionGranted(granted);
      setPermissionLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    checkPermission();
    const interval = setInterval(checkPermission, PERMISSION_REFRESH_INTERVAL);
    Promise.all([getBackendUrl(), getWhitelist()]).then(([url, whitelist]) => {
      if (!mounted.current) {
        return;
      }
      const savedUrl = url?.trim() ?? '';
      setApiUrl(savedUrl);
      setConfiguredUrl(savedUrl);
      setApps(whitelist);
    });
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [checkPermission]);

  const loadHistory = useCallback(
    async (refresh = false) => {
      if (!configuredUrl) {
        return;
      }
      const request = ++historyRequest.current;
      refresh ? setHistoryRefreshing(true) : setHistoryLoading(true);
      setHistoryError('');
      try {
        const items = await fetchNotificationHistory(configuredUrl);
        if (mounted.current && request === historyRequest.current) {
          setHistory(items);
        }
      } catch (error) {
        if (mounted.current && request === historyRequest.current) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : 'Riwayat belum dapat dimuat. Periksa koneksi lalu coba lagi.',
          );
        }
      } finally {
        if (mounted.current && request === historyRequest.current) {
          setHistoryLoading(false);
          setHistoryRefreshing(false);
        }
      }
    },
    [configuredUrl],
  );

  useEffect(() => {
    if (activeTab === 'history' && configuredUrl) {
      loadHistory();
    }
  }, [activeTab, configuredUrl, loadHistory]);

  const handleSave = async () => {
    const value = apiUrl.trim();
    setSaveState('idle');
    if (!isHttpUrl(value)) {
      setUrlError('Masukkan URL lengkap yang diawali http:// atau https://.');
      return;
    }
    setUrlError('');
    setSaveState('saving');
    try {
      await setBackendUrl(value);
      setConfiguredUrl(value);
      setApiUrl(value);
      setSaveState('saved');
    } catch {
      setSaveState('error');
      setUrlError('URL belum tersimpan. Periksa koneksi lalu coba lagi.');
    }
  };

  const handleAddApp = async () => {
    const packageName = newApp.trim();
    if (!packageName) {
      setAppError('Masukkan package aplikasi, misalnya id.dana.');
      return;
    }
    if (apps.includes(packageName)) {
      setAppError('Aplikasi ini sudah ada dalam daftar.');
      return;
    }
    const next = [...apps, packageName];
    await setWhitelist(next);
    setApps(next);
    setNewApp('');
    setAppError('');
  };

  const handleRemoveApp = async (packageName: string) => {
    const next = apps.filter(app => app !== packageName);
    await setWhitelist(next);
    setApps(next);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader />
        <View accessibilityRole="tablist" style={styles.tabs}>
          <TabButton
            label="Ringkasan"
            selected={activeTab === 'summary'}
            onPress={() => setActiveTab('summary')}
          />
          <TabButton
            label="Riwayat"
            selected={activeTab === 'history'}
            onPress={() => setActiveTab('history')}
          />
        </View>

        {activeTab === 'summary' ? (
          <ScrollView
            contentContainerStyle={styles.summaryContent}
            keyboardShouldPersistTaps="handled">
            <StatusPanel
              loading={permissionLoading}
              granted={permissionGranted}
              onOpenSettings={openNotificationSettings}
            />

            <Section
              eyebrow="KONEKSI SERVER"
              title="Webhook tujuan"
              description="Notifikasi pembayaran dikirim dan riwayat dibaca dari alamat yang sama.">
              <Text style={styles.fieldLabel}>URL webhook</Text>
              <TextInput
                accessibilityLabel="URL webhook"
                accessibilityHint="Masukkan alamat endpoint notifikasi"
                style={[styles.input, urlError ? styles.inputError : null]}
                value={apiUrl}
                onChangeText={value => {
                  setApiUrl(value);
                  setUrlError('');
                  setSaveState('idle');
                }}
                placeholder="https://server.example/api/notifications"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={urlError ? styles.errorText : styles.fieldHint}>
                {urlError || 'Gunakan endpoint yang menerima POST dan menyediakan GET history.'}
              </Text>
              <PrimaryButton
                label={saveState === 'saved' ? 'Perubahan tersimpan' : 'Simpan perubahan'}
                busy={saveState === 'saving'}
                disabled={saveState === 'saving'}
                onPress={handleSave}
              />
            </Section>

            <Section
              eyebrow="SUMBER NOTIFIKASI"
              title="Aplikasi dipantau"
              description="Hanya notifikasi dari package berikut yang diteruskan ke webhook.">
              {apps.length === 0 ? (
                <View style={styles.inlineEmpty}>
                  <Text style={styles.inlineEmptyTitle}>Belum ada aplikasi</Text>
                  <Text style={styles.inlineEmptyText}>
                    Tambahkan package aplikasi pembayaran untuk mulai memantau.
                  </Text>
                </View>
              ) : (
                <View style={styles.appList}>
                  {apps.map(packageName => (
                    <View key={packageName} style={styles.appRow}>
                      <View style={styles.appGlyph}>
                        <Text style={styles.appGlyphText}>
                          {packageName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <Text selectable style={styles.packageName}>
                        {packageName}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Hapus ${packageName}`}
                        hitSlop={8}
                        onPress={() => handleRemoveApp(packageName)}
                        style={({pressed}) => [
                          styles.removeButton,
                          pressed && styles.removeButtonPressed,
                        ]}>
                        <Text style={styles.removeButtonText}>Hapus</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, styles.addLabel]}>Package aplikasi</Text>
              <View style={styles.addRow}>
                <TextInput
                  accessibilityLabel="Package aplikasi"
                  style={[styles.input, styles.packageInput, appError ? styles.inputError : null]}
                  value={newApp}
                  onChangeText={value => {
                    setNewApp(value);
                    setAppError('');
                  }}
                  placeholder="Contoh: id.dana"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleAddApp}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleAddApp}
                  style={({pressed}) => [
                    styles.addButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}>
                  <Text style={styles.addButtonText}>Tambah</Text>
                </Pressable>
              </View>
              {appError ? <Text style={styles.errorText}>{appError}</Text> : null}
            </Section>
          </ScrollView>
        ) : (
          <HistoryPanel
            configuredUrl={configuredUrl}
            error={historyError}
            history={history}
            loading={historyLoading}
            refreshing={historyRefreshing}
            onOpenSummary={() => setActiveTab('summary')}
            onRefresh={() => loadHistory(true)}
            onRetry={() => loadHistory()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AppHeader() {
  return (
    <View style={styles.header}>
      <View accessibilityElementsHidden style={styles.brandMark}>
        <View style={styles.qrCornerTopLeft} />
        <View style={styles.qrCornerBottomRight} />
        <View style={styles.signalDot} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>QRISGuard Listener</Text>
        <Text style={styles.headerSubtitle}>Pemantau notifikasi pembayaran</Text>
      </View>
    </View>
  );
}

function TabButton({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{selected}}
      onPress={onPress}
      style={({pressed}) => [styles.tab, selected && styles.tabSelected, pressed && styles.tabPressed]}>
      <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function StatusPanel({loading, granted, onOpenSettings}: {loading: boolean; granted: boolean; onOpenSettings: () => void}) {
  const title = loading ? 'Memeriksa listener…' : granted ? 'Listener aktif' : 'Listener perlu diaktifkan';
  const description = loading
    ? 'Status akses notifikasi sedang diperbarui.'
    : granted
      ? 'Notifikasi dari aplikasi yang dipantau siap diteruskan ke server.'
      : 'Berikan akses notifikasi agar pembayaran dapat terdeteksi.';
  return (
    <View style={[styles.statusPanel, !granted && !loading ? styles.statusWarning : null]}>
      <View style={styles.statusHeader}>
        <View style={[styles.statusIcon, !granted && !loading ? styles.statusIconWarning : null]}>
          {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.statusIconText}>{granted ? '✓' : '!'}</Text>}
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.permissionRow}>
        <Text style={styles.permissionLabel}>Internet</Text>
        <Text style={styles.permissionValue}>✓ Tersedia</Text>
      </View>
      <View style={[styles.permissionRow, styles.permissionRowLast]}>
        <Text style={styles.permissionLabel}>Akses notifikasi</Text>
        <Text style={[styles.permissionValue, !granted && !loading ? styles.permissionMissing : null]}>
          {loading ? 'Memeriksa…' : granted ? '✓ Diizinkan' : '! Belum diizinkan'}
        </Text>
      </View>
      {!loading && !granted ? (
        <PrimaryButton label="Buka pengaturan notifikasi" onPress={onOpenSettings} />
      ) : (
        <Pressable accessibilityRole="button" onPress={onOpenSettings} style={({pressed}) => [styles.textButton, pressed && styles.secondaryButtonPressed]}>
          <Text style={styles.textButtonLabel}>Kelola akses notifikasi</Text>
        </Pressable>
      )}
    </View>
  );
}

function Section({eyebrow, title, description, children}: React.PropsWithChildren<{eyebrow: string; title: string; description: string}>) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({label, onPress, busy = false, disabled = false}: {label: string; onPress: () => void; busy?: boolean; disabled?: boolean}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{busy, disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [styles.primaryButton, pressed && styles.primaryButtonPressed, disabled && styles.buttonDisabled]}>
      {busy ? <ActivityIndicator color={colors.surface} size="small" /> : null}
      <Text style={styles.primaryButtonText}>{busy ? 'Menyimpan…' : label}</Text>
    </Pressable>
  );
}

function HistoryPanel({configuredUrl, error, history, loading, refreshing, onOpenSummary, onRefresh, onRetry}: {
  configuredUrl: string;
  error: string;
  history: NotificationHistoryItem[];
  loading: boolean;
  refreshing: boolean;
  onOpenSummary: () => void;
  onRefresh: () => void;
  onRetry: () => void;
}) {
  if (!configuredUrl) {
    return <CenterState icon="↗" title="Hubungkan webhook dahulu" text="Simpan URL webhook pada Ringkasan agar history transaksi dapat dibaca." action="Atur koneksi server" onPress={onOpenSummary} />;
  }
  if (loading && history.length === 0) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centerState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.centerStateTitle}>Memuat riwayat…</Text>
        <Text style={styles.centerStateText}>Mengambil notifikasi pembayaran terbaru dari webhook.</Text>
      </View>
    );
  }
  if (error && history.length === 0) {
    return <CenterState icon="!" error title="Riwayat belum dapat dimuat" text={error} action="Coba lagi" onPress={onRetry} />;
  }
  return (
    <FlatList
      data={history}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={history.length === 0 ? styles.emptyList : styles.historyList}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={history.length > 0 ? (
        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.historyTitle}>Notifikasi terposting</Text>
            <Text style={styles.historyCount}>{history.length} transaksi ditampilkan</Text>
          </View>
          {refreshing ? <ActivityIndicator color={colors.primary} size="small" /> : null}
        </View>
      ) : undefined}
      ListEmptyComponent={<CenterState icon="✓" title="Belum ada transaksi" text="Notifikasi pembayaran yang diterima webhook akan muncul di sini." />}
      ListFooterComponent={error && history.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryLink}>
            <Text style={styles.retryLinkText}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : undefined}
      renderItem={({item}) => <HistoryRow item={item} />}
    />
  );
}

function CenterState({icon, title, text, action, onPress, error = false}: {icon: string; title: string; text: string; action?: string; onPress?: () => void; error?: boolean}) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.centerState}>
      <View style={[styles.emptyIcon, error ? styles.errorIcon : null]}>
        <Text style={error ? styles.errorIconText : styles.emptyIconText}>{icon}</Text>
      </View>
      <Text style={styles.centerStateTitle}>{title}</Text>
      <Text style={styles.centerStateText}>{text}</Text>
      {action && onPress ? <PrimaryButton label={action} onPress={onPress} /> : null}
    </View>
  );
}

function HistoryRow({item}: {item: NotificationHistoryItem}) {
  const provider = item.appName || item.packageName;
  const detail = item.bigText || item.text || item.title || 'Notifikasi pembayaran';
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyRowTop}>
        <View style={styles.providerBadge}><Text style={styles.providerInitial}>{provider.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.historyRowCopy}>
          <Text style={styles.providerName}>{provider}</Text>
          <Text style={styles.historyTime}>{formatHistoryTime(item.postedAt)} WIB</Text>
        </View>
        <Text style={styles.amount}>{formatRupiah(item.amountDetected)}</Text>
      </View>
      {item.title && item.title !== detail ? <Text style={styles.notificationTitle}>{item.title}</Text> : null}
      <Text style={styles.notificationText}>{detail}</Text>
      {item.appName ? <Text style={styles.packageMeta}>{item.packageName}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  container: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md},
  brandMark: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, marginRight: spacing.md, overflow: 'hidden'},
  qrCornerTopLeft: {position: 'absolute', top: 9, left: 9, width: 11, height: 11, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.surface},
  qrCornerBottomRight: {position: 'absolute', right: 9, bottom: 9, width: 11, height: 11, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.surface},
  signalDot: {position: 'absolute', top: 17, left: 17, width: 10, height: 10, borderRadius: 5, backgroundColor: '#A7E4D3'},
  headerCopy: {flex: 1},
  headerTitle: {fontSize: 20, lineHeight: 25, fontWeight: '700', color: colors.ink},
  headerSubtitle: {fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 1},
  tabs: {flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: 4, borderRadius: radii.md, backgroundColor: '#E8EFED'},
  tab: {flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm},
  tabSelected: {backgroundColor: colors.surface},
  tabPressed: {opacity: 0.72},
  tabText: {fontSize: 14, fontWeight: '600', color: colors.muted},
  tabTextSelected: {color: colors.ink},
  summaryContent: {padding: spacing.xl, paddingTop: spacing.sm, paddingBottom: 40},
  statusPanel: {backgroundColor: colors.successSoft, borderWidth: 1, borderColor: '#C4E4DA', borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xxl},
  statusWarning: {backgroundColor: colors.warningSoft, borderColor: '#EBD89D'},
  statusHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg},
  statusIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginRight: spacing.md},
  statusIconWarning: {backgroundColor: '#FFF9EA'},
  statusIconText: {fontSize: 20, fontWeight: '800', color: colors.primary},
  statusCopy: {flex: 1},
  statusTitle: {fontSize: 21, lineHeight: 27, fontWeight: '700', color: colors.ink},
  statusDescription: {fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 4},
  permissionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#C4D7D1'},
  permissionRowLast: {marginBottom: spacing.sm},
  permissionLabel: {fontSize: 14, color: colors.ink},
  permissionValue: {fontSize: 13, fontWeight: '700', color: colors.success},
  permissionMissing: {color: colors.warning},
  section: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg},
  eyebrow: {fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, color: colors.primary},
  sectionTitle: {fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.ink, marginTop: 4},
  sectionDescription: {fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 5, marginBottom: spacing.lg},
  fieldLabel: {fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.ink, marginBottom: 7},
  input: {minHeight: 52, borderWidth: 1, borderColor: '#AEBDB9', borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.ink, backgroundColor: colors.surface},
  inputError: {borderColor: colors.danger},
  fieldHint: {fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 7, marginBottom: spacing.md},
  errorText: {fontSize: 12, lineHeight: 18, color: colors.danger, marginTop: 7, marginBottom: spacing.md},
  primaryButton: {minHeight: 48, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.sm},
  primaryButtonPressed: {backgroundColor: colors.primaryPressed},
  primaryButtonText: {fontSize: 14, fontWeight: '700', color: colors.surface, marginLeft: 6},
  buttonDisabled: {opacity: 0.64},
  textButton: {minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs},
  textButtonLabel: {fontSize: 14, fontWeight: '700', color: colors.primary},
  secondaryButtonPressed: {backgroundColor: '#E5EFEC'},
  inlineEmpty: {backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.md},
  inlineEmptyTitle: {fontSize: 14, fontWeight: '700', color: colors.ink},
  inlineEmptyText: {fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3},
  appList: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
  appRow: {minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  appGlyph: {width: 32, height: 32, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm},
  appGlyphText: {fontSize: 13, fontWeight: '800', color: colors.primary},
  packageName: {flex: 1, fontSize: 13, lineHeight: 19, color: colors.ink, marginRight: spacing.sm},
  removeButton: {minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radii.sm},
  removeButtonPressed: {backgroundColor: colors.dangerSoft},
  removeButtonText: {fontSize: 13, fontWeight: '700', color: colors.danger},
  addLabel: {marginTop: spacing.lg},
  addRow: {flexDirection: 'row', alignItems: 'center'},
  packageInput: {flex: 1, marginRight: spacing.sm},
  addButton: {minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md},
  addButtonText: {fontSize: 14, fontWeight: '700', color: colors.primary},
  centerState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48},
  centerStateTitle: {fontSize: 19, lineHeight: 25, fontWeight: '700', textAlign: 'center', color: colors.ink, marginTop: spacing.lg},
  centerStateText: {fontSize: 14, lineHeight: 21, textAlign: 'center', color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.lg},
  emptyIcon: {width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft},
  emptyIconText: {fontSize: 22, fontWeight: '800', color: colors.primary},
  errorIcon: {backgroundColor: colors.dangerSoft},
  errorIconText: {fontSize: 24, fontWeight: '800', color: colors.danger},
  emptyList: {flexGrow: 1},
  historyList: {padding: spacing.xl, paddingTop: spacing.sm, paddingBottom: 40},
  historyHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md},
  historyTitle: {fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.ink},
  historyCount: {fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 2},
  historyRow: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md},
  historyRowTop: {flexDirection: 'row', alignItems: 'center'},
  providerBadge: {width: 36, height: 36, borderRadius: 12, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm},
  providerInitial: {fontSize: 14, fontWeight: '800', color: colors.primary},
  historyRowCopy: {flex: 1, minWidth: 0},
  providerName: {fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.ink},
  historyTime: {fontSize: 11, lineHeight: 17, color: colors.muted},
  amount: {fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.primary, marginLeft: spacing.sm},
  notificationTitle: {fontSize: 13, lineHeight: 19, fontWeight: '700', color: colors.ink, marginTop: spacing.md},
  notificationText: {fontSize: 13, lineHeight: 20, color: colors.muted, marginTop: spacing.sm},
  packageMeta: {fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: spacing.sm},
  inlineError: {backgroundColor: colors.dangerSoft, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm},
  inlineErrorText: {fontSize: 13, lineHeight: 19, color: colors.danger},
  retryLink: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center'},
  retryLinkText: {fontSize: 13, fontWeight: '700', color: colors.danger},
});
