/* ==========================================================
   슈퍼말순 관리자 페이지 (CMS)
   Supabase Auth(이메일 로그인 1개)로 로그인한 뒤,
   대시보드 통계 / 홈페이지 설정 / 영상 관리 / 콘텐츠(GIF·이미지) 관리 /
   방명록 관리를 한 곳에서 처리합니다.

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

/* ---------------- 공통 엘리먼트 ---------------- */
const notConfiguredNotice = document.getElementById("notConfiguredNotice");
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

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

  if (currentUser) {
    loadDashboardStats();
    loadSiteSettingsForm();
    loadCategoryEditor();
    videoManager.load();
    contentManager.load();
    loadGuestbookAdminList();
  }
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
   탭 전환
   ========================================================== */
const tabButtons = document.querySelectorAll(".admin-tab-btn");
const tabPanels = document.querySelectorAll(".admin-tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tabPanels.forEach((panel) => {
      panel.hidden = panel.id !== btn.dataset.tab;
    });
    window.scrollTo({ top: 0 });
  });
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
   1. 대시보드 통계
   ========================================================== */
function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function loadDashboardStats() {
  const todayIso = startOfTodayIso();

  const [visitsToday, visitsTotal, downloadsToday, downloadsTotal, topContents, recentContents] =
    await Promise.all([
      supabaseClient.from("visits").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
      supabaseClient.from("visits").select("id", { count: "exact", head: true }),
      supabaseClient.from("downloads").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
      supabaseClient.from("downloads").select("id", { count: "exact", head: true }),
      supabaseClient.from("contents").select("title, download_count").order("download_count", { ascending: false }).limit(5),
      supabaseClient.from("contents").select("title, type, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

  document.getElementById("statVisitsToday").textContent = visitsToday.count ?? "-";
  document.getElementById("statVisitsTotal").textContent = visitsTotal.count ?? "-";
  document.getElementById("statDownloadsToday").textContent = downloadsToday.count ?? "-";
  document.getElementById("statDownloadsTotal").textContent = downloadsTotal.count ?? "-";

  renderSimpleList(
    "statTopContents",
    topContents.data,
    (row) => row.title,
    (row) => `${row.download_count || 0}회`
  );

  renderSimpleList(
    "statRecentContents",
    recentContents.data,
    (row) => row.title,
    (row) => `${TYPE_LABELS_ADMIN[row.type] || row.type}`
  );
}

const TYPE_LABELS_ADMIN = { GIF: "움짤", VIDEO: "영상", IMAGE: "이미지", ZIP: "다운로드" };

function renderSimpleList(elementId, rows, mainTextFn, metaTextFn) {
  const el = document.getElementById(elementId);
  el.innerHTML = "";

  if (!rows || rows.length === 0) {
    const empty = document.createElement("li");
    empty.className = "admin-simple-empty";
    empty.textContent = "아직 데이터가 없어요.";
    el.appendChild(empty);
    return;
  }

  rows.forEach((row) => {
    const li = document.createElement("li");
    li.className = "admin-simple-item";
    const main = document.createElement("span");
    main.textContent = mainTextFn(row);
    const meta = document.createElement("span");
    meta.className = "admin-simple-meta";
    meta.textContent = metaTextFn(row);
    li.appendChild(main);
    li.appendChild(meta);
    el.appendChild(li);
  });
}

/* ==========================================================
   2. 홈페이지 기본 설정
   ========================================================== */
const settingsEls = {
  heroPreviewImg: document.getElementById("heroPreviewImg"),
  heroPreviewPlaceholder: document.getElementById("heroPreviewPlaceholder"),
  heroImageInput: document.getElementById("settingsHeroImageInput"),
  brandName: document.getElementById("settingsBrandName"),
  heroBadge: document.getElementById("settingsHeroBadge"),
  heroTitle: document.getElementById("settingsHeroTitle"),
  heroDesc: document.getElementById("settingsHeroDesc"),
  heroCtaLabel: document.getElementById("settingsHeroCtaLabel"),
  youtubeUrl: document.getElementById("settingsYoutubeUrl"),
  kakaoUrl: document.getElementById("settingsKakaoUrl"),
  categoryTitle: document.getElementById("settingsCategoryTitle"),
  categorySub: document.getElementById("settingsCategorySub"),
  contentTitle: document.getElementById("settingsContentTitle"),
  contentSub: document.getElementById("settingsContentSub"),
  guestbookTitle: document.getElementById("settingsGuestbookTitle"),
  guestbookSub: document.getElementById("settingsGuestbookSub"),
  footerText: document.getElementById("settingsFooterText"),
  saveBtn: document.getElementById("settingsSaveBtn"),
  status: document.getElementById("settingsStatus"),
};

let currentHeroImageUrl = "";

async function loadSiteSettingsForm() {
  const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", "main").maybeSingle();
  if (error) {
    console.error("홈페이지 설정을 불러오지 못했습니다.", error);
    return;
  }

  const s = data || {};
  currentHeroImageUrl = s.hero_image_url || "";
  if (currentHeroImageUrl) {
    settingsEls.heroPreviewImg.src = currentHeroImageUrl;
    settingsEls.heroPreviewImg.hidden = false;
    settingsEls.heroPreviewPlaceholder.hidden = true;
  }

  settingsEls.brandName.value = s.brand_name || "슈퍼말순TV";
  settingsEls.heroBadge.value = s.hero_badge || "슈퍼말순 공식 홈페이지";
  settingsEls.heroTitle.value = s.hero_title || "말순이네\n놀러오셨네여";
  settingsEls.heroDesc.value = s.hero_desc || "언니오빠들 쓰라고 이것저것\n챙겨놨어여 ♡";
  settingsEls.heroCtaLabel.value = s.hero_cta_label || "무료 이모티콘 보러가기";
  settingsEls.youtubeUrl.value = s.youtube_url || "";
  settingsEls.kakaoUrl.value = s.kakao_channel_url || "";
  settingsEls.categoryTitle.value = s.category_section_title || "뭐부터 챙겨갈까요?";
  settingsEls.categorySub.value = s.category_section_sub || "말순이가 챙겨온 콘텐츠들이에여";
  settingsEls.contentTitle.value = s.content_section_title || "말순이 무료 콘텐츠";
  settingsEls.contentSub.value = s.content_section_sub || "언니오빠들 쓰라고 말순이가 챙겨왔어여 ♡";
  settingsEls.guestbookTitle.value = s.guestbook_title || "말순이네 방명록";
  settingsEls.guestbookSub.value = s.guestbook_sub || "왔다갔으면 한마디 정도는 남겨주고 가세여 😐";
  settingsEls.footerText.value = s.footer_text || "ⓒ 슈퍼말순TV";
}

settingsEls.heroImageInput.addEventListener("change", () => {
  const file = settingsEls.heroImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    settingsEls.heroPreviewImg.src = reader.result;
    settingsEls.heroPreviewImg.hidden = false;
    settingsEls.heroPreviewPlaceholder.hidden = true;
  };
  reader.readAsDataURL(file);
});

settingsEls.saveBtn.addEventListener("click", async () => {
  settingsEls.saveBtn.disabled = true;
  settingsEls.status.textContent = "저장 중이에요...";

  try {
    const file = settingsEls.heroImageInput.files[0];
    const imageUrl = file ? await uploadFile(file, "hero") : currentHeroImageUrl;

    const { error } = await supabaseClient.from("site_settings").upsert({
      id: "main",
      hero_image_url: imageUrl,
      brand_name: settingsEls.brandName.value.trim(),
      hero_badge: settingsEls.heroBadge.value.trim(),
      hero_title: settingsEls.heroTitle.value.trim(),
      hero_desc: settingsEls.heroDesc.value.trim(),
      hero_cta_label: settingsEls.heroCtaLabel.value.trim(),
      youtube_url: settingsEls.youtubeUrl.value.trim(),
      kakao_channel_url: settingsEls.kakaoUrl.value.trim(),
      category_section_title: settingsEls.categoryTitle.value.trim(),
      category_section_sub: settingsEls.categorySub.value.trim(),
      content_section_title: settingsEls.contentTitle.value.trim(),
      content_section_sub: settingsEls.contentSub.value.trim(),
      guestbook_title: settingsEls.guestbookTitle.value.trim(),
      guestbook_sub: settingsEls.guestbookSub.value.trim(),
      footer_text: settingsEls.footerText.value.trim(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    currentHeroImageUrl = imageUrl;
    settingsEls.heroImageInput.value = "";
    settingsEls.status.textContent = "저장했어요! 홈페이지에 바로 반영돼요.";
  } catch (err) {
    console.error("홈페이지 설정 저장 실패", err);
    settingsEls.status.textContent = "저장에 실패했어요. 잠시 후 다시 시도해주세요.";
  } finally {
    settingsEls.saveBtn.disabled = false;
  }
});

/* ---------------- 카테고리 카드 편집 ---------------- */
const categoryEditorList = document.getElementById("categoryEditorList");
const categorySaveBtn = document.getElementById("categorySaveBtn");
const categoryStatus = document.getElementById("categoryStatus");
let categoryRows = [];

async function loadCategoryEditor() {
  const { data, error } = await supabaseClient.from("categories").select("*").order("sort_order", { ascending: true });
  if (error) {
    console.error("카테고리를 불러오지 못했습니다.", error);
    return;
  }
  categoryRows = data || [];
  renderCategoryEditor();
}

function renderCategoryEditor() {
  categoryEditorList.innerHTML = "";

  categoryRows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "admin-category-editor-item";
    item.dataset.categoryId = row.id;

    item.innerHTML = `
      <div class="admin-category-preview">
        ${row.image_url ? `<img src="${row.image_url}" alt="" />` : ""}
      </div>
      <div class="admin-field">
        <label>제목</label>
        <input type="text" class="cat-title" value="${escapeAttr(row.title || "")}" />
      </div>
      <div class="admin-field">
        <label>설명</label>
        <input type="text" class="cat-desc" value="${escapeAttr(row.description || "")}" />
      </div>
      <label class="admin-file-label">
        이미지 변경
        <input type="file" class="cat-image-input" accept="image/*" />
      </label>
    `;

    categoryEditorList.appendChild(item);
  });
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

categorySaveBtn.addEventListener("click", async () => {
  categorySaveBtn.disabled = true;
  categoryStatus.textContent = "저장 중이에요...";

  try {
    const items = Array.from(categoryEditorList.querySelectorAll(".admin-category-editor-item"));

    for (const item of items) {
      const id = item.dataset.categoryId;
      const title = item.querySelector(".cat-title").value.trim();
      const description = item.querySelector(".cat-desc").value.trim();
      const imageFile = item.querySelector(".cat-image-input").files[0];

      const updates = { title, description };
      if (imageFile) {
        updates.image_url = await uploadFile(imageFile, "category");
      }

      const { error } = await supabaseClient.from("categories").update(updates).eq("id", id);
      if (error) throw error;
    }

    categoryStatus.textContent = "카테고리를 저장했어요!";
    loadCategoryEditor();
  } catch (err) {
    console.error("카테고리 저장 실패", err);
    categoryStatus.textContent = "저장에 실패했어요. 잠시 후 다시 시도해주세요.";
  } finally {
    categorySaveBtn.disabled = false;
  }
});

/* ==========================================================
   3·4. 콘텐츠 관리 (영상 관리 / 이모티콘·움짤 관리 공용 로직)
   두 탭 모두 contents 테이블을 사용하되, type으로 구분해서 보여줍니다.
   ========================================================== */
function createContentSectionManager(config) {
  const els = config.elements;
  let items = [];
  let editingId = null;

  function resetForm() {
    editingId = null;
    els.form.reset();
    if (els.publishedInput) els.publishedInput.checked = true;
    if (els.filesInfo) els.filesInfo.textContent = "";
    if (els.existingFilesContainer) els.existingFilesContainer.innerHTML = "";
    els.formTitleEl.textContent = config.createTitle;
    els.submitBtn.textContent = config.createButtonLabel;
    if (els.cancelBtn) els.cancelBtn.hidden = true;
  }

  if (els.filesInput) {
    els.filesInput.addEventListener("change", () => {
      const files = Array.from(els.filesInput.files);
      els.filesInfo.textContent =
        files.length > 0 ? `선택된 파일 ${files.length}개: ${files.map((f) => f.name).join(", ")}` : "";
    });
  }

  if (els.cancelBtn) {
    els.cancelBtn.addEventListener("click", resetForm);
  }

  function renderExistingFiles(fileUrls) {
    if (!els.existingFilesContainer) return;
    els.existingFilesContainer.innerHTML = "";
    (fileUrls || []).forEach((url) => {
      const chip = document.createElement("div");
      chip.className = "admin-existing-file";
      chip.dataset.url = url;

      const ext = url.split(".").pop().split("?")[0].toLowerCase();
      const mediaEl = ext === "mp4" ? document.createElement("video") : document.createElement("img");
      mediaEl.src = url;
      if (ext === "mp4") mediaEl.muted = true;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        chip.classList.toggle("marked-remove");
      });

      chip.appendChild(mediaEl);
      chip.appendChild(removeBtn);
      els.existingFilesContainer.appendChild(chip);
    });
  }

  function startEdit(item) {
    editingId = item.id;
    els.titleInput.value = item.title || "";
    els.descInput.value = item.description || "";
    if (els.typeInput) els.typeInput.value = item.type || config.defaultType;
    if (els.publishedInput) els.publishedInput.checked = item.is_published !== false;
    els.sortOrderInput.value = item.sort_order || 0;
    if (els.thumbnailInput) els.thumbnailInput.value = "";
    if (els.filesInput) els.filesInput.value = "";
    if (els.filesInfo) els.filesInfo.textContent = "";

    renderExistingFiles(item.file_urls);

    els.formTitleEl.textContent = config.editTitle;
    els.submitBtn.textContent = "수정 저장";
    if (els.cancelBtn) els.cancelBtn.hidden = false;

    els.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.submitBtn.disabled = true;
    els.status.textContent = "저장 중이에요...";

    try {
      const thumbnailFile = els.thumbnailInput ? els.thumbnailInput.files[0] : null;
      const newFiles = els.filesInput ? Array.from(els.filesInput.files) : [];

      const [thumbnailUrl, newFileUrls] = await Promise.all([
        thumbnailFile ? uploadFile(thumbnailFile, config.thumbnailFolder) : "",
        Promise.all(newFiles.map((f) => uploadFile(f, config.filesFolder))),
      ]);

      let finalFileUrls = newFileUrls;
      if (editingId) {
        const keptUrls = els.existingFilesContainer
          ? Array.from(els.existingFilesContainer.querySelectorAll(".admin-existing-file:not(.marked-remove)")).map(
              (chip) => chip.dataset.url
            )
          : [];
        finalFileUrls = [...keptUrls, ...newFileUrls];
      }

      if (!editingId && finalFileUrls.length === 0) {
        els.status.textContent = `${config.fileLabel}을(를) 1개 이상 선택해주세요.`;
        els.submitBtn.disabled = false;
        return;
      }

      const payload = {
        title: els.titleInput.value.trim(),
        description: els.descInput.value.trim(),
        type: els.typeInput ? els.typeInput.value : config.defaultType,
        sort_order: Number(els.sortOrderInput.value) || 0,
        is_published: els.publishedInput ? els.publishedInput.checked : true,
      };
      if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl;
      payload.file_urls = finalFileUrls;

      if (editingId) {
        const { error } = await supabaseClient.from("contents").update(payload).eq("id", editingId);
        if (error) throw error;
        els.status.textContent = "수정했어요!";
      } else {
        payload.download_count = 0;
        const { error } = await supabaseClient.from("contents").insert([payload]);
        if (error) throw error;
        els.status.textContent = "등록했어요! 홈페이지에 바로 반영돼요.";
      }

      resetForm();
      manager.load();
    } catch (err) {
      console.error("저장 실패", err);
      els.status.textContent = "저장에 실패했어요. 잠시 후 다시 시도해주세요.";
    } finally {
      els.submitBtn.disabled = false;
    }
  });

  function renderList() {
    els.listEl.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "admin-content-empty";
      empty.textContent = "아직 등록된 항목이 없어요.";
      els.listEl.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "admin-content-item";

      const thumb = document.createElement("img");
      thumb.className = "admin-content-thumb";
      thumb.src = item.thumbnail_url || (item.file_urls && item.file_urls[0]) || "";
      thumb.alt = "";
      thumb.onerror = () => (thumb.style.visibility = "hidden");

      const info = document.createElement("div");
      info.className = "admin-content-info";
      const titleEl = document.createElement("p");
      titleEl.className = "admin-content-title";
      titleEl.textContent = item.title;
      const metaEl = document.createElement("p");
      metaEl.className = "admin-content-meta";
      const fileCount = (item.file_urls || []).length;
      metaEl.textContent = `${TYPE_LABELS_ADMIN[item.type] || item.type} · 파일 ${fileCount}개 · 다운로드 ${
        item.download_count || 0
      }회 · ${item.is_published ? "공개" : "비공개"}`;
      info.appendChild(titleEl);
      info.appendChild(metaEl);

      const actions = document.createElement("div");
      actions.className = "admin-content-actions";
      actions.appendChild(makeActionButton("▲", () => moveItem(index, -1)));
      actions.appendChild(makeActionButton("▼", () => moveItem(index, 1)));
      actions.appendChild(
        makeActionButton(item.is_published ? "비공개로" : "공개로", () => togglePublish(item))
      );
      actions.appendChild(makeActionButton("수정", () => startEdit(item)));
      actions.appendChild(makeActionButton("삭제", () => deleteItem(item), true));

      li.appendChild(thumb);
      li.appendChild(info);
      li.appendChild(actions);
      els.listEl.appendChild(li);
    });
  }

  function makeActionButton(label, onClick, isDanger) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary admin-mini-btn" + (isDanger ? " admin-danger" : "");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  async function togglePublish(item) {
    const { error } = await supabaseClient
      .from("contents")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);
    if (error) {
      console.error("공개 상태 변경 실패", error);
      return;
    }
    manager.load();
  }

  async function deleteItem(item) {
    if (!confirm(`"${item.title}"을(를) 삭제할까요?\n이 작업은 되돌릴 수 없어요.`)) return;
    const { error } = await supabaseClient.from("contents").delete().eq("id", item.id);
    if (error) {
      console.error("삭제 실패", error);
      alert("삭제에 실패했어요.");
      return;
    }
    manager.load();
  }

  async function moveItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const a = items[index];
    const b = items[targetIndex];
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabaseClient.from("contents").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabaseClient.from("contents").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (e1 || e2) {
      console.error("순서 변경 실패", e1, e2);
      return;
    }
    manager.load();
  }

  const manager = {
    async load() {
      const { data, error } = await supabaseClient
        .from("contents")
        .select("*")
        .in("type", config.allowedTypes)
        .order("sort_order", { ascending: true });
      if (error) {
        console.error(`${config.kind} 목록을 불러오지 못했습니다.`, error);
        return;
      }
      items = data || [];
      renderList();
    },
  };

  return manager;
}

