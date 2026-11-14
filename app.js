/* KOMSI RUPA LIBRARY — perbaikan login, katalog, dan upload
   Frontend hanya memakai Supabase publishable/anon key. Jangan masukkan service_role key.
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://odcxkypwvhmpliuntmdc.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_gHdYS_wikUsuWtXpzzGh3Q_21TFwkyD";
  const STORAGE_BUCKET = "rupa-library";
  const TABLE = "artworks";
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const demoArtworks = [
    {id:"demo-1",title:"Quiet Forms",category:"Desain",creator:"KOMSI Studio",description:"Eksplorasi bentuk dan ruang dengan pendekatan minimalis.",file_url:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=85",file_name:"quiet-forms.jpg",created_at:"2026-10-08T10:00:00Z",is_demo:true},
    {id:"demo-2",title:"Soft Architecture",category:"Fotografi",creator:"Visual Archive",description:"Permainan cahaya dan bayangan dalam arsitektur.",file_url:"https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85",file_name:"soft-architecture.jpg",created_at:"2026-10-07T10:00:00Z",is_demo:true},
    {id:"demo-3",title:"Color Study 04",category:"Ilustrasi",creator:"KOMSI Studio",description:"Studi warna, tekstur, dan komposisi abstrak.",file_url:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85",file_name:"color-study.jpg",created_at:"2026-10-06T10:00:00Z",is_demo:true},
    {id:"demo-4",title:"Still Life Notes",category:"Artwork",creator:"Visual Archive",description:"Komposisi objek sehari-hari dengan tone lembut.",file_url:"https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1000&q=85",file_name:"still-life.jpg",created_at:"2026-10-05T10:00:00Z",is_demo:true},
    {id:"demo-5",title:"Open Canvas",category:"Desain",creator:"KOMSI Studio",description:"Referensi visual untuk proyek kreatif berikutnya.",file_url:"https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=85",file_name:"open-canvas.jpg",created_at:"2026-10-04T10:00:00Z",is_demo:true},
    {id:"demo-6",title:"Nature in Frame",category:"Fotografi",creator:"Visual Archive",description:"Fragmen alam dengan komposisi sederhana.",file_url:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",file_name:"nature-frame.jpg",created_at:"2026-10-03T10:00:00Z",is_demo:true},
    {id:"demo-7",title:"Motion Notes",category:"Video",creator:"KOMSI Studio",description:"Contoh entri kategori video.",file_url:"",preview_url:"https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1000&q=85",file_name:"motion-notes.mp4",created_at:"2026-10-02T10:00:00Z",is_demo:true},
    {id:"demo-8",title:"Poster Experiments",category:"Desain",creator:"Visual Archive",description:"Eksperimen tipografi dan tata letak poster.",file_url:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1000&q=85",file_name:"poster-experiments.jpg",created_at:"2026-10-01T10:00:00Z",is_demo:true}
  ];

  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isVideo = (art) => art.category === "Video" || /\.(mp4|webm|mov)$/i.test(art.file_name || art.file_url || "");
  const prettyDate = (date) => date ? new Date(date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "Koleksi KOMSI";
  const bytesLabel = (bytes) => {
    if (!bytes) return "";
    const units = ["B","KB","MB","GB"]; let i = 0, n = bytes;
    while (n >= 1024 && i < 3) { n /= 1024; i++; }
    return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
  };

  let supabase = null;
  let artworks = [];
  let activeCategory = "Semua karya";
  let feedMode = "all";
  let favoritesOnly = false;
  let activeCreator = "";
  let currentUser = null;
  let currentProfile = null;
  let selectedAvatarPreviewUrl = "";
  let activePublicProfileId = "";
  const ADMIN_USER_ID = "b520cf6e-be06-4338-976d-8604877fd632";
  let favorites = new Set();
  let likedArtworks = new Set();
  let artworkLikeCounts = new Map();
  let artworkCommentCounts = new Map();
  let followingMembers = new Set();
  let notificationItems = [];
  try {
    favorites = new Set(JSON.parse(localStorage.getItem("komsi-rupa-favorites") || "[]"));
  } catch (_) {
    try { localStorage.removeItem("komsi-rupa-favorites"); } catch (_) {}
  }

  function showMessage(message, success = false) {
    const el = $("#adminMessage");
    if (!el) return;
    el.textContent = message;
    el.style.color = success ? "#4e7812" : "#a04b38";
    el.hidden = false;
  }

  function showDeleteMessage(message, success = false) {
    const el = $("#detailMessage");
    if (!el) {
      showMessage(message, success);
      return;
    }
    el.textContent = message;
    el.style.color = success ? "#4e7812" : "#a04b38";
    el.hidden = false;
  }

  function normalizeArtwork(row) {
    const preview = row.preview_url || (isVideo(row) ? "" : row.image_url || row.file_url || "");
    return {
      ...row,
      creator: row.creator || row.created_by_name || row.created_by || "KOMSI Library",
      preview_url: preview,
      file_url: row.file_url || row.image_url || "",
      file_size: Number(row.file_size || 0)
    };
  }

  async function loadArtworks() {
    const notice = $("#notice");
    if (!supabase) {
      artworks = demoArtworks;
      if (notice) notice.textContent = "Mode pratinjau aktif: library Supabase belum termuat. Periksa koneksi CDN dan konfigurasi app.js.";
      render();
      return;
    }
    if (notice) notice.textContent = "Menghubungkan ke katalog KOMSI…";
    try {
      const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      artworks = (data || []).map(normalizeArtwork);
      if (notice) notice.textContent = "Terhubung ke katalog KOMSI RUPA LIBRARY.";
    } catch (error) {
      console.error("Katalog gagal dimuat:", error);
      artworks = [];
      if (notice) notice.textContent = "Koneksi Supabase terdeteksi, tetapi katalog gagal dimuat: " + (error.message || "periksa tabel artworks dan RLS.");
    }
    render();
  }

  function filteredArtworks() {
    const query = ($("#searchInput")?.value || "").trim().toLowerCase();
    const sort = $("#sortSelect")?.value || "newest";
    const result = artworks.filter(a =>
      (activeCategory === "Semua karya" || a.category === activeCategory) &&
      (!favoritesOnly || favorites.has(String(a.id))) &&
      (!activeCreator || a.creator === activeCreator) &&
      (feedMode !== "following" || (currentUser && followingMembers.has(String(a.created_by || "")))) &&
      (!query || [a.title, a.category, a.creator, a.description, a.tags].join(" ").toLowerCase().includes(query))
    );
    if (feedMode === "explore") {
      result.sort((a,b) => {
        const score = item => Number(artworkLikeCounts.get(String(item.id)) || 0) * 3 + Number(artworkCommentCounts.get(String(item.id)) || 0) * 2 + Number(item.view_count || 0) * 0.1;
        return score(b) - score(a) || new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    } else if (sort === "title") result.sort((a,b) => (a.title || "").localeCompare(b.title || "", "id"));
    else if (sort === "oldest") result.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sort === "popular") result.sort((a,b) => Number(b.view_count || 0) - Number(a.view_count || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else result.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return result;
  }

  function render() {
    const grid = $("#artGrid");
    if (!grid) return;
    const list = filteredArtworks();
    if ($("#resultCount")) $("#resultCount").textContent = `${list.length} karya`;
    if ($("#favoriteCount")) $("#favoriteCount").textContent = favorites.size;
    if ($("#emptyState")) {
      $("#emptyState").hidden = list.length !== 0;
      const heading = $("#emptyState h3"), description = $("#emptyState p");
      if (heading) heading.textContent = feedMode === "following" ? "Belum ada karya dari kreator yang kamu ikuti." : "Belum ada karya ditemukan.";
      if (description) description.textContent = feedMode === "following" ? (currentUser ? "Ikuti anggota KOMSI untuk mengisi berandamu dengan karya terbaru mereka." : "Masuk ke akun anggota, lalu ikuti kreator untuk melihat karya mereka di sini.") : "Coba kata kunci lain atau pilih kategori yang berbeda.";
    }
    grid.innerHTML = list.map(a => {
      const thumb = a.preview_url || a.image_url || a.file_url;
      const media = thumb
        ? (isVideo(a) && !a.preview_url ? `<div class="video-placeholder">▶ Video</div>` : `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(a.title)}" loading="lazy">`)
        : `<div class="video-placeholder">KOMSI<br>RUPA</div>`;
      const id = escapeHtml(a.id);
      const saved = favorites.has(String(a.id));
      const liked = likedArtworks.has(String(a.id));
      const creatorAction = a.created_by ? `data-member-profile="${escapeHtml(a.created_by)}"` : `data-creator-filter="${escapeHtml(a.creator || "KOMSI Library")}"`;
      return `<article class="art-card" data-open="${id}"><div class="art-thumb">${media}<span class="art-type">${escapeHtml(a.category || "Visual")}</span><button class="favorite-button ${saved ? "saved" : ""}" data-favorite="${id}" aria-label="Tambah ke favorit" type="button">${saved ? "♥" : "♡"}</button></div><div class="art-meta"><div class="art-title-row"><h3 class="art-title">${escapeHtml(a.title)}</h3><span class="art-size">${a.file_size ? bytesLabel(a.file_size) : ""}</span></div><button type="button" class="creator-filter-button" ${creatorAction}>${escapeHtml(a.creator || "KOMSI Library")} ↗</button><div class="art-social-actions"><button type="button" class="art-like-button ${liked ? "liked" : ""}" data-like="${id}">${liked ? "♥" : "♡"} ${Number(artworkLikeCounts.get(String(a.id)) || 0).toLocaleString("id-ID")}</button><span>▢ ${Number(artworkCommentCounts.get(String(a.id)) || 0).toLocaleString("id-ID")} komentar</span><span class="art-views">◉ ${Number(a.view_count || 0).toLocaleString("id-ID")} dilihat</span></div></div></article>`;
    }).join("");
    renderMemberPortfolio();
  }

  function renderMemberPortfolio() {
    const panel = $("#memberPortfolio");
    if (!panel) return;
    if (!currentUser) { panel.innerHTML = ""; return; }
    const mine = artworks.filter(item => !item.is_demo && item.created_by === currentUser.id)
      .sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    panel.innerHTML = mine.length
      ? mine.map(item => {
          const thumb = item.preview_url || item.image_url || item.file_url;
          const thumbnail = thumb
            ? (isVideo(item) && !item.preview_url
                ? '<div class="member-work-placeholder">▶</div>'
                : `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title || "Pratinjau karya")}" loading="lazy">`)
            : '<div class="member-work-placeholder">KOMSI</div>';
          return `<article class="member-work-item">
            <div class="member-work-preview">${thumbnail}</div>
            <div class="member-work-info"><strong>${escapeHtml(item.title || "Tanpa judul")}</strong><span>${escapeHtml(item.category || "Visual")} · ${Number(item.view_count || 0).toLocaleString("id-ID")} dilihat</span></div>
            <div class="member-work-actions"><button type="button" class="text-button" data-member-open="${escapeHtml(item.id)}">Lihat karya ↗</button><button type="button" class="text-button" data-member-edit="${escapeHtml(item.id)}">Edit karya ✎</button></div>
          </article>`;
        }).join("")
      : '<p class="member-empty">Kamu belum mengunggah karya. Karya yang kamu unggah akan muncul di sini.</p>';
  }

  async function recordArtworkView(id) {
    if (!supabase || !/^\d+$/.test(String(id))) return;
    try {
      const { data, error } = await supabase.functions.invoke("record-artwork-view", {
        body: { artwork_id: Number(id) }
      });
      if (error) throw error;
      if (!data?.counted) return;
      const artwork = artworks.find(item => String(item.id) === String(id));
      if (artwork) artwork.view_count = Number(artwork.view_count || 0) + 1;
      render();
      refreshAdminStats();
    } catch (error) {
      console.warn("Statistik kunjungan belum tercatat:", error?.message || error);
    }
  }

  async function shareArtwork(id) {
    const artwork = artworks.find(item => String(item.id) === String(id));
    if (!artwork) return;
    const url = new URL(window.location.href);
    url.searchParams.set("karya", String(id));
    const shareData = { title: artwork.title || "Karya KOMSI", text: "Lihat karya di KOMSI RUPA LIBRARY", url: url.toString() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        showDeleteMessage("Tautan karya berhasil disalin.", true);
      } else window.prompt("Salin tautan karya ini:", shareData.url);
    } catch (error) {
      if (error?.name !== "AbortError") showDeleteMessage("Tautan belum dapat dibagikan. Silakan coba lagi.");
    }
  }

  async function refreshAdminStats() {
    const panel = $("#adminStats");
    if (!panel || !supabase || !currentUser) return;
    panel.innerHTML = '<p>Memuat statistik KOMSI RUPA LIBRARY…</p>';
    try {
      const { data, error } = await supabase.rpc("get_rupa_dashboard_stats");
      if (error) throw error;
      const stats = data || {};
      const isAdmin = Boolean(stats.is_admin);
      const number = value => Number(value || 0).toLocaleString("id-ID");
      const dateLabel = value => value
        ? new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Tanggal tidak tersedia";
      const popular = Array.isArray(stats.popular) ? stats.popular : [];
      const categories = Array.isArray(stats.categories) ? stats.categories : [];
      const recent = Array.isArray(stats.recent) ? stats.recent : [];
      const maxCategory = Math.max(1, ...categories.map(item => Number(item.total || 0)));
      const metricCards = isAdmin
        ? `<div class="admin-stat-card"><strong>${number(stats.artwork_count)}</strong><span>Total karya</span></div>
           <div class="admin-stat-card"><strong>${number(stats.member_count)}</strong><span>Total anggota terdaftar</span></div>
           <div class="admin-stat-card"><strong>${number(stats.view_total)}</strong><span>Total kunjungan karya</span></div>
           <div class="admin-stat-card"><strong>${number(stats.profile_visit_total)}</strong><span>Total kunjungan profil</span></div>`
        : `<div class="admin-stat-card"><strong>${number(stats.artwork_count)}</strong><span>Total karya saya</span></div>
           <div class="admin-stat-card"><strong>${number(stats.view_total)}</strong><span>Total kunjungan karya saya</span></div>
           <div class="admin-stat-card"><strong>${number(stats.profile_visit_total)}</strong><span>Kunjungan profil saya</span></div>`;
      const popularHtml = popular.length
        ? `<ol class="dashboard-ranking">${popular.map((item, index) => `<li><span class="dashboard-rank">${index + 1}</span><span class="dashboard-item-name">${escapeHtml(item.title || "Tanpa judul")}</span><strong>${number(item.view_count)} <small>kunjungan</small></strong></li>`).join("")}</ol>`
        : '<p class="dashboard-empty">Belum ada karya yang tercatat.</p>';
      const categoryHtml = categories.length
        ? `<div class="dashboard-category-list">${categories.map(item => {
            const total = Number(item.total || 0);
            const width = Math.round(total / maxCategory * 100);
            return `<div class="dashboard-category"><div><span>${escapeHtml(item.category || "Tanpa kategori")}</span><strong>${number(total)} karya</strong></div><div class="dashboard-bar"><i style="width:${width}%"></i></div></div>`;
          }).join("")}</div>`
        : '<p class="dashboard-empty">Belum ada kategori aktif.</p>';
      const recentHtml = recent.length
        ? `<ul class="dashboard-recent">${recent.map(item => `<li><div><strong>${escapeHtml(item.title || "Tanpa judul")}</strong><span>${escapeHtml(item.category || "Tanpa kategori")} · ${escapeHtml(item.creator || "Anggota KOMSI")}</span></div><time>${escapeHtml(dateLabel(item.created_at))}</time></li>`).join("")}</ul>`
        : '<p class="dashboard-empty">Belum ada aktivitas upload.</p>';
      const members = Array.isArray(stats.members) ? stats.members : [];
      const memberStatsHtml = isAdmin
        ? `<section class="dashboard-stat-section dashboard-stat-wide"><h4>Statistik karya setiap anggota</h4>${members.length
            ? `<div class="dashboard-member-table"><div class="dashboard-member-row dashboard-member-head"><span>Anggota</span><span>Karya</span><span>Kunjungan karya</span><span>Kunjungan profil</span></div>${members.map(item => `<div class="dashboard-member-row"><strong>${escapeHtml(item.display_name || "Anggota KOMSI")}</strong><span>${number(item.artwork_count)}</span><span>${number(item.view_total)}</span><span>${number(item.profile_visits)}</span></div>`).join("")}</div>`
            : '<p class="dashboard-empty">Belum ada data anggota.</p>'}</section>`
        : "";

      panel.innerHTML = `<div class="dashboard-heading"><div><p class="section-kicker">RINGKASAN DATA</p><h3>${isAdmin ? "Dashboard Statistik" : "Statistik portofolio saya"}</h3></div><button type="button" class="dashboard-refresh" id="refreshDashboardStats">Perbarui ↻</button></div>
        <div class="admin-stat-grid ${isAdmin ? "is-admin" : "is-member"}">${metricCards}</div>
        <div class="dashboard-stat-sections">
          <section class="dashboard-stat-section"><h4>${isAdmin ? "Karya paling populer" : "Karya saya paling populer"}</h4>${popularHtml}</section>
          <section class="dashboard-stat-section"><h4>${isAdmin ? "Kategori paling aktif" : "Kategori karya saya"}</h4>${categoryHtml}</section>
          <section class="dashboard-stat-section dashboard-stat-wide"><h4>${isAdmin ? "Aktivitas upload terbaru" : "Upload terbaru saya"}</h4>${recentHtml}</section>
          ${memberStatsHtml}
        </div>`;
      $("#refreshDashboardStats")?.addEventListener("click", refreshAdminStats);
    } catch (error) {
      panel.innerHTML = `<p class="dashboard-error">Statistik belum dapat dimuat: ${escapeHtml(getErrorMessage(error))}</p><button type="button" class="dashboard-refresh" id="refreshDashboardStats">Coba lagi ↻</button>`;
      $("#refreshDashboardStats")?.addEventListener("click", refreshAdminStats);
    }
  }

  function filterByCreator(name) {
    activeCreator = String(name || "").trim();
    const panel = $("#creatorFilter");
    const label = $("#creatorFilterLabel");
    if (panel) panel.hidden = !activeCreator;
    if (label) {
      const total = artworks.filter(item => item.creator === activeCreator).length;
      label.textContent = activeCreator ? `Menampilkan ${total} karya dari kreator: ${activeCreator}` : "";
    }
    $("#koleksi")?.scrollIntoView({ behavior: "smooth" });
    render();
  }


  function notificationLabel(item, actorName) {
    const actor = actorName || "Anggota KOMSI";
    if (item.notification_type === "like") return actor + " menyukai karya kamu.";
    if (item.notification_type === "reply") return actor + " membalas komentar kamu.";
    if (item.notification_type === "comment") return actor + " mengomentari karya kamu.";
    return actor + " mulai mengikuti kamu.";
  }

  async function loadNotifications() {
    const list = $("#notificationList"), badge = $("#notificationBadge");
    if (!supabase || !currentUser) {
      notificationItems = [];
      if (badge) { badge.hidden = true; badge.textContent = "0"; }
      if (list) list.innerHTML = '<p class="notification-empty">Masuk untuk melihat notifikasi.</p>';
      return;
    }
    if (list) list.innerHTML = '<p class="notification-empty">Memuat notifikasi…</p>';
    try {
      const { data, error } = await supabase.from("member_notifications")
        .select("id,actor_id,notification_type,artwork_id,is_read,created_at")
        .eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      notificationItems = data || [];
      const actorIds = [...new Set(notificationItems.map(item => item.actor_id).filter(Boolean))];
      let names = new Map();
      if (actorIds.length) {
        const profiles = await supabase.from("member_profiles").select("user_id,display_name").in("user_id", actorIds);
        if (!profiles.error) names = new Map((profiles.data || []).map(profile => [profile.user_id, profile.display_name]));
      }
      const unread = notificationItems.filter(item => !item.is_read).length;
      if (badge) { badge.textContent = unread > 99 ? "99+" : String(unread); badge.hidden = unread === 0; }
      if (list) list.innerHTML = notificationItems.length ? notificationItems.map(item => {
        const name = names.get(item.actor_id) || "Anggota KOMSI";
        const target = item.notification_type === "follow" ? "" : String(item.artwork_id || "");
        return '<button type="button" class="notification-item ' + (item.is_read ? "" : "unread") + '" data-notification-id="' + item.id + '" data-notification-artwork="' + escapeHtml(target) + '">' +
          '<span class="notification-avatar">' + escapeHtml((name.trim().charAt(0) || "K").toUpperCase()) + '</span>' +
          '<span class="notification-copy"><strong>' + escapeHtml(notificationLabel(item, name)) + '</strong><small>' + escapeHtml(prettyDate(item.created_at)) + '</small></span>' +
          (item.is_read ? "" : '<i class="notification-unread-dot" aria-label="Belum dibaca"></i>') + '</button>';
      }).join("") : '<p class="notification-empty">Belum ada notifikasi. Aktivitas suka, komentar, dan pengikut baru akan muncul di sini.</p>';
    } catch (error) {
      if (list) list.innerHTML = '<p class="notification-empty">Notifikasi gagal dimuat: ' + escapeHtml(getErrorMessage(error)) + '</p>';
      console.warn("Notifikasi belum dapat dimuat:", error);
    }
  }

  async function openNotifications() {
    if (!currentUser) { alert("Masuk ke akun anggota untuk melihat notifikasi."); $("#adminDialog")?.showModal(); return; }
    await loadNotifications();
    $("#notificationDialog")?.showModal();
  }

  async function handleNotificationClick(button) {
    const id = Number(button.dataset.notificationId);
    const item = notificationItems.find(row => Number(row.id) === id);
    if (!item || !currentUser) return;
    if (!item.is_read) {
      const { error } = await supabase.from("member_notifications").update({ is_read: true }).eq("id", id).eq("recipient_id", currentUser.id);
      if (error) { console.warn("Status notifikasi belum berubah:", error.message); return; }
      item.is_read = true;
    }
    $("#notificationDialog")?.close();
    await loadNotifications();
    if (item.notification_type === "follow" && item.actor_id) openMemberProfile(item.actor_id);
    else if (item.artwork_id) openDetail(String(item.artwork_id));
  }

  async function loadSocialData() {
    if (!supabase) return;
    try {
      const [likes, comments] = await Promise.all([
        supabase.from("artwork_likes").select("artwork_id,user_id"),
        supabase.from("artwork_comments").select("artwork_id")
      ]);
      if (likes.error) throw likes.error;
      if (comments.error) throw comments.error;
      artworkLikeCounts = new Map(); likedArtworks = new Set(); artworkCommentCounts = new Map();
      (likes.data || []).forEach(row => {
        const id = String(row.artwork_id);
        artworkLikeCounts.set(id, (artworkLikeCounts.get(id) || 0) + 1);
        if (currentUser && row.user_id === currentUser.id) likedArtworks.add(id);
      });
      (comments.data || []).forEach(row => {
        const id = String(row.artwork_id);
        artworkCommentCounts.set(id, (artworkCommentCounts.get(id) || 0) + 1);
      });
      if (currentUser) {
        const follows = await supabase.from("member_follows").select("following_id").eq("follower_id", currentUser.id);
        if (!follows.error) followingMembers = new Set((follows.data || []).map(row => String(row.following_id)));
      }
      render();
    } catch (error) { console.warn("Data sosial belum termuat:", error.message); }
  }

  async function toggleArtworkLike(id) {
    if (!currentUser) { alert("Masuk ke akun anggota untuk menyukai karya."); return; }
    id = String(id);
    const wasLiked = likedArtworks.has(id);
    const request = wasLiked
      ? supabase.from("artwork_likes").delete().eq("user_id", currentUser.id).eq("artwork_id", Number(id))
      : supabase.from("artwork_likes").insert({ user_id: currentUser.id, artwork_id: Number(id) });
    const { error } = await request;
    if (error) { showDeleteMessage("Gagal memperbarui suka: " + getErrorMessage(error)); return; }
    wasLiked ? likedArtworks.delete(id) : likedArtworks.add(id);
    artworkLikeCounts.set(id, Math.max(0, Number(artworkLikeCounts.get(id) || 0) + (wasLiked ? -1 : 1)));
    render();
    if ($("#detailDialog")?.open) openDetail(id);
  }

  async function loadArtworkComments(id) {
    const panel = $("#artworkComments");
    if (!panel || !supabase) return;
    panel.innerHTML = '<p class="dashboard-empty">Memuat komentar…</p>';
    try {
      const result = await supabase.from("artwork_comments")
        .select("id,body,user_id,parent_comment_id,created_at")
        .eq("artwork_id", Number(id)).order("created_at", { ascending: ($("#commentSort")?.value || "newest") === "oldest" }).limit(200);
      if (result.error) throw result.error;
      const rows = result.data || [];
      const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
      let names = new Map();
      if (userIds.length) {
        const profiles = await supabase.from("member_profiles").select("user_id,display_name").in("user_id", userIds);
        if (!profiles.error) names = new Map((profiles.data || []).map(profile => [profile.user_id, profile.display_name || "Anggota KOMSI"]));
      }
      const replies = new Map();
      rows.filter(row => row.parent_comment_id).forEach(row => {
        const key = String(row.parent_comment_id);
        if (!replies.has(key)) replies.set(key, []);
        replies.get(key).push(row);
      });
      const renderOne = (row, isReply = false) => {
        const name = names.get(row.user_id) || "Anggota KOMSI";
        const own = currentUser?.id === row.user_id;
        return '<article class="art-comment ' + (isReply ? 'art-comment-reply' : '') + '"><div class="art-comment-content"><strong>' + escapeHtml(name) + '</strong><p>' + escapeHtml(row.body) + '</p><time>' + escapeHtml(prettyDate(row.created_at)) + '</time>' +
          (!isReply && currentUser ? '<button type="button" class="text-button" data-reply-toggle="' + row.id + '">Balas</button>' : '') +
          (own ? '<button type="button" class="text-button" data-comment-edit-toggle="' + row.id + '">Edit</button><button type="button" class="text-button" data-delete-comment="' + row.id + '">Hapus</button>' : '') +
          (own ? '<form class="art-comment-edit-form" data-comment-edit-form="' + row.id + '" data-comment-artwork-id="' + Number(id) + '" hidden><textarea rows="2" maxlength="1000" required>' + escapeHtml(row.body) + '</textarea><div><button type="submit">Simpan perubahan</button><button type="button" class="text-button" data-comment-edit-cancel="' + row.id + '">Batal</button></div></form>' : '') +
          (!isReply && currentUser ? '<form class="art-reply-form" data-reply-form="' + row.id + '" data-reply-artwork="' + Number(id) + '" hidden><textarea rows="2" maxlength="1000" placeholder="Tulis balasan..."></textarea><button type="submit">Kirim balasan</button></form>' : '') +
          '</div></article>';
      };
      panel.innerHTML = rows.filter(row => !row.parent_comment_id).map(row =>
        renderOne(row) + (replies.get(String(row.id)) || []).map(reply => renderOne(reply, true)).join("")
      ).join("") || '<p class="dashboard-empty">Belum ada komentar. Jadilah yang pertama.</p>';
    } catch (error) { panel.textContent = "Komentar gagal dimuat: " + getErrorMessage(error); }
  }

  async function submitArtworkComment(event) {
    event.preventDefault();
    if (!currentUser) { alert("Masuk untuk berkomentar."); return; }
    const form = event.target?.closest?.("#detailCommentForm, [data-reply-form]");
    const isReply = Boolean(form?.matches?.("[data-reply-form]"));
    const rawId = isReply ? form?.dataset?.replyArtwork : form?.dataset?.commentArtwork;
    const id = Number(rawId);
    const parentId = isReply ? Number(form?.dataset?.replyForm) : null;
    const input = form?.querySelector("textarea");
    const body = input?.value?.trim();
    if (!form || !rawId || !Number.isSafeInteger(id) || id <= 0 ||
        (isReply && (!Number.isSafeInteger(parentId) || parentId <= 0))) {
      showDeleteMessage("Komentar tidak dapat dikirim karena ID karya atau komentar tidak terbaca. Buka kembali detail karya.");
      return;
    }
    if (!body) return;
    const payload = { artwork_id: id, user_id: currentUser.id, body };
    if (isReply) payload.parent_comment_id = parentId;
    const { error } = await supabase.from("artwork_comments").insert(payload);
    if (error) { showDeleteMessage((isReply ? "Balasan" : "Komentar") + " gagal dikirim: " + getErrorMessage(error)); return; }
    artworkCommentCounts.set(String(id), Number(artworkCommentCounts.get(String(id)) || 0) + 1);
    input.value = "";
    await loadArtworkComments(id);
    render();
  }

  async function saveArtworkCommentEdit(event) {
    event.preventDefault();
    if (!currentUser) return;
    const form = event.target?.closest?.("[data-comment-edit-form]");
    const commentId = Number(form?.dataset?.commentEditForm);
    const artworkId = Number(form?.dataset?.commentArtworkId);
    const body = form?.querySelector("textarea")?.value?.trim();
    if (!form || !Number.isSafeInteger(commentId) || commentId <= 0 ||
        !Number.isSafeInteger(artworkId) || artworkId <= 0 || !body) return;
    const { error } = await supabase.from("artwork_comments")
      .update({ body }).eq("id", commentId).eq("user_id", currentUser.id);
    if (error) { showDeleteMessage("Komentar gagal diperbarui: " + getErrorMessage(error)); return; }
    await loadArtworkComments(artworkId);
  }

  async function deleteArtworkComment(id) {
    if (!currentUser || !confirm("Hapus komentar ini?")) return;
    const form = $("#detailCommentForm"), artworkId = form?.dataset.commentArtwork;
    const { error } = await supabase.from("artwork_comments").delete().eq("id", Number(id)).eq("user_id", currentUser.id);
    if (error) { showDeleteMessage("Komentar gagal dihapus: " + getErrorMessage(error)); return; }
    if (artworkId) {
      artworkCommentCounts.set(String(artworkId), Math.max(0, Number(artworkCommentCounts.get(String(artworkId)) || 0) - 1));
      await loadArtworkComments(artworkId); render();
    }
  }

  async function toggleMemberFollow(profileId) {
    if (!currentUser) { alert("Masuk untuk mengikuti kreator."); return; }
    if (currentUser.id === profileId) return;
    const wasFollowing = followingMembers.has(String(profileId));
    const request = wasFollowing
      ? supabase.from("member_follows").delete().eq("follower_id", currentUser.id).eq("following_id", profileId)
      : supabase.from("member_follows").insert({ follower_id: currentUser.id, following_id: profileId });
    const { error } = await request;
    if (error) { showDeleteMessage("Gagal memperbarui mengikuti: " + getErrorMessage(error)); return; }
    wasFollowing ? followingMembers.delete(String(profileId)) : followingMembers.add(String(profileId));
    openMemberProfile(profileId, { countVisit: false, updateUrl: false });
  }

  async function loadMemberFavorites() {
    if (!supabase || !currentUser) return;
    const { data, error } = await supabase.from("artwork_favorites").select("artwork_id").eq("user_id", currentUser.id);
    if (error) { favorites = new Set(); render(); console.warn("Favorit akun belum dapat dimuat:", error.message); return; }
    favorites = new Set((data || []).map(row => String(row.artwork_id)));
    render();
  }

  async function toggleFavorite(id) {
    id = String(id);
    const wasSaved = favorites.has(id);
    wasSaved ? favorites.delete(id) : favorites.add(id);
    if (!currentUser) {
      try { localStorage.setItem("komsi-rupa-favorites", JSON.stringify([...favorites])); } catch (_) {}
    }
    render();
    if (supabase && currentUser && /^\d+$/.test(id)) {
      try {
        const request = wasSaved
          ? supabase.from("artwork_favorites").delete().eq("user_id", currentUser.id).eq("artwork_id", Number(id))
          : supabase.from("artwork_favorites").insert({ user_id: currentUser.id, artwork_id: Number(id) });
        const { error } = await request;
        if (error) throw error;
      } catch (error) {
        wasSaved ? favorites.add(id) : favorites.delete(id);
        if (!currentUser) {
          try { localStorage.setItem("komsi-rupa-favorites", JSON.stringify([...favorites])); } catch (_) {}
        }
        render();
        showDeleteMessage("Favorit belum tersinkron: " + getErrorMessage(error));
      }
    }
  }

  async function showMemberSession(user) {
    currentUser = user;
    $("#uploadPanel").hidden = false;
    $("#loginForm").hidden = true;
    $("#signupForm").hidden = true;
    const [profile] = await Promise.all([
      supabase.from("member_profiles").select("display_name,bio,avatar_url").eq("user_id", user.id).maybeSingle(),
      loadMemberFavorites(),
      loadSocialData()
    ]);
    if (profile.error) throw profile.error;
    currentProfile = profile.data || { display_name: user.user_metadata?.display_name || "", bio: "", avatar_url: "" };
    $("#profileDisplayName").value = currentProfile.display_name || "";
    $("#profileBio").value = currentProfile.bio || "";
    $("#memberGreeting").textContent = currentProfile.display_name || "Akun anggota";
    renderMemberAvatar(currentProfile.avatar_url, currentProfile.display_name);
    $("#memberEmailLabel").textContent = user.email || "";
    if ($("#artCreator") && !$("#artCreator").value) $("#artCreator").value = currentProfile.display_name || "";
    refreshAdminStats();
    refreshOwnProfileVisits();
    loadNotifications();
  }

  async function registerMember(event) {
    event.preventDefault();
    const message = $("#signupMessage"), button = $("#signupForm button[type='submit']");
    button.disabled = true;
    try {
      const display_name = $("#memberName").value.trim();
      const { data, error } = await supabase.auth.signUp({
        email: $("#memberEmail").value.trim(),
        password: $("#memberPassword").value,
        options: { data: { display_name }, emailRedirectTo: window.location.origin + window.location.pathname }
      });
      if (error) throw error;
      if (data.session && data.user) {
        await showMemberSession(data.user);
        message.textContent = "Akun berhasil dibuat. Selamat bergabung!";
      } else {
        message.textContent = "Pendaftaran diterima. Cek email untuk konfirmasi, lalu masuk.";
        message.style.color = "#4e7812";
        $("#signupForm").hidden = true;
        $("#loginForm").hidden = false;
        $("#adminEmail").value = $("#memberEmail").value.trim();
        showMessage("Pendaftaran diterima. Silakan cek email untuk konfirmasi sebelum masuk.", true);
      }
    } catch (error) { message.textContent = "Pendaftaran gagal: " + getErrorMessage(error); }
    finally { button.disabled = false; }
  }

  function renderMemberAvatar(url, displayName = "") {
    const image = $("#memberAvatarPreview");
    const fallback = $("#memberAvatarFallback");
    if (!image || !fallback) return;
    if (url) {
      image.src = url;
      image.hidden = false;
      fallback.hidden = true;
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      fallback.textContent = (displayName.trim().charAt(0) || "K").toUpperCase();
      fallback.hidden = false;
    }
  }

  async function saveMemberProfile(event) {
    event.preventDefault();
    if (!supabase || !currentUser) { $("#profileMessage").textContent = "Sesi akun berakhir. Silakan masuk kembali."; return; }
    const display_name = $("#profileDisplayName").value.trim();
    const bio = $("#profileBio").value.trim();
    const message = $("#profileMessage");
    const button = $("#profileForm button[type='submit']");
    const avatarFile = $("#profileAvatarFile")?.files?.[0];
    let uploadedPath = "";
    if (avatarFile && (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type) || avatarFile.size > 3 * 1024 * 1024)) {
      message.textContent = "Foto harus JPG, PNG, atau WebP dan berukuran maksimal 3 MB.";
      message.style.color = "#a04b38";
      return;
    }
    if (button) { button.disabled = true; button.textContent = "Menyimpan…"; }
    try {
      let avatar_url = currentProfile?.avatar_url || "";
      if (avatarFile) {
        const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[avatarFile.type];
        uploadedPath = `${currentUser.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(uploadedPath, avatarFile, { cacheControl: "3600", upsert: false, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadedPath);
        avatar_url = publicData.publicUrl;
      }
      const { error } = await supabase.from("member_profiles").upsert({ user_id: currentUser.id, display_name, bio, avatar_url, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      const previousAvatar = currentProfile?.avatar_url || "";
      currentProfile = { display_name, bio, avatar_url };
      $("#memberGreeting").textContent = display_name || "Akun anggota";
      renderMemberAvatar(avatar_url, display_name);
      $("#artCreator").value = display_name;
      $("#profileAvatarFile").value = "";
      if (selectedAvatarPreviewUrl) URL.revokeObjectURL(selectedAvatarPreviewUrl);
      selectedAvatarPreviewUrl = "";
      message.textContent = "Profil berhasil disimpan.";
      message.style.color = "#4e7812";
      if (uploadedPath && previousAvatar.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`)) {
        const oldPath = decodeURIComponent(previousAvatar.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`)[1].split("?")[0]);
        if (oldPath.startsWith(`${currentUser.id}/`) && oldPath !== uploadedPath) {
          const { error: removeError } = await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
          if (removeError) console.warn("Foto profil lama belum terhapus:", removeError.message);
        }
      }
    } catch (error) {
      if (uploadedPath) await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]).catch(() => {});
      message.textContent = "Gagal menyimpan profil: " + getErrorMessage(error);
      message.style.color = "#a04b38";
    } finally {
      if (button) { button.disabled = false; button.textContent = "Simpan profil"; }
    }
  }

  function getProfileVisitorId() {
    const key = "komsi-rupa-profile-visitor";
    try { let id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id; }
    catch (_) { return crypto.randomUUID(); }
  }
  async function refreshOwnProfileVisits() {
    if (!currentUser || !supabase) return;
    const target = $("#myProfileVisitCount"); if (!target) return;
    try { const { data, error } = await supabase.rpc("get_member_profile_visit_count", { p_profile_user_id: currentUser.id }); if (error) throw error; target.textContent = Number(data || 0).toLocaleString("id-ID"); }
    catch (error) { target.textContent = "—"; console.warn("Jumlah kunjungan profil belum dapat dimuat:", error.message); }
  }
  async function openMemberProfile(profileId, options = {}) {
    if (!supabase || !profileId) return;
    const dialog = $("#profileDialog"), content = $("#publicProfileContent");
    if (!dialog || !content) return;
    const countVisit = options.countVisit !== false, updateUrl = options.updateUrl !== false;
    activePublicProfileId = String(profileId);
    content.innerHTML = '<p class="dashboard-empty">Memuat profil anggota…</p>';
    if (!dialog.open) dialog.showModal();
    if (updateUrl) { const url = new URL(window.location.href); url.searchParams.set("profil", profileId); history.replaceState({}, "", url); }
    try {
      const results = await Promise.all([
        supabase.from("member_profiles").select("user_id,display_name,bio,avatar_url").eq("user_id", profileId).maybeSingle(),
        supabase.from("artworks").select("id,title,category,creator,preview_url,image_url,file_url,file_name,view_count,created_at,created_by").eq("created_by", profileId).order("created_at", { ascending: false })
      ]);
      if (results[0].error) throw results[0].error;
      if (results[1].error) throw results[1].error;
      const profile = results[0].data, works = results[1].data || [];
      if (!profile) { content.innerHTML = '<p class="dashboard-empty">Profil anggota tidak ditemukan.</p>'; return; }
      if (countVisit && currentUser?.id !== profileId) {
        const visit = await supabase.from("member_profile_visits").insert({ profile_user_id: profileId, visitor_id: getProfileVisitorId() });
        if (visit.error && visit.error.code !== "23505") console.warn("Kunjungan profil belum tercatat:", visit.error.message);
      }
      const count = await supabase.rpc("get_member_profile_visit_count", { p_profile_user_id: profileId });
      if (count.error) console.warn("Jumlah kunjungan profil tidak tersedia:", count.error.message);
      const followers = await supabase.from("member_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileId);
      const followerTotal = Number(followers.count || 0);
      const followButton = currentUser?.id === profileId ? "" : '<button type="button" class="profile-follow-button" data-follow-member="' + escapeHtml(profileId) + '">' + (followingMembers.has(String(profileId)) ? "Mengikuti" : "Ikuti") + '</button>';
      const name = profile.display_name || "Anggota KOMSI";
      const initial = escapeHtml(name.trim().charAt(0).toUpperCase() || "K");
      const workCards = works.length ? works.map(item => {
        const thumb = item.preview_url || item.image_url || item.file_url;
        const image = thumb && !isVideo(item) ? '<img src="' + escapeHtml(thumb) + '" alt="' + escapeHtml(item.title || "Karya anggota") + '" loading="lazy">' : '<span>' + (isVideo(item) ? "▶ VIDEO" : "KOMSI") + '</span>';
        return '<button type="button" class="public-profile-work" data-profile-work="' + escapeHtml(item.id) + '"><span class="public-profile-work-image">' + image + '</span><strong>' + escapeHtml(item.title || "Tanpa judul") + '</strong><small>' + escapeHtml(item.category || "Visual") + ' · ' + Number(item.view_count || 0).toLocaleString("id-ID") + ' dilihat</small></button>';
      }).join("") : '<p class="dashboard-empty">Anggota ini belum mengunggah karya.</p>';
      const shareUrl = new URL(window.location.href); shareUrl.searchParams.set("profil", profileId);
      content.innerHTML = '<section class="public-profile-card"><div class="public-profile-identity">' + (profile.avatar_url ? '<img src="' + escapeHtml(profile.avatar_url) + '" alt="Foto ' + escapeHtml(name) + '">' : '<span>' + initial + '</span>') + '<div><p class="section-kicker">PROFIL ANGGOTA KOMSI</p><h2>' + escapeHtml(name) + '</h2><p>' + escapeHtml(profile.bio || "Belum ada bio.") + '</p></div></div><div class="public-profile-metrics"><div><strong>' + works.length.toLocaleString("id-ID") + '</strong><span>Karya</span></div><div><strong>' + followerTotal.toLocaleString("id-ID") + '</strong><span>Pengikut</span></div><div><strong>' + Number(count.data || 0).toLocaleString("id-ID") + '</strong><span>Kunjungan profil</span></div></div><div class="public-profile-heading"><h3>Portofolio karya</h3>' + followButton + '<button type="button" class="text-button" id="shareMemberProfile">Bagikan profil ↗</button></div>' + (works.length ? '<div class="public-profile-works">' + workCards + '</div>' : workCards) + '</section>';
      $("#shareMemberProfile")?.addEventListener("click", async () => {
        try { if (navigator.share) await navigator.share({ title: "Profil " + name + " — KOMSI RUPA LIBRARY", url: shareUrl.toString() }); else { await navigator.clipboard.writeText(shareUrl.toString()); const button = $("#shareMemberProfile"); if (button) button.textContent = "Link tersalin ✓"; } }
        catch (error) { if (error?.name !== "AbortError") console.warn("Link profil tidak dapat dibagikan:", error); }
      });
      if (currentUser?.id === profileId) refreshOwnProfileVisits();
    } catch (error) { content.innerHTML = '<p class="dashboard-error">Profil gagal dimuat: ' + escapeHtml(getErrorMessage(error)) + '</p>'; }
  }

  function openDetail(id) {
    const a = artworks.find(x => String(x.id) === String(id));
    if (!a) return;
    const deleteMessage = $("#detailMessage");
    if (deleteMessage) {
      deleteMessage.textContent = "";
      deleteMessage.hidden = true;
    }
    const preview = a.preview_url || a.image_url || a.file_url;
    const media = preview
      ? (isVideo(a) && !a.preview_url ? `<div class="video-placeholder">▶ Video</div>` : isVideo(a) ? `<video src="${escapeHtml(a.file_url)}" controls playsinline></video>` : `<img src="${escapeHtml(preview)}" alt="${escapeHtml(a.title)}">`)
      : `<div class="video-placeholder">Preview belum tersedia</div>`;
    const creatorButton = a.created_by ? `<button type="button" class="creator-filter-button" data-member-profile="${escapeHtml(a.created_by)}">${escapeHtml(a.creator || "Lihat profil kreator")} ↗</button>` : `<button type="button" class="creator-filter-button" data-creator-filter="${escapeHtml(a.creator || "KOMSI Library")}">${escapeHtml(a.creator || "Tidak dicantumkan")}</button>`;
    const liked = likedArtworks.has(String(a.id));
    $("#detailContent").innerHTML = `<div class="detail-layout"><div class="detail-preview">${media}</div><div class="detail-info"><p class="eyebrow">${escapeHtml(a.category || "VISUAL")} · ${escapeHtml(prettyDate(a.created_at))}</p><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.description || "Tidak ada deskripsi untuk karya ini.")}</p><p>Kreator: ${creatorButton}</p>${Array.isArray(a.tags) && a.tags.length ? `<p class="detail-tags">Tag: ${a.tags.map(tag => `#${escapeHtml(tag)}`).join(" ")}</p>` : ""}<p class="detail-view-count">Dilihat ${Number(a.view_count || 0).toLocaleString("id-ID")} kali</p><p>File: ${escapeHtml(a.file_name || "File karya")}${a.file_size ? ` · ${bytesLabel(a.file_size)}` : ""}</p><div class="detail-actions"><button class="secondary-button ${liked ? "liked" : ""}" data-detail-like="${escapeHtml(a.id)}" type="button">${liked ? "♥ Disukai" : "♡ Suka"} · ${Number(artworkLikeCounts.get(String(a.id)) || 0)}</button>${a.file_url ? `<a class="primary-button" href="${escapeHtml(a.file_url)}" target="_blank" rel="noopener" download>Unduh karya ↓</a>` : `<button class="primary-button" disabled>File tidak tersedia</button>`}<button class="secondary-button" data-detail-favorite="${escapeHtml(a.id)}">${favorites.has(String(a.id)) ? "♥ Tersimpan" : "♡ Simpan favorit"}</button><button class="secondary-button" data-share-artwork="${escapeHtml(a.id)}" type="button">Bagikan ↗</button>${currentUser && !a.is_demo && (a.created_by === currentUser.id || currentUser.id === ADMIN_USER_ID) ? `<button class="secondary-button" data-edit-artwork="${escapeHtml(a.id)}" type="button">Edit karya</button><button class="delete-button" data-delete-artwork="${escapeHtml(a.id)}" type="button">Hapus karya</button>` : ""}</div><section class="art-comments-section"><div class="art-comments-heading"><h3>Diskusi karya</h3><label class="comment-sort-label"><span>Urutkan</span><select id="commentSort" aria-label="Urutkan komentar"><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select></label></div><div id="artworkComments"><p class="dashboard-empty">Memuat komentar…</p></div><form id="detailCommentForm" data-comment-artwork="${escapeHtml(a.id)}" class="art-comment-form"><textarea rows="2" maxlength="1000" placeholder="${currentUser ? "Tulis komentar..." : "Masuk untuk berkomentar"}" ${currentUser ? "" : "disabled"}></textarea><button type="submit" ${currentUser ? "" : "disabled"}>Kirim</button></form></section></div></div></div>`;
    $("#detailDialog")?.showModal();
    loadArtworkComments(a.id);
    if (!a.is_demo) recordArtworkView(a.id);
  }

  function getErrorMessage(error) {
    const message = error?.message || String(error || "Kesalahan tidak diketahui.");
    if (/invalid login credentials/i.test(message)) return "Email atau password salah. Periksa akun di Supabase Authentication → Users.";
    if (/email not confirmed/i.test(message)) return "Email belum dikonfirmasi. Konfirmasi email akun di Supabase atau atur konfigurasi konfirmasi email.";
    if (/failed to fetch|networkerror|fetch failed/i.test(message)) return "Tidak dapat menghubungi Supabase. Periksa koneksi internet, URL project, dan pengaturan jaringan.";
    return message;
  }

  async function withTimeout(promise, ms, label) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })
      ]);
    } finally { clearTimeout(timer); }
  }

  async function loginAdmin(event) {
    event.preventDefault();
    const button = $('#loginForm button[type="submit"]');
    if (!supabase) {
      showMessage("Supabase belum termuat. Muat ulang halaman; jika tetap sama, periksa CDN dan konfigurasi app.js.");
      return;
    }
    if (button) { button.disabled = true; button.textContent = "Memeriksa login…"; }
    showMessage("Menghubungkan ke Supabase…");
    try {
      const email = $("#adminEmail").value.trim();
      const password = $("#adminPassword").value;
      const result = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        "Waktu koneksi habis setelah 15 detik. Periksa koneksi internet dan URL Supabase."
      );
      if (result.error) throw result.error;
      await showMemberSession(result.data.user);
      showMessage("Berhasil masuk. Selamat datang di KOMSI RUPA LIBRARY.", true);
    } catch (error) {
      console.error("Login admin gagal:", error);
      showMessage("Login gagal: " + getErrorMessage(error));
    } finally {
      if (button) { button.disabled = false; button.textContent = "Masuk"; }
    }
  }

  async function uploadArtwork(event) {
    event.preventDefault();
    if (!supabase || !currentUser) { showMessage("Silakan masuk ke akun anggota terlebih dahulu."); return; }
    const file = $("#artFile")?.files?.[0];
    const previewFile = $("#artPreviewFile")?.files?.[0];
    if (!file) { showMessage("Pilih file karya terlebih dahulu."); return; }
    if (file.size > MAX_FILE_SIZE) { showMessage("Ukuran file melebihi 50 MB. Kompres file terlebih dahulu."); return; }

    const submit = $('#uploadForm button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = "Mengunggah…"; }
    let uploadedPath = null;
    let previewPath = null;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      uploadedPath = `${currentUser.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(uploadedPath, file, {
        upsert: false, contentType: file.type || "application/octet-stream"
      });
      if (uploadError) throw uploadError;
      const fileUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
      let previewUrl = file.type.startsWith("image/") ? fileUrl : null;

      if (previewFile) {
        const previewName = previewFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        previewPath = `${currentUser.id}/preview-${Date.now()}-${previewName}`;
        const { error: previewError } = await supabase.storage.from(STORAGE_BUCKET).upload(previewPath, previewFile, {
          upsert: false, contentType: previewFile.type || "application/octet-stream"
        });
        if (previewError) throw previewError;
        previewUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(previewPath).data.publicUrl;
      }

      /* Kolom ini sudah diverifikasi terhadap skema public.artworks:
         title, description, category, creator, tags, image_url, preview_url,
         file_url, file_name, file_size, dan created_by. */
      const tags = ($("#artTags")?.value || "").split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 20);
      const record = {
        title: $("#artTitle").value.trim(),
        description: $("#artDescription").value.trim(),
        category: $("#artCategory").value,
        creator: $("#artCreator")?.value.trim() || "",
        tags,
        image_url: previewUrl || fileUrl,
        preview_url: previewUrl,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        created_by: currentUser.id,
        uploaded_by: currentUser.id
      };
      const { error: insertError } = await supabase.from(TABLE).insert(record);
      if (insertError) {
        // Bersihkan file Storage jika insert database gagal.
        const cleanup = [uploadedPath, previewPath].filter(Boolean);
        if (cleanup.length) await supabase.storage.from(STORAGE_BUCKET).remove(cleanup);
        throw insertError;
      }

      showMessage("Karya berhasil diunggah ke library.", true);
      $("#uploadForm").reset();
      await loadArtworks();
      refreshAdminStats();
    } catch (error) {
      console.error("Upload karya gagal:", error);
      showMessage("Gagal mengunggah: " + getErrorMessage(error) + " Periksa kebijakan Storage, izin tabel artworks, dan nama bucket.");
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = "Unggah karya"; }
    }
  }

  function storagePathFromPublicUrl(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
      const index = parsed.pathname.indexOf(marker);
      if (index === -1) return null;
      return decodeURIComponent(parsed.pathname.slice(index + marker.length));
    } catch (_) { return null; }
  }

  function openArtworkEditor(id) {
    const artwork = artworks.find(item => String(item.id) === String(id));
    if (!artwork || artwork.is_demo || !currentUser) return;
    const isOwner = artwork.created_by === currentUser.id;
    if (!isOwner && currentUser.id !== ADMIN_USER_ID) {
      showDeleteMessage("Kamu hanya dapat mengedit karya yang kamu unggah.");
      return;
    }
    const oldForm = $("#artworkEditForm");
    if (oldForm) oldForm.remove();
    const form = document.createElement("form");
    form.id = "artworkEditForm";
    form.className = "profile-form artwork-edit-form";
    const currentPreview = artwork.preview_url || artwork.image_url || artwork.file_url;
    const currentMedia = currentPreview
      ? (isVideo(artwork) && !artwork.preview_url
          ? '<div class="edit-preview-placeholder">▶ VIDEO</div>'
          : `<img src="${escapeHtml(currentPreview)}" alt="Pratinjau karya saat ini">`)
      : '<div class="edit-preview-placeholder">PREVIEW BELUM ADA</div>';
    form.innerHTML = `
      <div class="edit-form-heading"><p class="section-kicker">PENGELOLAAN KARYA</p><h3 class="member-section-title">Edit karya</h3><p class="member-form-intro">Perbarui informasi atau ganti berkas karya yang sudah kamu unggah.</p></div>
      <div class="edit-current-preview">${currentMedia}<span>Pratinjau saat ini</span></div>
      <label for="editArtTitle">Judul karya</label>
      <input id="editArtTitle" name="title" maxlength="160" required value="${escapeHtml(artwork.title || "")}">
      <label for="editArtCategory">Kategori</label>
      <select id="editArtCategory" name="category">
        ${["Desain","Ilustrasi","Fotografi","Artwork","Video"].map(v => `<option value="${v}" ${artwork.category === v ? "selected" : ""}>${v}</option>`).join("")}
      </select>
      <label for="editArtCreator">Nama kreator</label>
      <input id="editArtCreator" name="creator" maxlength="120" required value="${escapeHtml(artwork.creator || "")}">
      <label for="editArtTags">Tag (pisahkan dengan koma)</label>
      <input id="editArtTags" name="tags" value="${escapeHtml(Array.isArray(artwork.tags) ? artwork.tags.join(", ") : (artwork.tags || ""))}">
      <label for="editArtDescription">Deskripsi</label>
      <textarea id="editArtDescription" name="description" rows="3" maxlength="3000">${escapeHtml(artwork.description || "")}</textarea>
      <label for="editArtFile">Ganti file karya (opsional, maksimal 50 MB)</label>
      <input id="editArtFile" name="file" type="file" accept="image/*,video/*">
      <label for="editArtPreview">Ganti gambar pratinjau (opsional)</label>
      <input id="editArtPreview" name="preview" type="file" accept="image/*">
      <p class="form-message" id="editArtworkMessage" role="status"></p>
      <button type="submit" class="primary-button">Simpan perubahan</button>
      <button type="button" class="text-button" id="cancelArtworkEdit">Batal</button>`;
    $("#detailContent").appendChild(form);
    $("#cancelArtworkEdit").addEventListener("click", () => form.remove());
    form.addEventListener("submit", saveArtworkEdits);
    form.dataset.artworkId = String(id);
    form.scrollIntoView({behavior:"smooth", block:"nearest"});
  }

  async function saveArtworkEdits(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.dataset.artworkId;
    const artwork = artworks.find(item => String(item.id) === String(id));
    const message = $("#editArtworkMessage");
    const submit = form.querySelector('button[type="submit"]');
    if (!artwork || !currentUser || (artwork.created_by !== currentUser.id && currentUser.id !== ADMIN_USER_ID)) {
      message.textContent = "Akses ditolak. Kamu hanya dapat mengubah karya milikmu.";
      return;
    }
    const file = $("#editArtFile").files[0];
    const previewFile = $("#editArtPreview").files[0];
    if (file && file.size > MAX_FILE_SIZE) { message.textContent = "Ukuran file melebihi 50 MB."; return; }
    if (previewFile && previewFile.size > MAX_FILE_SIZE) { message.textContent = "Ukuran gambar pratinjau melebihi 50 MB."; return; }

    submit.disabled = true;
    submit.textContent = "Menyimpan…";
    const newPaths = [];
    try {
      let fileUrl = artwork.file_url || "";
      let previewUrl = artwork.preview_url || artwork.image_url || "";
      let fileName = artwork.file_name || "";
      let fileSize = Number(artwork.file_size || 0);

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${currentUser.id}/edit-${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
          upsert:false, contentType:file.type || "application/octet-stream"
        });
        if (error) throw error;
        newPaths.push(path);
        fileUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
        fileName = file.name;
        fileSize = file.size;
        if (file.type.startsWith("image/")) previewUrl = fileUrl;
        else if (!artwork.preview_url) previewUrl = "";
      }

      if (previewFile) {
        const safePreviewName = previewFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${currentUser.id}/edit-preview-${Date.now()}-${safePreviewName}`;
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, previewFile, {
          upsert:false, contentType:previewFile.type || "image/*"
        });
        if (error) throw error;
        newPaths.push(path);
        previewUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const record = {
        title: $("#editArtTitle").value.trim(),
        category: $("#editArtCategory").value,
        creator: $("#editArtCreator").value.trim(),
        tags: $("#editArtTags").value.split(",").map(tag => tag.trim()).filter(Boolean).slice(0,20),
        description: $("#editArtDescription").value.trim(),
        file_url: fileUrl,
        image_url: previewUrl || fileUrl,
        preview_url: previewUrl || null,
        file_name: fileName,
        file_size: fileSize
      };
      let query = supabase.from(TABLE).update(record).eq("id", id);
      if (currentUser.id !== ADMIN_USER_ID) query = query.eq("created_by", currentUser.id);
      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Perubahan tidak tersimpan. Karya bukan milik akun ini atau akses database ditolak.");

      const oldPaths = [...new Set([artwork.file_url, artwork.image_url, artwork.preview_url]
        .map(storagePathFromPublicUrl).filter(Boolean))];
      const newPathSet = new Set(newPaths);
      const obsoletePaths = oldPaths.filter(path => !newPathSet.has(path) &&
        path !== storagePathFromPublicUrl(fileUrl) &&
        path !== storagePathFromPublicUrl(previewUrl));
      if (obsoletePaths.length) {
        const { error: cleanupError } = await supabase.storage.from(STORAGE_BUCKET).remove(obsoletePaths);
        if (cleanupError) console.warn("Metadata tersimpan, tetapi file lama belum dibersihkan:", cleanupError);
      }
      message.textContent = "Karya berhasil diperbarui.";
      message.style.color = "#4e7812";
      await loadArtworks();
      refreshAdminStats();
      openDetail(id);
    } catch (error) {
      if (newPaths.length) {
        const { error: cleanupError } = await supabase.storage.from(STORAGE_BUCKET).remove(newPaths);
        if (cleanupError) console.warn("File unggahan sementara gagal dibersihkan:", cleanupError);
      }
      message.textContent = "Gagal menyimpan perubahan: " + getErrorMessage(error);
      console.error("Edit karya gagal:", error);
    } finally {
      submit.disabled = false;
      submit.textContent = "Simpan perubahan";
    }
  }

  async function deleteArtwork(id) {
    if (!supabase || !currentUser) {
      showDeleteMessage("Masuk ke akun anggota untuk menghapus karya milikmu.");
      return;
    }
    const artwork = artworks.find(item => String(item.id) === String(id));
    if (!artwork || artwork.is_demo) return;
    const confirmed = window.confirm(`Hapus karya “${artwork.title || "tanpa judul"}”? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    const button = document.querySelector(`[data-delete-artwork="${CSS.escape(String(id))}"]`);
    if (button) { button.disabled = true; button.textContent = "Menghapus…"; }
    try {
      // SELECT hanya memakai kolom inti yang diperlukan; preview_url tidak diwajibkan.
      const { data: rows, error: readError } = await supabase.from(TABLE)
        .select("id,image_url,preview_url,file_url")
        .eq("id", id).limit(1);
      if (readError) throw readError;
      if (!rows || rows.length === 0) {
        throw new Error("Karya tidak ditemukan atau tidak dapat dibaca oleh akun ini.");
      }

      // Minta representation agar RLS/no-op DELETE tidak dianggap berhasil.
      let deleteQuery = supabase.from(TABLE).delete().eq("id", id);
      if (currentUser.id !== ADMIN_USER_ID) deleteQuery = deleteQuery.eq("id", id).eq("created_by", currentUser.id);
      const { data: deletedRows, error: deleteError } = await deleteQuery.select("id");
      if (deleteError) throw deleteError;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("Tidak ada baris yang terhapus. Periksa policy DELETE tabel artworks dan akun admin.");
      }

      const row = rows[0];
      const paths = [...new Set([row.file_url, row.image_url, row.preview_url]
        .map(storagePathFromPublicUrl).filter(Boolean))];
      let storageWarning = "";
      if (paths.length) {
        try {
          const { data: removedFiles, error: storageError } =
            await supabase.storage.from(STORAGE_BUCKET).remove(paths);
          if (storageError) throw storageError;
          if (!Array.isArray(removedFiles) || removedFiles.length < paths.length) {
            storageWarning = " Data karya sudah terhapus, tetapi Storage tidak mengonfirmasi penghapusan semua file. Periksa bucket dan policy Storage.";
          }
        } catch (storageError) {
          console.error("Record terhapus tetapi file Storage gagal dibersihkan:", storageError);
          storageWarning = " Data karya sudah terhapus, tetapi file Storage belum berhasil dibersihkan. Periksa bucket dan policy Storage.";
        }
      }

      favorites.delete(String(id));
      try { localStorage.setItem("komsi-rupa-favorites", JSON.stringify([...favorites])); } catch (_) {}
      if (button) { button.disabled = true; button.textContent = "Terhapus"; }
      await loadArtworks();
      refreshAdminStats();
      showDeleteMessage("Karya berhasil dihapus dari katalog." + storageWarning, !storageWarning);
    } catch (error) {
      console.error("Hapus karya gagal:", error);
      showDeleteMessage("Gagal menghapus karya: " + getErrorMessage(error) + " Pastikan policy DELETE tabel artworks mengizinkan akun admin.");
      if (button) { button.disabled = false; button.textContent = "Hapus karya"; }
    }
  }
  async function updateMemberPassword(event) {
    event.preventDefault();
    const message = $("#securityMessage");
    const password = $("#newMemberPassword")?.value || "";
    const confirmation = $("#confirmMemberPassword")?.value || "";
    const button = $("#securityForm button[type='submit']");
    if (!supabase || !currentUser) {
      message.textContent = "Sesi akun berakhir. Silakan masuk kembali.";
      return;
    }
    if (password.length < 8) {
      message.textContent = "Kata sandi minimal 8 karakter.";
      return;
    }
    if (password !== confirmation) {
      message.textContent = "Konfirmasi kata sandi belum cocok.";
      return;
    }
    if (button) { button.disabled = true; button.textContent = "Memperbarui…"; }
    message.textContent = "";
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      $("#securityForm").reset();
      message.textContent = "Kata sandi berhasil diperbarui.";
      message.style.color = "#4e7812";
    } catch (error) {
      message.textContent = "Gagal memperbarui kata sandi: " + getErrorMessage(error);
      message.style.color = "#a04b38";
    } finally {
      if (button) { button.disabled = false; button.textContent = "Perbarui kata sandi"; }
    }
  }

  async function logoutAdmin() {
    try { if (supabase) await supabase.auth.signOut(); }
    catch (error) { console.error("Logout gagal:", error); }
    currentUser = null;
    currentProfile = null;
    notificationItems = [];
    loadNotifications();
    if ($("#uploadPanel")) $("#uploadPanel").hidden = true;
    if ($("#loginForm")) $("#loginForm").hidden = false;
    if ($("#signupForm")) $("#signupForm").hidden = true;
    favorites = new Set(JSON.parse(localStorage.getItem("komsi-rupa-favorites") || "[]"));
    render();
    showMessage("Kamu telah keluar.");
  }

  function init() {
    const required = ["#searchInput","#sortSelect","#categories","#artGrid","#notice","#adminDialog","#loginForm","#adminMessage"];
    const missing = required.filter(selector => !$(selector));
    if (missing.length) console.warn("Elemen HTML belum ditemukan:", missing.join(", "));

    if ($("#year")) $("#year").textContent = new Date().getFullYear();

    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
      } catch (error) {
        console.error("Inisialisasi Supabase gagal:", error);
      }
    } else {
      console.error("Supabase JS tidak tersedia pada window.supabase. Periksa CDN di index.html.");
    }

    $("#searchInput")?.addEventListener("input", render);
    $("#detailContent")?.addEventListener("change", event => { if (event.target?.id === "commentSort") { const artworkId = $("#detailCommentForm")?.dataset.commentArtwork; if (artworkId) loadArtworkComments(artworkId); } });
    $("#sortSelect")?.addEventListener("change", render);
    $("#categories")?.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      activeCategory = button.dataset.category;
      document.querySelectorAll("#categories [data-category]").forEach(el => {
        const active = el === button;
        el.classList.toggle("active", active);
        el.setAttribute("aria-pressed", String(active));
      });
      render();
    });
    $("#artGrid")?.addEventListener("click", event => {
      const profileButton = event.target.closest("[data-member-profile]");
      if (profileButton) { event.preventDefault(); event.stopPropagation(); openMemberProfile(profileButton.dataset.memberProfile); return; }
      const creatorButton = event.target.closest("[data-creator-filter]");
      if (creatorButton) { event.preventDefault(); event.stopPropagation(); filterByCreator(creatorButton.dataset.creatorFilter); return; }
      const favoriteButton = event.target.closest("[data-favorite]");
      if (favoriteButton) { event.stopPropagation(); toggleFavorite(favoriteButton.dataset.favorite); return; }
      const likeButton = event.target.closest("[data-like]");
      if (likeButton) { event.stopPropagation(); toggleArtworkLike(likeButton.dataset.like); return; }
      const card = event.target.closest("[data-open]");
      if (card) openDetail(card.dataset.open);
    });
    $("#memberPortfolio")?.addEventListener("click", event => {
      const editButton = event.target.closest("[data-member-edit]");
      if (editButton) {
        openDetail(editButton.dataset.memberEdit);
        openArtworkEditor(editButton.dataset.memberEdit);
        return;
      }
      const button = event.target.closest("[data-member-open]");
      if (button) openDetail(button.dataset.memberOpen);
    });
    $("#clearCreatorFilter")?.addEventListener("click", () => filterByCreator(""));
    $("#feedTabs")?.addEventListener("click", event => {
      const button = event.target.closest("[data-feed-mode]");
      if (!button) return;
      feedMode = button.dataset.feedMode;
      if (feedMode === "following" && !currentUser) {
        alert("Masuk ke akun anggota untuk melihat feed kreator yang kamu ikuti.");
        $("#adminDialog")?.showModal();
        feedMode = "all";
      }
      document.querySelectorAll("#feedTabs [data-feed-mode]").forEach(tab => {
        const active = tab.dataset.feedMode === feedMode;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", String(active));
      });
      if ($("#sortSelect")) $("#sortSelect").disabled = feedMode === "explore";
      render();
    });
    $("#favoritesToggle")?.addEventListener("click", () => {
      favoritesOnly = !favoritesOnly;
      $("#favoritesToggle").style.fontWeight = favoritesOnly ? "700" : "400";
      $("#favoritesToggle").setAttribute("aria-pressed", String(favoritesOnly));
      $("#favoritesToggle").innerHTML = `${favoritesOnly ? "♥" : "♡"} Favorit <span id="favoriteCount">${favorites.size}</span>`;
      $("#koleksi")?.scrollIntoView({ behavior: "smooth" });
      render();
    });
    $("#adminOpen")?.addEventListener("click", () => $("#adminDialog")?.showModal());
    $("#notificationOpen")?.addEventListener("click", openNotifications);
    window.addEventListener("focus", () => { if (currentUser) loadNotifications(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && currentUser) loadNotifications(); });
    $("#notificationList")?.addEventListener("click", event => { const item = event.target.closest("[data-notification-id]"); if (item) handleNotificationClick(item); });
    $("#markAllNotificationsRead")?.addEventListener("click", async () => {
      if (!currentUser || !supabase) return;
      const { error } = await supabase.from("member_notifications").update({ is_read: true }).eq("recipient_id", currentUser.id).eq("is_read", false);
      if (error) { alert("Notifikasi belum dapat ditandai dibaca: " + getErrorMessage(error)); return; }
      await loadNotifications();
    });
    $("#profileShareButton")?.addEventListener("click", async () => { if (!currentUser) return; const url = new URL(window.location.href); url.searchParams.set("profil", currentUser.id); try { await navigator.clipboard.writeText(url.toString()); $("#profileShareMessage").textContent = "Link profil berhasil disalin."; } catch (_) { $("#profileShareMessage").textContent = url.toString(); } });
    $("#submitInfo")?.addEventListener("click", () => $("#infoDialog")?.showModal());
    document.addEventListener("click", event => {
      const closeButton = event.target.closest("[data-close]");
      if (closeButton) $("#" + closeButton.dataset.close)?.close();
      const profileButton = event.target.closest("[data-member-profile]");
      if (profileButton) { event.preventDefault(); event.stopPropagation(); $("#detailDialog")?.close(); openMemberProfile(profileButton.dataset.memberProfile); return; }
      const profileWorkButton = event.target.closest("[data-profile-work]");
      if (profileWorkButton) { const workId = profileWorkButton.dataset.profileWork; $("#profileDialog")?.close(); openDetail(workId); return; }
      const creatorButton = event.target.closest("[data-creator-filter]");
      if (creatorButton && !$("#artGrid")?.contains(creatorButton)) { event.preventDefault(); event.stopPropagation(); $("#detailDialog")?.close(); filterByCreator(creatorButton.dataset.creatorFilter); return; }
      const followButton = event.target.closest("[data-follow-member]");
      if (followButton) { toggleMemberFollow(followButton.dataset.followMember); return; }
      const favoriteButton = event.target.closest("[data-detail-favorite]");
      if (favoriteButton) { toggleFavorite(favoriteButton.dataset.detailFavorite); openDetail(favoriteButton.dataset.detailFavorite); return; }
      const likeButton = event.target.closest("[data-detail-like]");
      if (likeButton) { toggleArtworkLike(likeButton.dataset.detailLike); return; }
      const replyToggle = event.target.closest("[data-reply-toggle]");
      if (replyToggle) {
        const replyForm = $("#artworkComments")?.querySelector('[data-reply-form="' + replyToggle.dataset.replyToggle + '"]');
        if (replyForm) { replyForm.hidden = !replyForm.hidden; if (!replyForm.hidden) replyForm.querySelector("textarea")?.focus(); }
        return;
      }
      const commentEditToggle = event.target.closest("[data-comment-edit-toggle]");
      if (commentEditToggle) {
        const editForm = $("#artworkComments")?.querySelector('[data-comment-edit-form="' + commentEditToggle.dataset.commentEditToggle + '"]');
        if (editForm) { editForm.hidden = !editForm.hidden; if (!editForm.hidden) { const area = editForm.querySelector("textarea"); area?.focus(); area?.setSelectionRange(area.value.length, area.value.length); } }
        return;
      }
      const commentEditCancel = event.target.closest("[data-comment-edit-cancel]");
      if (commentEditCancel) {
        const editForm = $("#artworkComments")?.querySelector('[data-comment-edit-form="' + commentEditCancel.dataset.commentEditCancel + '"]');
        if (editForm) editForm.hidden = true;
        return;
      }
      const deleteCommentButton = event.target.closest("[data-delete-comment]");
      if (deleteCommentButton) { deleteArtworkComment(deleteCommentButton.dataset.deleteComment); return; }
      const editButton = event.target.closest("[data-edit-artwork]");
      if (editButton) { event.preventDefault(); event.stopPropagation(); openArtworkEditor(editButton.dataset.editArtwork); return; }
      const deleteButton = event.target.closest("[data-delete-artwork]");
      if (deleteButton) { event.preventDefault(); event.stopPropagation(); deleteArtwork(deleteButton.dataset.deleteArtwork); return; }
      const shareButton = event.target.closest("[data-share-artwork]");
      if (shareButton) { event.preventDefault(); event.stopPropagation(); shareArtwork(shareButton.dataset.shareArtwork); }
    });
    $("#loginForm")?.addEventListener("submit", loginAdmin);
    $("#signupForm")?.addEventListener("submit", registerMember);
    $("#showSignup")?.addEventListener("click", () => { $("#loginForm").hidden = true; $("#signupForm").hidden = false; });
    $("#showLogin")?.addEventListener("click", () => { $("#signupForm").hidden = true; $("#loginForm").hidden = false; });
    $("#uploadForm")?.addEventListener("submit", uploadArtwork);
    $("#detailContent")?.addEventListener("submit", event => { if (event.target.matches("[data-comment-edit-form]")) saveArtworkCommentEdit(event); else if (event.target.matches("#detailCommentForm, [data-reply-form]")) submitArtworkComment(event); });
    $("#profileForm")?.addEventListener("submit", saveMemberProfile);
    $("#profileAvatarFile")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      const message = $("#profileMessage");
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
        event.target.value = "";
        if (selectedAvatarPreviewUrl) URL.revokeObjectURL(selectedAvatarPreviewUrl);
        selectedAvatarPreviewUrl = "";
        renderMemberAvatar(currentProfile?.avatar_url || "", currentProfile?.display_name || "");
        if (message) {
          message.textContent = "Foto harus JPG, PNG, atau WebP dan berukuran maksimal 3 MB.";
          message.style.color = "#a04b38";
        }
        return;
      }
      if (selectedAvatarPreviewUrl) URL.revokeObjectURL(selectedAvatarPreviewUrl);
      selectedAvatarPreviewUrl = URL.createObjectURL(file);
      renderMemberAvatar(selectedAvatarPreviewUrl, $("#profileDisplayName")?.value || currentProfile?.display_name || "");
      if (message) {
        message.textContent = "Foto dipilih. Tekan Simpan profil untuk menyimpan perubahan.";
        message.style.color = "#4e7812";
      }
    });
    $("#securityForm")?.addEventListener("submit", updateMemberPassword);
    $("#logoutButton")?.addEventListener("click", logoutAdmin);

    if (supabase) {
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) console.warn("Gagal memeriksa sesi:", error.message);
        if (data?.session) {
          showMemberSession(data.session.user).catch(error => console.warn("Profil anggota gagal dimuat:", error));
        }
      }).catch(error => console.warn("Pemeriksaan sesi gagal:", error));
    }

    loadArtworks().then(() => {
      loadSocialData();
      const params = new URLSearchParams(window.location.search);
      const sharedArtworkId = params.get("karya"), sharedProfileId = params.get("profil");
      if (sharedArtworkId) openDetail(sharedArtworkId);
      else if (sharedProfileId) openMemberProfile(sharedProfileId, { countVisit: true, updateUrl: false });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
