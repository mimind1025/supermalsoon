/* ==========================================================
   Supabase 설정 (방명록 저장용) - 프로젝트 정보 생기면 여기만 수정하세요
   ========================================================== */
const SUPABASE_URL = "여기에_URL";
const SUPABASE_KEY = "여기에_KEY";
/* ========================================================== */

// 슈퍼말순TV 유튜브 주소 - 나중에 실제 주소로 교체하세요
const YOUTUBE_URL = "https://www.youtube.com/channel/UCddVgimMuJfeFWUNvMUGldw";
// 말순이 카카오채널 주소 - 나중에 실제 주소로 교체하세요
const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_여기에_채널ID"; // TODO: 실제 카카오채널 주소로 교체

/* ==========================================================
   관리자 모드 (테스트용)
   테스트용 관리자 기능이며 실제 공개 전 서버 인증 방식으로 교체 필요
   - 지금은 비밀번호를 코드에 그대로 두고 브라우저에서만 확인하는
     "로컬 테스트용" 방식입니다. 실제 서비스 오픈 전에는 반드시
     서버(Supabase Auth 등) 기반 로그인으로 교체해야 합니다.
   ========================================================== */
const ADMIN_PASSWORD = "1234"; // 테스트용 비밀번호 (실서비스 전 필수 교체)

/* ==========================================================
   저장소 함수 (지금은 localStorage, 추후 Supabase로 교체 예정)
   Supabase를 연결하게 되면 아래 함수들의 "내부 구현"만
   Supabase Storage / Database 호출로 바꾸면 됩니다.
   호출하는 쪽(관리자 UI 로직)은 그대로 두어도 됩니다.
   ========================================================== */
const SITE_SETTINGS_KEY = "malsoon_site_settings";
const CONTENTS_OVERRIDE_KEY = "malsoon_contents_override";

const DEFAULT_SITE_SETTINGS = {
  heroImage: "images/malsoon-main.png",
  heroTitle: "말순이네\n놀러오셨네여",
  heroDesc: "언니오빠들 쓰라고 이것저것\n챙겨놨어여 ♡",
};

function loadSiteSettings() {
  // TODO: Supabase 연결 시 Database(예: settings 테이블) 조회로 교체
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SITE_SETTINGS };
    return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

function saveSiteSettings(settings) {
  // TEMP: 현재는 브라우저 localStorage 저장
  // TODO: Supabase 연결 후 실제 온라인 관리자 저장으로 교체
  localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(settings));
}

