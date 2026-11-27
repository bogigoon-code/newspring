const byId = id => document.getElementById(id);
const formatKoreanDate = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'long', day: 'numeric'
});
const formatDateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
});
const days = Array.from({ length: 26 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 10, 29 + index));
  return {
    number: index + 1,
    dayOfMonth: date.getUTCDate(),
    label: formatKoreanDate.format(date),
    key: date.toISOString().slice(0, 10),
    cardCount: 6,
    hasScriptureTab: index !== 25
  };
});
const storageKey = 'advent-2026-read';
let seen = new Set();
try {
  seen = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
} catch {}
let requestId = 0;
let pendingCard;
let selected;
let page = 1;
let pageAnimation;
const calendar = byId('calendar');
const reader = byId('reader');
const card = byId('card');
const message = byId('message');
const today = () => formatDateKey.format(new Date());

function refresh() {
  const date = today();
  days.forEach((day, index) => {
    const door = calendar.children[index];
    door.dataset.state = day.key === date ? 'ready'
      : seen.has(day.number) ? 'seen'
      : index === 0 && date < day.key ? 'start' : '';
    const status = day.key > date ? '잠김'
      : !day.cardCount ? '카드 준비 중' : seen.has(day.number) ? '읽음' : '열기';
    door.setAttribute('aria-label', `${day.number}일차 · ${day.label} · ${status}`);
    door.lastElementChild.textContent = door.dataset.state === 'start' ? '시작'
      : door.dataset.state === 'ready' ? '오늘'
      : seen.has(day.number) ? '✓' : '';
  });
  byId('hint').textContent = '한국 시간 자정에 하루씩 열려요.';
}

const apiConfig = fetch('./config.json', { cache: 'no-store' })
  .then(response => response.json())
  .then(config => config.appsScriptUrl)
  .catch(() => '');

async function showPage(direction = 0) {
  pageAnimation?.cancel();
  pendingCard?.abort();
  const controller = new AbortController();
  pendingCard = controller;
  const currentRequest = ++requestId;
  const day = selected;
  const cardPage = page;
  const firstReflection = day.hasScriptureTab ? 2 : 1;
  const reflectionNumber = cardPage - firstReflection + 1;
  const scripture = cardPage < firstReflection;

  card.hidden = true;
  message.hidden = false;
  message.textContent = '묵상 카드를 불러오는 중이에요…';
  byId('retry').hidden = true;
  byId('scripture').setAttribute('aria-pressed', String(scripture));
  byId('reflection').setAttribute('aria-pressed', String(!scripture));
  byId('controls').hidden = scripture;
  byId('page').textContent = `${reflectionNumber} / ${day.cardCount - firstReflection + 1}`;
  byId('previous').disabled = cardPage <= firstReflection;
  byId('next').disabled = cardPage === day.cardCount;

  try {
    const endpoint = await apiConfig;
    if (!endpoint) throw new Error('unconfigured');
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ action: 'card', day: day.number, page: cardPage });
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('response');
    const result = await response.json();
    if (result.error === 'locked') throw new Error('locked');
    if (!result.ok || !result.image?.startsWith('data:image/png;base64,')) throw new Error('card');
    if (currentRequest !== requestId) return;
    card.alt = scripture ? `${day.number}일차 오늘의 말씀` : `${day.number}일차 묵상 카드 ${reflectionNumber}번째 장`;
    card.src = result.image;
    await card.decode();
    if (currentRequest !== requestId) return;
    card.hidden = false;
    message.hidden = true;
    if (direction && typeof card.animate === 'function' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transformOrigin = direction > 0 ? 'left center' : 'right center';
      pageAnimation = card.animate([
        { transform: `perspective(1000px) rotateY(${direction * 58}deg)`, transformOrigin, opacity: 0.5 },
        { transform: 'none', transformOrigin, opacity: 1 }
      ], { duration: 380, easing: 'ease-out' });
    }
    seen.add(day.number);
    try { localStorage.setItem(storageKey, JSON.stringify([...seen])); } catch {}
    refresh();
  } catch (error) {
    if (currentRequest !== requestId || controller.signal.aborted) return;
    message.textContent = error.message === 'locked' ? `${day.label}에 이 문이 열려요.`
      : error.message === 'unconfigured' ? '카드 서버 연결을 준비 중이에요.'
      : '묵상 카드를 불러오지 못했어요.';
    byId('retry').hidden = ['locked', 'unconfigured'].includes(error.message);
  }
}
function openDoor(day) {
  requestId += 1;
  pendingCard?.abort();
  byId('retry').hidden = true;
  pageAnimation?.cancel();
  selected = day;
  page = 1;
  const locked = day.key > today();
  byId('reader-title').textContent = `${day.number}일차 · ${day.label}`;
  card.hidden = true;
  message.hidden = false;
  byId('controls').hidden = true;
  byId('reading-options').hidden = locked || !day.hasScriptureTab;
  if (locked) {
    message.textContent = `${day.label}에 이 문이 열려요.`;
  } else if (!day.cardCount) {
    message.textContent = '이날의 묵상 카드는 준비 중이에요.';
  } else {
    showPage();
  }
  reader.showModal();
}

const tileWidths = [
  4, 5, 3,  7, 5,  3, 4, 5,  5, 7,  4, 3, 5,
  7, 5,  3, 5, 4,  5, 7,  4, 5, 3,  3, 3, 6
];
const tileMotifs = [
  'candle', 'star', 'light', 'magi', 'stable', 'lantern', 'hills',
  'manger', 'scroll', 'sheep', 'angel', 'bethlehem', 'gold', 'frankincense',
  'myrrh', 'staff', 'road', 'olive', 'well', 'comet', 'doorway',
  'dawn', 'swaddle', 'watch', 'radiance', 'nativity'
];
const motifSymbols = { star: '✦', comet: '✦', radiance: '✧' };
for (const [index, day] of days.entries()) {
  const door = document.createElement('button');
  door.type = 'button';
  door.className = 'door';
  door.style.setProperty('--span', tileWidths[index]);
  const number = document.createElement('strong');
  number.textContent = day.dayOfMonth;
  const motif = document.createElement('span');
  motif.className = `motif ${tileMotifs[index]}`;
  motif.textContent = motifSymbols[tileMotifs[index]] ?? '';
  motif.setAttribute('aria-hidden', 'true');
  if (tileMotifs[index] === 'magi' || tileMotifs[index] === 'sheep') {
    for (let figure = 0; figure < 3; figure += 1) {
      motif.append(document.createElement('i'));
    }
  }
  door.append(number, motif, document.createElement('small'));
  door.addEventListener('click', () => openDoor(day));
  calendar.append(door);
}
byId('retry').addEventListener('click', () => showPage());
reader.addEventListener('close', () => {
  requestId += 1;
  pendingCard?.abort();
});
byId('close').addEventListener('click', () => reader.close());
byId('scripture').addEventListener('click', () => { if (page !== 1) { page = 1; showPage(-1); } });
byId('reflection').addEventListener('click', () => {
  if (page === 1) { page = 2; showPage(1); }
});
byId('previous').addEventListener('click', () => { page -= 1; showPage(-1); });
byId('next').addEventListener('click', () => { page += 1; showPage(1); });
refresh();
window.addEventListener('focus', refresh);
setInterval(refresh, 60_000);


if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