const videoManager = createContentSectionManager({
  kind: "영상",
  allowedTypes: ["VIDEO"],
  defaultType: "VIDEO",
  createTitle: "새 영상 등록",
  editTitle: "영상 수정",
  createButtonLabel: "등록",
  thumbnailFolder: "thumbnail",
  filesFolder: "files",
  fileLabel: "영상 파일",
  elements: {
    form: document.getElementById("videoForm"),
    titleInput: document.getElementById("videoTitleInput"),
    descInput: document.getElementById("videoDescInput"),
    typeInput: null,
    thumbnailInput: document.getElementById("videoThumbnailInput"),
    filesInput: document.getElementById("videoFilesInput"),
    filesInfo: document.getElementById("videoFilesInfo"),
    existingFilesContainer: document.getElementById("videoExistingFiles"),
    sortOrderInput: document.getElementById("videoSortOrderInput"),
    publishedInput: document.getElementById("videoPublishedInput"),
    submitBtn: document.getElementById("videoSubmitBtn"),
    cancelBtn: document.getElementById("videoCancelEditBtn"),
    formTitleEl: document.getElementById("videoFormTitle"),
    status: document.getElementById("videoStatus"),
    listEl: document.getElementById("videoList"),
  },
});

const contentManager = createContentSectionManager({
  kind: "콘텐츠",
  allowedTypes: ["GIF", "IMAGE", "ZIP"],
  defaultType: "GIF",
  createTitle: "새 콘텐츠 세트 등록",
  editTitle: "콘텐츠 세트 수정",
  createButtonLabel: "등록",
  thumbnailFolder: "thumbnail",
  filesFolder: "files",
  fileLabel: "세트 파일",
  elements: {
    form: document.getElementById("contentForm"),
    titleInput: document.getElementById("contentTitleInput"),
    descInput: document.getElementById("contentDescInput"),
    typeInput: document.getElementById("contentTypeInput"),
    thumbnailInput: document.getElementById("contentThumbnailInput"),
    filesInput: document.getElementById("contentFilesInput"),
    filesInfo: document.getElementById("contentFilesInfo"),
    existingFilesContainer: document.getElementById("contentExistingFiles"),
    sortOrderInput: document.getElementById("contentSortOrderInput"),
    publishedInput: document.getElementById("contentPublishedInput"),
    submitBtn: document.getElementById("contentSubmitBtn"),
    cancelBtn: document.getElementById("contentCancelEditBtn"),
    formTitleEl: document.getElementById("contentFormTitle"),
    status: document.getElementById("contentStatus"),
    listEl: document.getElementById("contentAdminList"),
  },
});