function loadContentsOverride() {
  // TODO: Supabase 연결 시 contents 테이블 조회로 교체
  try {
    const raw = localStorage.getItem(CONTENTS_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function saveContentsOverride(list) {
  // TEMP: 현재는 브라우저 localStorage 저장
  // TODO: Supabase 연결 후 실제 온라인 관리자 저장으로 교체
  localStorage.setItem(CONTENTS_OVERRIDE_KEY, JSON.stringify(list));
}

/* ==========================================================
   콘텐츠 데이터
   나중에 관리자 업로드 기능이 생기면, 이 배열을 관리자 페이지에서
   등록한 데이터(또는 DB에서 불러온 데이터)로 교체하면 됩니다.
   콘텐츠 종류(type)는 "이모티콘" / "움짤" / "영상" / "배경화면" 등을 사용할 예정입니다.
   ========================================================== */
const contents = [
  {
    id: "content-1",
    thumbnail: "images/emoji-set-01.png",
    title: "말순이 일상 움짤 20종",
    description: "카톡·DM·댓글에 쓰기 좋은 말순이 일상 리액션 모음이에여 ♡",
    type: "GIF",
    category: "gif", // "holiday" / "gif" / "video"
    isNew: true,
    previewFile: "", // 비어있으면 thumbnail로 미리보기
    downloadFile: "downloads/malsoon-emoji-vol1.zip",
  },
];

// 이전에 관리자 모드에서 저장해 둔 콘텐츠가 있으면 기본값 대신 그것을 사용합니다.
const savedContentsOverride = loadContentsOverride();
if (savedContentsOverride && savedContentsOverride.length) {
  contents.length = 0;
  contents.push(...savedContentsOverride);
}

/* ---------------- 콘텐츠 관리 함수 (관리자 UI는 추후 연결 예정) ----------------
   지금 단계에서는 화면에 추가/수정/삭제 버튼을 만들지 않지만,
   나중에 관리자 화면(대표 이미지 변경 / 제목·설명 수정 / GIF·MP4·ZIP 업로드 / 삭제)을
   붙일 때 아래 함수들을 그대로 이벤트 핸들러에 연결하면 됩니다.
------------------------------------------------------------------------- */
function addContent(item) {
  contents.push({ id: `content-${Date.now()}`, ...item });
  saveContentsOverride(contents);
  applyFilter(currentFilter);
}

function updateContent(id, updates) {
  const target = contents.find((item) => item.id === id);
  if (!target) return;
  Object.assign(target, updates);
  saveContentsOverride(contents);
  applyFilter(currentFilter);
}

function deleteContent(id) {
  const index = contents.findIndex((item) => item.id === id);
  if (index === -1) return;
  contents.splice(index, 1);
  saveContentsOverride(contents);
  applyFilter(currentFilter);
}

const CATEGORY_LABELS = {
  holiday: "명절 이모티콘",
  gif: "움짤",
  video: "영상",
};

/* ---------------- 콘텐츠 카드 렌더링 ---------------- */
const contentList = document.getElementById("contentList");
let currentFilter = "all";

function renderContentCard(item, index) {
  const card = document.createElement("div");
  card.className = "emoji-set-card";

  if (item.isNew) {
    const newBadge = document.createElement("span");
    newBadge.className = "new-badge";
    newBadge.textContent = "NEW";
    card.appendChild(newBadge);
  }

  const imageBox = document.createElement("div");
  imageBox.className = "emoji-set-image";
  imageBox.innerHTML = `<span class="placeholder-text small">🖼️</span>`;

  const img = document.createElement("img");
  img.src = item.thumbnail;
  img.alt = `${item.title} 대표 이미지`;
  img.onerror = () => img.remove();
  imageBox.appendChild(img);

  const body = document.createElement("div");
  body.className = "emoji-set-body";
  body.innerHTML = `
    <p class="emoji-set-category"></p>
    <h3 class="emoji-set-title"></h3>
    <p class="emoji-set-desc"></p>
    <p class="emoji-set-info"></p>
    <div class="emoji-set-buttons">
      <button type="button" class="btn btn-secondary preview-btn">미리보기</button>
      <button type="button" class="btn btn-primary download-set-btn">무료 다운로드</button>
    </div>
  `;
  body.querySelector(".emoji-set-category").textContent =
    CATEGORY_LABELS[item.category] || "말순이 콘텐츠";
  body.querySelector(".emoji-set-title").textContent = item.title;
  body.querySelector(".emoji-set-desc").textContent = item.description;
  body.querySelector(".emoji-set-info").textContent = `${item.type} · 무료 다운로드`;

  body.querySelector(".preview-btn").addEventListener("click", () => {
    openPreview(item);
  });
  body.querySelector(".download-set-btn").addEventListener("click", () => {
    openModal(item.downloadFile);
  });

  card.appendChild(imageBox);
  card.appendChild(body);
  return card;
}

function renderContentList() {
  contentList.innerHTML = "";

  const filtered =
    currentFilter === "all"
      ? contents
      : contents.filter((item) => item.category === currentFilter);

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "guestbook-empty";
    empty.textContent = "곧 이 카테고리 콘텐츠도 채워질 예정이에여 ♡";
    contentList.appendChild(empty);
    return;
  }

  filtered.forEach((item, index) => {
    contentList.appendChild(renderContentCard(item, index));
  });
}

renderContentList();

/* ---------------- 카테고리 필터 ---------------- */
const filterTabs = document.querySelectorAll(".filter-tab");

function applyFilter(filterValue) {
  currentFilter = filterValue || "all";
  filterTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === currentFilter);
  });
  renderContentList();
}

filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => applyFilter(tab.dataset.filter));
});

document.querySelectorAll(".category-card").forEach((card) => {
  card.addEventListener("click", () => {
    applyFilter(card.dataset.filter);
    document.getElementById("contentSection").scrollIntoView({ behavior: "smooth" });
  });
});

/* ---------------- 헤더 메뉴 / 히어로 버튼 스크롤 ---------------- */
document.querySelectorAll("[data-scroll]").forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetId = link.getAttribute("href");
    const target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();
    if (link.dataset.filter) {
      applyFilter(link.dataset.filter);
    }
    target.scrollIntoView({ behavior: "smooth" });
  });
});

