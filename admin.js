/* ==========================================================
   슈퍼말순 관리자 페이지
   Supabase Auth(이메일 로그인 1개)로 로그인한 뒤,
   콘텐츠를 등록하면 파일은 Supabase Storage(malsoon-files 버킷)에
   업로드하고, 글 정보는 contents 테이블에 저장합니다.

   ▼ SUPABASE_URL / SUPABASE_KEY 는 supabase-config.js 에서 가져옵니다.
   값이 채워지기 전까지는 "Supabase 연결 전" 안내만 보여줍니다.
   (anon/public key만 사용합니다. service_role key는 절대 넣지 마세요.)
   ========================================================== */

const BUCKET_NAME = "malsoon-files"; // Supabase Storage 버킷 이름

const isSupabaseConfigured =
  typeof SUPABASE_URL !== "undefined" &&
  typeof SUPABASE_KEY !== "undefined" &&
  SUPABASE_URL !== "여기에_URL" &&
  SUPABASE_KEY !== "여기에_KEY" &&
  SUPABASE_URL.startsWith("http");

let supabaseClient = null;
if (isSupabaseConfigured && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/* ---------------- 엘리먼트 ---------------- */
const notConfiguredNotice = document.getElementById("notConfiguredNotice");
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

const contentForm = document.getElementById("contentForm");
const contentTitleInput = document.getElementById("contentTitleInput");
const contentDescInput = document.getElementById("contentDescInput");
const contentTypeInput = document.getElementById("contentTypeInput");
const thumbnailInput = document.getElementById("thumbnailInput");
const previewInput = document.getElementById("previewInput");
const downloadInput = document.getElementById("downloadInput");
const sortOrderInput = document.getElementById("sortOrderInput");
const submitBtn = document.getElementById("submitBtn");
const statusMsg = document.getElementById("statusMsg");

/* ---------------- 초기 화면 분기 ---------------- */
if (!isSupabaseConfigured || !supabaseClient) {
  notConfiguredNotice.hidden = false;
} else {
  initAuth();
}

/* ==========================================================
   인증 (Supabase Auth) — 관리자 이메일 계정 1개로만 로그인합니다.
   일반 방문자는 로그인 없이 홈페이지를 그대로 이용할 수 있습니다.
   ========================================================== */
let currentUser = null;

async function initAuth() {
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session ? data.session.user : null;
  updateAuthUI();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();
  });
}

function updateAuthUI() {
  loginSection.hidden = !!currentUser;
  dashboard.hidden = !currentUser;
  logoutBtn.hidden = !currentUser;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginSubmitBtn.disabled = true;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value,
  });

  loginSubmitBtn.disabled = false;

  if (error) {
    loginError.textContent = "로그인에 실패했어요. 이메일/비밀번호를 확인해주세요.";
    loginError.hidden = false;
    return;
  }

  loginForm.reset();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

/* ==========================================================
   파일 업로드 (Supabase Storage) → Public URL 반환
   ========================================================== */
async function uploadFile(file, folder) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/* ==========================================================
   콘텐츠 등록
   1. 선택한 파일들을 malsoon-files 버킷에 업로드
   2. 각 파일의 Public URL 생성
   3. contents 테이블에 저장
   4. 성공 메시지 표시 + 입력창 초기화
   ========================================================== */
contentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  statusMsg.textContent = "등록 중이에요...";

  try {
    const thumbnailFile = thumbnailInput.files[0];
    const previewFile = previewInput.files[0];
    const downloadFile = downloadInput.files[0];

    const [thumbnailUrl, previewUrl, downloadUrl] = await Promise.all([
      thumbnailFile ? uploadFile(thumbnailFile, "thumbnail") : "",
      previewFile ? uploadFile(previewFile, "preview") : "",
      downloadFile ? uploadFile(downloadFile, "download") : "",
    ]);

    const { error } = await supabaseClient.from("contents").insert([
      {
        title: contentTitleInput.value.trim(),
        description: contentDescInput.value.trim(),
        type: contentTypeInput.value,
        thumbnail_url: thumbnailUrl,
        preview_url: previewUrl,
        download_url: downloadUrl,
        sort_order: Number(sortOrderInput.value) || 0,
      },
    ]);
    if (error) throw error;

    statusMsg.textContent = "등록했어요! 홈페이지에 바로 반영돼요.";
    contentForm.reset();
    sortOrderInput.value = "0";
  } catch (err) {
    console.error("콘텐츠 등록 실패", err);
    statusMsg.textContent = "등록에 실패했어요. 잠시 후 다시 시도해주세요.";
  } finally {
    submitBtn.disabled = false;
  }
});