/* ==========================================================
   5. 방명록 관리
   ========================================================== */
const guestbookAdminList = document.getElementById("guestbookAdminList");

async function loadGuestbookAdminList() {
  const { data, error } = await supabaseClient
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("방명록을 불러오지 못했습니다.", error);
    return;
  }

  guestbookAdminList.innerHTML = "";

  if (!data || data.length === 0) {
    const empty = document.createElement("li");
    empty.className = "admin-simple-empty";
    empty.textContent = "아직 방명록이 없어요.";
    guestbookAdminList.appendChild(empty);
    return;
  }

  data.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "admin-content-item";
    li.style.gridTemplateColumns = "1fr";

    const info = document.createElement("div");
    info.innerHTML = `
      <p class="admin-content-title">${escapeHtml(entry.nickname)}${entry.is_hidden ? " (숨김)" : ""}</p>
      <p class="admin-content-meta">${escapeHtml(entry.message)}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "admin-content-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-secondary admin-mini-btn";
    toggleBtn.textContent = entry.is_hidden ? "보이기" : "숨기기";
    toggleBtn.addEventListener("click", async () => {
      const { error: e } = await supabaseClient
        .from("guestbook")
        .update({ is_hidden: !entry.is_hidden })
        .eq("id", entry.id);
      if (e) {
        console.error("방명록 숨김 처리 실패", e);
        return;
      }
      loadGuestbookAdminList();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-secondary admin-mini-btn admin-danger";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("이 방명록을 삭제할까요?")) return;
      const { error: e } = await supabaseClient.from("guestbook").delete().eq("id", entry.id);
      if (e) {
        console.error("방명록 삭제 실패", e);
        return;
      }
      loadGuestbookAdminList();
    });

    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);
    guestbookAdminList.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
