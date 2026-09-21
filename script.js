// 슈퍼말순TV 유튜브 주소 - 나중에 실제 주소로 교체하세요
const YOUTUBE_URL = "https://www.youtube.com/channel/UCddVgimMuJfeFWUNvMUGldw";
// 말순이 카카오채널 주소 - 나중에 실제 주소로 교체하세요
const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_여기에_채널ID"; // TODO: 실제 카카오채널 주소로 교체

/* ==========================================================
   Supabase 클라이언트
   SUPABASE_URL / SUPABASE_KEY 는 supabase-config.js 에서 가져옵니다.
   값이 채워지기 전까지는 supabaseClient가 null로 유지되고,
   아래 모든 기능은 자동으로 "기본 데모 데이터" 상태로 동작합니다.
   ========================================================== */
let supabaseClient = null;
const isSupabaseConfigured =
  typeof SUPABASE_URL !== "undefined" &&
  typeof SUPABASE_KEY !== "undefined" &&
  SUPABASE_URL !== "여기에_URL" &&
  SUPABASE_KEY !== "여기에_KEY" &&
  SUPABASE_URL.startsWith("http");

if (isSupabaseConfigured && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 콘텐츠 유형(type) 코드 → 화면에 보여줄 한글 표시
const TYPE_LABELS = {
  GIF: "움짤",
  VIDEO: "영상",
  IMAGE: "이미지",
  ZIP: "다운로드",
};

/* ==========================================================
   콘텐츠 데이터
   Supabase contents 테이블에서 불러옵니다.
   (정렬: sort_order 오름차순, 같으면 created_at 최신순)
   아직 연결 전이거나 등록된 데이터가 없으면 아래 기본 데모 데이터를 보여줍니다.
   ========================================================== */
const DEFAULT_CONTENTS = [
  {
    id: "demo-1",
    title: "말순이 일상 움짤 20종",
    description: "카톡·DM·댓글에 쓰기 좋은 말순이 일상 리액션 모음이에여 ♡",
    type: "GIF",
    thumbnailUrl: "images/emoji-set-01.png",
    previewUrl: "",
    downloadUrl: "downloads/malsoon-emoji-vol1.zip",
  },
];

let contents = [...DEFAULT_CONTENTS];

// Supabase의 snake_case 행을 화면 렌더링에서 쓰는 camelCase 형태로 변환합니다.
function mapDbContentToItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    thumbnailUrl: row.thumbnail_url || "",
    previewUrl: row.preview_url || "",
    downloadUrl: row.download_url || "",
  };
}

async function loadContentsFromSupabase() {
  if (!supabaseClient) return; // Supabase 연결 전: 기본 데모 데이터 유지

  const { data, error } = await supabaseClient
    .from("contents")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("콘텐츠를 불러오지 못했습니다.", error);
    return;
  }

  if (data && data.length > 0) {
    contents = data.map(mapDbContentToItem);
    renderContentList();
  }
}

/* ---------------- 콘텐츠 카드 렌더링 ---------------- */
const contentList = document.getElementById("contentList");

function renderContentCard(item) {
  const card = document.createElement("div");
  card.className = "emoji-set-card";

  const imageBox = document.createElement("div");
  imageBox.className = "emoji-set-image";
  imageBox.innerHTML = `<span class="placeholder-text small">🖼️</span>`;

  const img = document.createElement("img");
  img.src = item.thumbnailUrl;
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
  body.querySelector(".emoji-set-category").textContent = TYPE_LABELS[item.type] || item.type;
  body.querySelector(".emoji-set-title").textContent = item.title;
  body.querySelector(".emoji-set-desc").textContent = item.description;
  body.querySelector(".emoji-set-info").textContent = item.downloadUrl
    ? "무료 다운로드"
    : "다운로드 준비중";

  body.querySelector(".preview-btn").addEventListener("click", () => {
    openPreview(item);
  });

  const downloadBtn = body.querySelector(".download-set-btn");
  if (item.downloadUrl) {
    downloadBtn.addEventListener("click", () => {
      openModal(item.downloadUrl);
    });
  } else {
    downloadBtn.disabled = true;
  }

  card.appendChild(imageBox);
  card.appendChild(body);
  return card;
}

function renderContentList() {
  contentList.innerHTML = "";

  if (contents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "guestbook-empty";
    empty.textContent = "곧 콘텐츠가 채워질 예정이에여 ♡";
    contentList.appendChild(empty);
    return;
  }

  contents.forEach((item) => {
    contentList.appendChild(renderContentCard(item));
  });
}

renderContentList();
loadContentsFromSupabase();

/* ---------------- 카테고리 카드 / 필터 탭: 콘텐츠 섹션으로 스크롤만 ---------------- */
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("contentSection").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll(".category-card").forEach((card) => {
  card.addEventListener("click", () => {
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
    target.scrollIntoView({ behavior: "smooth" });
  });
});

document.getElementById("heroCta").addEventListener("click", () => {
  document.getElementById("contentSection").scrollIntoView({ behavior: "smooth" });
});

/* ---------------- 콘텐츠 미리보기 팝업 ---------------- */
const previewModal = document.getElementById("previewModal");
const previewMedia = document.getElementById("previewMedia");
const previewTitle = document.getElementById("previewTitle");
const closePreviewBtn = document.getElementById("closePreviewBtn");

// type이 VIDEO면 자동재생 반복 영상으로, 그 외(GIF/IMAGE/ZIP)에는
// preview_url(없으면 썸네일)을 이미지로 보여줍니다.
function buildPreviewElement(item) {
  const src = item.previewUrl || item.thumbnailUrl;
  if (!src) return null;

  if (item.type === "VIDEO") {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    return video;
  }

  const img = document.createElement("img");
  img.src = src;
  return img;
}

function openPreview(item) {
  previewMedia.innerHTML = "";
  previewTitle.textContent = item.title;

  const el = buildPreviewElement(item);
  if (!el) {
    previewMedia.innerHTML = `<span class="placeholder-text small">🖼️</span>`;
    previewModal.classList.add("active");
    return;
  }

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

/* ==========================================================
   HERO 텍스트/이미지 렌더링
   Supabase가 연결되어 있으면 site_settings 테이블(id="main")에서
   불러오고, 아직 연결 전이거나 저장된 값이 없으면 기본값을 보여줍니다.
   HERO 내용 수정은 admin.html(관리자 페이지)에서 합니다.
   ========================================================== */
const heroTitleEl = document.querySelector(".hero-title");
const heroSubEl = document.querySelector(".hero-sub");
const heroImageEl = document.querySelector(".hero-image img");

const DEFAULT_SITE_SETTINGS = {
  heroImage: "images/malsoon-main.png",
  heroTitle: "말순이네\n놀러오셨네여",
  heroDesc: "언니오빠들 쓰라고 이것저것\n챙겨놨어여 ♡",
};

let siteSettings = { ...DEFAULT_SITE_SETTINGS };

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

async function loadSiteSettingsFromSupabase() {
  if (!supabaseClient) return; // Supabase 연결 전: 기본값 유지

  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("hero_image_url, hero_title, hero_desc")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    console.error("HERO 설정을 불러오지 못했습니다.", error);
    return;
  }

  if (data) {
    siteSettings = {
      heroImage: data.hero_image_url || DEFAULT_SITE_SETTINGS.heroImage,
      heroTitle: data.hero_title || DEFAULT_SITE_SETTINGS.heroTitle,
      heroDesc: data.hero_desc || DEFAULT_SITE_SETTINGS.heroDesc,
    };
    renderHero();
  }
}

renderHero();
loadSiteSettingsFromSupabase();
