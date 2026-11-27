const adventProfileKey = 'advent-participant-v1';
const adventInstallationKey = 'advent-attendance-installation-v1';
const profileFields = ['mission', 'district', 'name'];
const entryDialog = document.getElementById('entry-dialog');
let adventProfile;

try {
  const profile = JSON.parse(localStorage.getItem(adventProfileKey));
  if (profile && profileFields.every(field => typeof profile[field] === 'string' && profile[field].trim())) {
    adventProfile = profile;
  }
} catch {}

entryDialog.addEventListener('cancel', event => event.preventDefault());
document.getElementById('entry-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = new FormData(event.currentTarget);
  const profile = Object.fromEntries(profileFields.map(field => [field, String(input.get(field)).trim()]));
  const status = document.getElementById('entry-error');
  if (profileFields.some(field => !profile[field])) {
    status.textContent = '선교부, 교구, 이름을 모두 입력해 주세요.';
    status.hidden = false;
    return;
  }
  try {
    if (!localStorage.getItem(adventInstallationKey)) {
      localStorage.setItem(adventInstallationKey, crypto.randomUUID());
    }
    localStorage.setItem(adventProfileKey, JSON.stringify(profile));
    adventProfile = profile;
    entryDialog.close();
  } catch {
    status.textContent = '브라우저에 입장 정보를 저장할 수 없어요. 브라우저의 저장 설정을 확인해 주세요.';
    status.hidden = false;
  }
});

if (!adventProfile) entryDialog.showModal();

const adventAttendanceConfig = fetch('./config.json', { cache: 'no-store' })
  .then(response => response.json())
  .then(config => config.attendanceUrl)
  .catch(() => '');

async function recordAdventEvent(action, day) {
  const endpoint = await adventAttendanceConfig;
  if (!endpoint) throw new Error('Attendance server is unavailable');
  if (!adventProfile) throw new Error('Participant details are required');
  const key = adventInstallationKey;
  let installationId = localStorage.getItem(key);
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem(key, installationId);
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action, day, installationId, profile: adventProfile })
  });
  if (!response.ok || (await response.json()).status !== 'recorded') {
    throw new Error('Attendance event was not recorded');
  }
}