document.getElementById("heroCta").addEventListener("click", () => {
  applyFilter("all");
  document.getElementById("contentSection").scrollIntoView({ behavior: "smooth" });
});

/* ---------------- 콘텐츠 미리보기 팝업 ---------------- */
const previewModal = document.getElementById("previewModal");
const previewMedia = document.getElementById("previewMedia");
const previewTitle = document.getElementById("previewTitle");
const closePreviewBtn = document.getElementById("closePreviewBtn");

// previewFile 확장자에 따라 이미지/GIF/영상을 알아서 보여줍니다.
// 지금은 이미지(썸네일)만 실제로 쓰이지만, 나중에 GIF·MP4 파일을 그대로 연결할 수 있습니다.
function buildPreviewElement(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();

  if (ext === "mp4") {
    const video = document.createElement("video");
    video.src = filePath;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    return video;
  }

  // gif, png, jpg 등 이미지 계열
  const img = document.createElement("img");
  img.src = filePath;
  return img;
}

function openPreview(item) {
  const filePath = item.previewFile || item.thumbnail;

  previewMedia.innerHTML = "";
  previewTitle.textContent = item.title;

  if (!filePath) {
    previewMedia.innerHTML = `<span class="placeholder-text small">🖼️</span>`;
    previewModal.classList.add("active");
    return;
  }

  const el = buildPreviewElement(filePath);
  el.onerror = () => {
    previewMedia.innerHTML = `<span class="placeholder-text small">🖼️</span>`;
  };
  previewMedia.appendChild(el);
  previewModal.classList.add("active");
}

function closePreview() {
  previewModal.classList.remove("active");
  previewMedia.innerHTML = "";
}

closePreviewBtn.addEventListener("click", closePreview);
previewModal.addEventListener("click", (e) => {
  if (e.target === previewModal) closePreview();
});

/* ---------------- 다운로드 전 구독 팝업 ---------------- */
const subscribeModal = document.getElementById("subscribeModal");
const goSubscribeBtn = document.getElementById("goSubscribeBtn");
const goKakaoChannelBtn = document.getElementById("goKakaoChannelBtn");
const confirmDownloadBtn = document.getElementById("confirmDownloadBtn");

// 팝업을 연 콘텐츠의 다운로드 파일 경로를 기억해뒀다가 확정 시 사용
let pendingDownloadFile = "";

function openModal(downloadFile) {
  pendingDownloadFile = downloadFile;
  subscribeModal.classList.add("active");
}

function closeModal() {
  subscribeModal.classList.remove("active");
}

