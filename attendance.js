const adventAttendanceConfig = fetch('./config.json', { cache: 'no-store' })
  .then(response => response.json())
  .then(config => config.attendanceUrl)
  .catch(() => '');

async function recordAdventEvent(action, day) {
  const endpoint = await adventAttendanceConfig;
  if (!endpoint) throw new Error('Attendance server is unavailable');
  const key = 'advent-attendance-installation-v1';
  let installationId = localStorage.getItem(key);
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem(key, installationId);
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action, day, installationId })
  });
  if (!response.ok || (await response.json()).status !== 'recorded') {
    throw new Error('Attendance event was not recorded');
  }
}
