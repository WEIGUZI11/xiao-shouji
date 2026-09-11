import React from 'react';
import { ActivityIndicator, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { fromByteArray } from 'base64-js';
import { WEB_HTML } from './web-content';

const EXPO_PROJECT_ID = '924a1d08-13eb-455e-88ee-f6910f7d70ee';
// This URL is the permanent WebView storage origin. Changing it makes Android
// WebView expose a different localStorage/IndexedDB namespace and makes an
// upgrade look as if all user data disappeared.
const SMALL_PHONE_STORAGE_ORIGIN = 'https://small-phone.local/';
const BROKEN_V1161_STORAGE_ORIGIN = 'file:///android_asset/';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MOBILE_PATCH = `
(function () {
  window.__SMALL_PHONE_NATIVE__ = true;
  function applyPatch() {
    var style = document.createElement('style');
    style.textContent = [
      'html,body,#root{margin:0!important;width:100%!important;height:100%!important;min-height:100%!important;overflow:hidden!important;background:#101010!important;}',
      '.phone-stage{width:100vw!important;height:var(--app-vvh,100dvh)!important;min-height:var(--app-vvh,100dvh)!important;padding:0!important;align-items:center!important;justify-content:center!important;background:#101010!important;}',
      '.phone-shell{width:100vw!important;max-width:100vw!important;height:var(--app-vvh,100dvh)!important;max-height:var(--app-vvh,100dvh)!important;border-width:0!important;border-radius:0!important;}',
      '.phone-shell,.phone-shell *{-ms-overflow-style:none!important;scrollbar-width:none!important;}',
      '.phone-shell::-webkit-scrollbar,.phone-shell *::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}',
      '.circle-button,.save-button,.fetch-button,.hand-input,button,input,textarea,select{-webkit-tap-highlight-color:transparent;}'
    ].join('\\n');
    document.head.appendChild(style);
    setTimeout(function () {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('small-phone-ready');
    }, 250);
  }
  if (document.head) applyPatch();
  else document.addEventListener('DOMContentLoaded', applyPatch);
})();
true;
`;

function sanitizeBackupFilename(filename) {
  const safe = String(filename || '').replace(/[^a-zA-Z0-9._-]/g, '-');
  return safe.endsWith('.json') ? safe : 'small-phone-backup.json';
}

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#dceecd',
  });
}