function startDownload(filePath) {
  if (!filePath) return;
  const link = document.createElement("a");
  link.href = filePath;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

goSubscribeBtn.addEventListener("click", () => {
  window.open(YOUTUBE_URL, "_blank");
});

goKakaoChannelBtn.addEventListener("click", () => {
  window.open(KAKAO_CHANNEL_URL, "_blank");
});

confirmDownloadBtn.addEventListener("click", () => {
  closeModal();
  startDownload(pendingDownloadFile);
});

// 팝업 바깥 영역 클릭하면 닫기
subscribeModal.addEventListener("click", (e) => {
  if (e.target === subscribeModal) {
    closeModal();
  }
});

/* ---------------- 방명록 ---------------- */
const guestbookNotice = document.getElementById("guestbookNotice");
const guestbookForm = document.getElementById("guestbookForm");
const guestbookList = document.getElementById("guestbookList");
const nicknameInput = document.getElementById("nickname");
const messageInput = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

const MAX_NICKNAME_LEN = 20;
const MAX_MESSAGE_LEN = 150;
const POST_COOLDOWN_MS = 10000; // 같은 브라우저에서 연속 등록 방지 (10초)
const LAST_POST_KEY = "malsoon_guestbook_last_post";

let supabaseClient = null;
const isSupabaseConfigured =
  SUPABASE_URL !== "여기에_URL" &&
  SUPABASE_KEY !== "여기에_KEY" &&
  SUPABASE_URL.startsWith("http");

if (isSupabaseConfigured && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// HTML 태그 입력 방지 (< > 제거)
function stripTags(text) {
  return text.replace(/[<>]/g, "");
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderGuestbookItem(entry) {
  const li = document.createElement("li");
  li.className = "guestbook-item";

  const nicknameEl = document.createElement("div");
  nicknameEl.className = "guestbook-nickname";
  nicknameEl.textContent = entry.nickname;

  const messageEl = document.createElement("div");
  messageEl.className = "guestbook-message";
  messageEl.textContent = entry.message;

  const timeEl = document.createElement("div");
  timeEl.className = "guestbook-time";
  timeEl.textContent = entry.created_at ? formatTime(entry.created_at) : "";

  li.appendChild(nicknameEl);
  li.appendChild(messageEl);
  li.appendChild(timeEl);
  return li;
}

function renderGuestbookList(entries) {
  guestbookList.innerHTML = "";
  if (!entries || entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "guestbook-empty";
    empty.textContent = "아직 방명록이 없어여. 첫 손님이 되어주세여!";
    guestbookList.appendChild(empty);
    return;
  }
  entries.forEach((entry) => {
    guestbookList.appendChild(renderGuestbookItem(entry));
  });
}

async function loadGuestbook() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("guestbook")
    .select("id, nickname, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("방명록을 불러오지 못했습니다.", error);
    return;
  }
  renderGuestbookList(data);
}

function canPostNow() {
  const last = localStorage.getItem(LAST_POST_KEY);
  if (!last) return true;
  return Date.now() - Number(last) > POST_COOLDOWN_MS;
}

function markPosted() {
  localStorage.setItem(LAST_POST_KEY, String(Date.now()));
}

async function handleGuestbookSubmit(e) {
  e.preventDefault();

  if (!supabaseClient) return;

  const nickname = stripTags(nicknameInput.value.trim()).slice(0, MAX_NICKNAME_LEN);
  const message = stripTags(messageInput.value.trim()).slice(0, MAX_MESSAGE_LEN);

  if (!nickname || !message) {
    alert("닉네임과 한마디를 모두 입력해주세여!");
    return;
  }

  if (!canPostNow()) {
    alert("너무 빨리 남기고 있어여! 잠시 후 다시 시도해주세여 :)");
    return;
  }

  // 연속 클릭 방지
  submitBtn.disabled = true;

  const { error } = await supabaseClient
    .from("guestbook")
    .insert([{ nickname, message }]);

  submitBtn.disabled = false;

  if (error) {
    console.error("방명록 등록 실패", error);
    alert("등록에 실패했어여. 잠시 후 다시 시도해주세여.");
    return;
  }

  markPosted();
  guestbookForm.reset();
  loadGuestbook();
}

function initGuestbook() {
  if (!isSupabaseConfigured || !window.supabase) {
    guestbookNotice.hidden = false;
    guestbookNotice.textContent =
      "방명록은 아직 준비중이에여. 조금만 기다려주세여 ♡";
    guestbookForm.querySelectorAll("input, textarea, button").forEach((el) => {
      el.disabled = true;
    });
    return;
  }

  guestbookForm.addEventListener("submit", handleGuestbookSubmit);
  loadGuestbook();
}

initGuestbook();

/* ---------------- HERO 텍스트/이미지 렌더링 ---------------- */
const heroTitleEl = document.querySelector(".hero-title");
const heroSubEl = document.querySelector(".hero-sub");
const heroImageEl = document.querySelector(".hero-image img");

let siteSettings = loadSiteSettings();

// "\n"으로 줄바꿈된 텍스트를 <br>과 함께 안전하게(innerHTML 없이) 렌더링합니다.
function renderMultiline(el, text) {
  el.innerHTML = "";
  const lines = String(text).split("\n");
  lines.forEach((line, i) => {
    el.appendChild(document.createTextNode(line));
    if (i < lines.length - 1) el.appendChild(document.createElement("br"));
  });
}

function setHeroImage(src) {
  if (!src) {
    heroImageEl.style.display = "none";
    return;
  }
  heroImageEl.onerror = () => {
    heroImageEl.style.display = "none";
  };
  heroImageEl.src = src;
  heroImageEl.style.display = "";
}

function renderHero() {
  renderMultiline(heroTitleEl, siteSettings.heroTitle);
  renderMultiline(heroSubEl, siteSettings.heroDesc);
  setHeroImage(siteSettings.heroImage);
}

renderHero();

/* ==========================================================
   관리자 모드 (테스트용)
   // 테스트용 관리자 기능이며 실제 공개 전 서버 인증 방식으로 교체 필요
   ========================================================== */
const adminModeBadge = document.getElementById("adminModeBadge");
const adminGearBtn = document.getElementById("adminGearBtn");
const adminLoginModal = document.getElementById("adminLoginModal");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminLoginError = document.getElementById("adminLoginError");
const adminLoginConfirmBtn = document.getElementById("adminLoginConfirmBtn");
const adminLoginCancelBtn = document.getElementById("adminLoginCancelBtn");

const heroAdminPanel = document.getElementById("heroAdminPanel");
const changeHeroImageBtn = document.getElementById("changeHeroImageBtn");
const heroImageInput = document.getElementById("heroImageInput");
const heroTitleInput = document.getElementById("heroTitleInput");
const heroDescInput = document.getElementById("heroDescInput");
const heroSaveBtn = document.getElementById("heroSaveBtn");
const heroCancelBtn = document.getElementById("heroCancelBtn");

let isAdminMode = false;
let draftHeroImage = null; // 저장 전 미리보기 중인 이미지(dataURL)

function openHeroAdminPanel() {
  heroAdminPanel.hidden = false;
  changeHeroImageBtn.hidden = false;
  heroTitleInput.value = siteSettings.heroTitle;
  heroDescInput.value = siteSettings.heroDesc;
  draftHeroImage = null;
}

function closeHeroAdminPanel() {
  heroAdminPanel.hidden = true;
  changeHeroImageBtn.hidden = true;
  draftHeroImage = null;
}

function enterAdminMode() {
  isAdminMode = true;
  adminGearBtn.classList.add("active");
  adminModeBadge.hidden = false;
  openHeroAdminPanel();
}

function exitAdminMode() {
  isAdminMode = false;
  adminGearBtn.classList.remove("active");
  adminModeBadge.hidden = true;
  closeHeroAdminPanel();
}

adminGearBtn.addEventListener("click", () => {
  if (isAdminMode) {
    exitAdminMode();
    return;
  }
  adminPasswordInput.value = "";
  adminLoginError.hidden = true;
  adminLoginModal.classList.add("active");
  adminPasswordInput.focus();
});

function checkAdminPassword() {
  // 테스트용 로컬 비밀번호 확인일 뿐입니다. 실제 서비스에서는 반드시
  // 서버(Supabase Auth 등) 기반 인증으로 교체해야 합니다.
  if (adminPasswordInput.value === ADMIN_PASSWORD) {
    adminLoginModal.classList.remove("active");
    enterAdminMode();
  } else {
    adminLoginError.hidden = false;
  }
}

adminLoginConfirmBtn.addEventListener("click", checkAdminPassword);
adminPasswordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAdminPassword();
});
adminLoginCancelBtn.addEventListener("click", () => {
  adminLoginModal.classList.remove("active");
});
adminLoginModal.addEventListener("click", (e) => {
  if (e.target === adminLoginModal) adminLoginModal.classList.remove("active");
});

