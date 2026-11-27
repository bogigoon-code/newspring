const attendanceButton = document.getElementById('attendance-toggle');
const attendanceNote = document.getElementById('attendance-note');
const attendanceResult = document.getElementById('attendance-result');
const installationKey = 'advent-attendance-installation-v1';
const dateKey = 'advent-attendance-date-v1';
let installationId;
let recordedDate;
let attendanceBusy = false;

try {
  installationId = localStorage.getItem(installationKey);
  recordedDate = localStorage.getItem(dateKey);
} catch {}

function setAttendanceStatus(text) {
  attendanceResult.textContent = text;
  attendanceResult.hidden = !text;
}

function refreshAttendance() {
  attendanceButton.textContent = installationId ? '출석 기록 끄기' : '출석 기록 켜기';
}

async function checkIn() {
  if (!installationId || attendanceBusy || recordedDate === today() || document.hidden) return;
  attendanceBusy = true;
  const activeId = installationId;
  try {
    const config = await fetch('./config.json', { cache: 'no-store' }).then(response => response.json());
    if (!config.attendanceUrl) return;
    if (activeId !== installationId) return;
    const response = await fetch(config.attendanceUrl, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'check-in', installationId: activeId })
    });
    if (!response.ok) throw new Error('Attendance request failed');
    const result = await response.json();
    if (activeId !== installationId) return;
    if (result.status === 'closed') {
      setAttendanceStatus('출석 기록 기간은 11월 29일부터 12월 24일까지예요.');
      return;
    }
    if (result.status !== 'recorded') throw new Error('Attendance was not recorded');
    recordedDate = result.date;
    localStorage.setItem(dateKey, recordedDate);
    setAttendanceStatus('오늘 출석이 기록됐어요.');
  } catch {
    if (activeId === installationId) setAttendanceStatus('출석을 기록하지 못했어요. 앱을 다시 열면 재시도해요.');
  } finally {
    attendanceBusy = false;
  }
}

refreshAttendance();
attendanceButton.addEventListener('click', () => {
  try {
    if (installationId) {
      localStorage.removeItem(installationKey);
      localStorage.removeItem(dateKey);
      installationId = null;
      recordedDate = null;
      setAttendanceStatus('앞으로 이 브라우저의 출석을 기록하지 않아요.');
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem(installationKey, newId);
      installationId = newId;
      setAttendanceStatus('');
      checkIn();
    }
    refreshAttendance();
  } catch {
    setAttendanceStatus('이 브라우저에서 출석 설정을 저장하지 못했어요.');
  }
});
fetch('./config.json', { cache: 'no-store' }).then(response => response.json()).then(config => {
  if (!config.attendanceUrl) return;
  attendanceNote.hidden = false;
  attendanceButton.hidden = false;
  if (installationId && recordedDate === today()) setAttendanceStatus('오늘 출석이 기록됐어요.');
  checkIn();
}).catch(() => {});
window.addEventListener('focus', checkIn);
window.addEventListener('online', checkIn);
document.addEventListener('visibilitychange', checkIn);