export default function App() {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState('');
  const [nativePushToken, setNativePushToken] = React.useState('');
  const [storageOrigin, setStorageOrigin] = React.useState(SMALL_PHONE_STORAGE_ORIGIN);
  const webViewRef = React.useRef(null);
  const ttsRequestControllersRef = React.useRef(new Map());
  const imageRequestControllersRef = React.useRef(new Map());

  const injectEvent = React.useCallback((name, detail) => {
    const payload = JSON.stringify(detail || {});
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new CustomEvent(${JSON.stringify(name)}, { detail: ${payload} }));
      true;
    `);
  }, []);

  const sendNativePushTokenToWeb = React.useCallback((pushToken) => {
    if (!pushToken) return;
    injectEvent('small-phone-native-push-token', {
      pushToken,
      platform: Platform.OS,
    });
  }, [injectEvent]);

  const sendDiscordCallbackToWeb = React.useCallback((url) => {
    injectEvent('small-phone-discord-callback', String(url || ''));
  }, [injectEvent]);

  const sendNativeTtsResponseToWeb = React.useCallback((id, detail) => {
    if (!id) return;
    injectEvent('small-phone-native-tts-response', {
      id,
      ...detail,
    });
  }, [injectEvent]);

  const sendNativeImageResponseToWeb = React.useCallback((id, detail) => {
    if (!id) return;
    injectEvent('small-phone-native-image-response', { id, ...detail });
  }, [injectEvent]);

  const openExternalUrl = React.useCallback((url) => {
    if (!url || typeof url !== 'string') return;
    Linking.openURL(url).catch((reason) => {
      setError(reason?.message || 'Unable to open external link.');
    });
  }, []);

  const exportBackupToPhone = React.useCallback(async (message) => {
    const filename = sanitizeBackupFilename(message?.filename);
    const content = typeof message?.content === 'string' ? message.content : '';
    if (!content) {
      setError('Backup content is empty.');
      return;
    }
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(content);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setError(`Backup was generated, but sharing is unavailable on this device: ${file.uri}`);
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: message?.mimeType || 'application/json',
      dialogTitle: 'Save Small Phone backup',
      UTI: 'public.json',
    });
  }, []);

  const scheduleLocalReminder = React.useCallback(async (message) => {
    const hour = Math.max(0, Math.min(23, Math.round(Number(message?.hour || 0))));
    const minute = Math.max(0, Math.min(59, Math.round(Number(message?.minute || 0))));
    const identifier = String(message?.id || `small-phone-reminder-${hour}-${minute}`);
    await ensureNotificationChannel();
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: message?.title || 'Small Phone reminder',
        body: message?.body || 'Reminder time.',
        sound: 'default',
        data: message?.data || {},
      },
      trigger: {
        hour,
        minute,
        repeats: true,
        channelId: 'default',
      },
    });
  }, []);

  const fetchTtsFromNative = React.useCallback(async (message) => {
    const id = String(message?.id || '');
    const url = String(message?.url || '');
    const method = String(message?.init?.method || 'POST').toUpperCase();
    if (!id || !/^https?:\/\//i.test(url) || !['GET', 'POST'].includes(method)) {
      sendNativeTtsResponseToWeb(id, { ok: false, status: 400, error: 'Invalid native TTS request.' });
      return;
    }
    const controller = new AbortController();
    ttsRequestControllersRef.current.set(id, controller);
    const timeout = setTimeout(() => controller.abort('timeout'), 45000);
    try {
      const response = await fetch(url, {
        method,
        headers: message?.init?.headers || {},
        body: method === 'POST' && typeof message?.init?.body === 'string' ? message.init.body : undefined,
        signal: controller.signal,
      });
      const headers = {};
      response.headers?.forEach?.((value, key) => {
        headers[key] = value;
      });
      const bodyText = await response.text();
      sendNativeTtsResponseToWeb(id, {
        ok: response.ok,
        status: response.status,
        headers,
        bodyText,
      });
    } catch (reason) {
      const aborted = controller.signal.aborted;
      sendNativeTtsResponseToWeb(id, {
        ok: false,
        status: 0,
        error: aborted
          ? controller.signal.reason === 'timeout' ? 'APK TTS 请求超过 45 秒。' : 'APK TTS 请求已取消。'
          : reason?.message || 'Native TTS request failed.',
      });
    } finally {
      clearTimeout(timeout);
      ttsRequestControllersRef.current.delete(id);
    }
  }, [sendNativeTtsResponseToWeb]);

  const fetchImageFromNative = React.useCallback(async (message) => {
    const id = String(message?.id || '');
    const url = String(message?.url || '');
    const method = String(message?.init?.method || 'GET').toUpperCase();
    const maxBytes = Math.min(32 * 1024 * 1024, Math.max(1, Number(message?.maxBytes || 32 * 1024 * 1024)));
    const timeoutMs = Math.min(150000, Math.max(1000, Number(message?.timeoutMs || 150000)));
    if (!id || !/^https?:\/\//i.test(url) || !['GET', 'POST'].includes(method)) {
      sendNativeImageResponseToWeb(id, { error: 'Invalid native image request.' });
      return;
    }
    const controller = new AbortController();
    imageRequestControllersRef.current.set(id, controller);
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: message?.init?.headers || {},
        body: method === 'POST' && typeof message?.init?.body === 'string' ? message.init.body : undefined,
        signal: controller.signal,
      });
      const declaredLength = Number(response.headers?.get?.('content-length') || 0);
      if (declaredLength > maxBytes) throw new Error(`Image response exceeds ${Math.round(maxBytes / 1024 / 1024)} MiB.`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxBytes) throw new Error(`Image response exceeds ${Math.round(maxBytes / 1024 / 1024)} MiB.`);
      const headers = {};
      response.headers?.forEach?.((value, key) => { headers[key] = value; });
      sendNativeImageResponseToWeb(id, {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || '',
        headers,
        bodyBase64: fromByteArray(new Uint8Array(buffer)),
      });
    } catch (reason) {
      const aborted = controller.signal.aborted;
      sendNativeImageResponseToWeb(id, {
        error: aborted
          ? controller.signal.reason === 'timeout' ? 'APK 生图请求超过 150 秒。' : 'APK 生图请求已取消。'
          : reason?.message || 'Native image request failed.',
      });
    } finally {
      clearTimeout(timeout);
      imageRequestControllersRef.current.delete(id);
    }
  }, [sendNativeImageResponseToWeb]);

  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url?.startsWith('smallphone://discord-callback')) {
        sendDiscordCallbackToWeb(event.url);
      }
    });
    Linking.getInitialURL().then((url) => {
      if (url?.startsWith('smallphone://discord-callback')) {
        sendDiscordCallbackToWeb(url);
      }
    });
    return () => subscription.remove();
  }, [sendDiscordCallbackToWeb]);

  React.useEffect(() => {
    let mounted = true;
    async function registerForPushNotifications() {
      if (!Device.isDevice) return;
      await ensureNotificationChannel();
      const permission = await Notifications.getPermissionsAsync();
      let status = permission.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') return;
      const token = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
      if (mounted) setNativePushToken(token.data);
    }
    registerForPushNotifications().catch((reason) => {
      console.warn('small-phone push registration failed', reason?.message || reason);
    });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      injectEvent('small-phone-native-notification-response', response?.notification?.request?.content?.data || {});
    });
    return () => subscription.remove();
  }, [injectEvent]);

  React.useEffect(() => {
    if (loaded && nativePushToken) {
      sendNativePushTokenToWeb(nativePushToken);
    }
  }, [loaded, nativePushToken, sendNativePushTokenToWeb]);

  const handleShouldStartLoad = React.useCallback((request) => {
    const url = request?.url || '';
    if (url.startsWith('smallphone://discord-callback')) {
      sendDiscordCallbackToWeb(url);
      return false;
    }
    if (/^https:\/\/(discord\.gg|discord\.com)\//i.test(url)) {
      openExternalUrl(url);
      return false;
    }
    return true;
  }, [openExternalUrl, sendDiscordCallbackToWeb]);

  const handleMessage = React.useCallback((event) => {
    setLoaded(true);
    const data = event?.nativeEvent?.data;
    if (!data || data === 'small-phone-ready') {
      sendNativePushTokenToWeb(nativePushToken);
      return;
    }
    try {
      const message = JSON.parse(data);
      if (message?.type === 'open-url' && typeof message.url === 'string') {
        openExternalUrl(message.url);
        return;
      }
      if (message?.type === 'small-phone-backup-export') {
        exportBackupToPhone(message).catch((reason) => {
          setError(reason?.message || 'Backup save failed.');
        });
        return;
      }
      if (message?.type === 'small-phone-switch-storage-origin') {
        const nextOrigin = message.mode === 'broken-v1161'
          ? BROKEN_V1161_STORAGE_ORIGIN
          : SMALL_PHONE_STORAGE_ORIGIN;
        setLoaded(false);
        setError('');
        setStorageOrigin(nextOrigin);
        return;
      }
      if (message?.type === 'small-phone-tts-fetch') {
        fetchTtsFromNative(message);
        return;
      }
      if (message?.type === 'small-phone-tts-cancel') {
        ttsRequestControllersRef.current.get(String(message.id || ''))?.abort('cancelled');
        return;
      }
      if (message?.type === 'small-phone-image-fetch') {
        fetchImageFromNative(message);
        return;
      }
      if (message?.type === 'small-phone-image-cancel') {
        imageRequestControllersRef.current.get(String(message.id || ''))?.abort('cancelled');
        return;
      }
      if (message?.type === 'small-phone-schedule-local-reminder') {
        scheduleLocalReminder(message).catch((reason) => {
          console.warn('small-phone local reminder schedule failed', reason?.message || reason);
        });
      }
    } catch {
      // Ignore non-JSON messages from the WebView.
    }
  }, [exportBackupToPhone, fetchImageFromNative, fetchTtsFromNative, nativePushToken, openExternalUrl, scheduleLocalReminder, sendNativePushTokenToWeb]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor="#fffaf0" />
      <SafeAreaView style={styles.safe}>
        <WebView
          key={storageOrigin}
          ref={webViewRef}
          source={{ html: WEB_HTML, baseUrl: storageOrigin }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          thirdPartyCookiesEnabled
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          bounces={false}
          injectedJavaScriptBeforeContentLoaded={`window.__SMALL_PHONE_BROKEN_ORIGIN_MODE__ = ${storageOrigin === BROKEN_V1161_STORAGE_ORIGIN ? 'true' : 'false'};\n${MOBILE_PATCH}`}
          injectedJavaScript={`window.__SMALL_PHONE_BROKEN_ORIGIN_MODE__ = ${storageOrigin === BROKEN_V1161_STORAGE_ORIGIN ? 'true' : 'false'};\n${MOBILE_PATCH}`}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadEnd={() => setLoaded(true)}
          onMessage={handleMessage}
          onError={(event) => {
            setLoaded(true);
            setError(event.nativeEvent.description || 'WebView failed to load.');
          }}
        />
        {!loaded && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#dceecd" size="large" />
            <Text style={styles.overlayText}>Opening Small Phone...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.overlay}>
            <Text style={styles.errorTitle}>Small Phone failed to load</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  safe: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101010',
    padding: 24,
  },
  overlayText: {
    marginTop: 14,
    color: '#dceecd',
    fontSize: 16,
    fontWeight: '700',
  },
  errorTitle: {
    color: '#ffd6d6',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