/* ---- HERO 이미지 변경 (파일 선택 → 미리보기) ---- */
changeHeroImageBtn.addEventListener("click", () => heroImageInput.click());

heroImageInput.addEventListener("change", () => {
  const file = heroImageInput.files && heroImageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    draftHeroImage = reader.result;
    setHeroImage(draftHeroImage); // 저장 전, 화면에 바로 미리보기
  };
  reader.readAsDataURL(file);
});

/* ---- HERO 저장 / 취소 ---- */
heroCancelBtn.addEventListener("click", () => {
  draftHeroImage = null;
  heroTitleInput.value = siteSettings.heroTitle;
  heroDescInput.value = siteSettings.heroDesc;
  renderHero(); // 마지막으로 저장된 상태로 되돌림
});

heroSaveBtn.addEventListener("click", () => {
  siteSettings = {
    ...siteSettings,
    heroTitle: heroTitleInput.value.trim() || DEFAULT_SITE_SETTINGS.heroTitle,
    heroDesc: heroDescInput.value.trim() || DEFAULT_SITE_SETTINGS.heroDesc,
    heroImage: draftHeroImage || siteSettings.heroImage,
  };
  saveSiteSettings(siteSettings); // 지금은 localStorage, 추후 Supabase로 교체
  draftHeroImage = null;
  renderHero();
  alert("저장했어여! (지금은 이 브라우저에만 임시 저장돼여)");
});
