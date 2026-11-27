document.getElementById('push-guide-open').addEventListener('click', () => {
  document.getElementById('push-guide').showModal();
});

const pushToggle = document.getElementById('push-toggle');
const pushStatus = document.getElementById('push-status');
const iosDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function pushNotice(message) {
  pushStatus.textContent = message;
  pushStatus.hidden = !message;
}

if (iosDevice && !standalone) {
  pushNotice('아이폰·아이패드는 홈 화면에 추가한 뒤 앱에서 알림을 켤 수 있어요.');
} else if (isSecureContext && 'Notification' in window && 'serviceWorker' in navigator) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async OneSignal => {
    try {
      await OneSignal.init({
        appId: '459cac59-e211-4d39-9980-34155182dcd6',
        serviceWorkerPath: '/newspring/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/newspring/push/' },
        autoResubscribe: false
      });
      if (!OneSignal.Notifications.isPushSupported()) return;

      const subscription = OneSignal.User.PushSubscription;
      function refreshPush() {
        const enabled = subscription.optedIn;
        pushToggle.textContent = enabled ? '묵상 알림 끄기' : '묵상 알림 받기';
        if (Notification.permission === 'denied') {
          pushNotice('알림이 차단되어 있어요. 브라우저나 기기 설정에서 허용해 주세요.');
        } else {
          pushNotice(enabled ? '묵상 알림을 받고 있어요.' : '');
        }
      }

      subscription.addEventListener('change', refreshPush);
      OneSignal.Notifications.addEventListener('permissionChange', refreshPush);
      pushToggle.hidden = false;
      refreshPush();
      pushToggle.addEventListener('click', async () => {
        pushToggle.disabled = true;
        try {
          if (subscription.optedIn) await subscription.optOut();
          else await subscription.optIn();
          refreshPush();
        } catch {
          pushNotice('알림 설정을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
          pushToggle.disabled = false;
        }
      });
    } catch {
      pushNotice('알림을 준비하지 못했어요. 잠시 후 다시 열어 주세요.');
    }
  });
}
