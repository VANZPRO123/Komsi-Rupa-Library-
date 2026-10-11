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
  let activeCategory = "Semua";
  let favoritesOnly = false;
  let currentUser = null;
  let favorites = new Set();
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

  function normalizeArtwork(row) {
    const preview = row.preview_url || row.image_url || row.file_url || "";
    return {
      ...row,
      creator: row.creator || row.created_by || "KOMSI Library",
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
      (activeCategory === "Semua" || a.category === activeCategory) &&
      (!favoritesOnly || favorites.has(String(a.id))) &&
      (!query || [a.title, a.category, a.creator, a.description, a.tags].join(" ").toLowerCase().includes(query))
    );
    if (sort === "az") result.sort((a,b) => (a.title || "").localeCompare(b.title || ""));
    else result.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return result;
  }

  function render() {
    const grid = $("#artGrid");
    if (!grid) return;
    const list = filteredArtworks();
    if ($("#resultCount")) $("#resultCount").textContent = `${list.length} karya`;
    if ($("#favoriteCount")) $("#favoriteCount").textContent = favorites.size;
    if ($("#emptyState")) $("#emptyState").hidden = list.length !== 0;
    grid.innerHTML = list.map(a => {
      const thumb = a.preview_url || a.image_url || a.file_url;
      const media = thumb
        ? (isVideo(a) && !a.preview_url ? `<div class="video-placeholder">▶ Video</div>` : `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(a.title)}" loading="lazy">`)
        : `<div class="video-placeholder">KOMSI<br>RUPA</div>`;
      const id = escapeHtml(a.id);
      const saved = favorites.has(String(a.id));
      return `<article class="art-card" data-open="${id}"><div class="art-thumb">${media}<span class="art-type">${escapeHtml(a.category || "Visual")}</span><button class="favorite-button ${saved ? "saved" : ""}" data-favorite="${id}" aria-label="Tambah ke favorit" type="button">${saved ? "♥" : "♡"}</button></div><div class="art-meta"><div class="art-title-row"><h3 class="art-title">${escapeHtml(a.title)}</h3><span class="art-size">${a.file_size ? bytesLabel(a.file_size) : ""}</span></div><p class="art-creator">${escapeHtml(a.creator || "KOMSI Library")}</p></div></article>`;
    }).join("");
  }

  function toggleFavorite(id) {
    id = String(id);
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    try { localStorage.setItem("komsi-rupa-favorites", JSON.stringify([...favorites])); } catch (_) {}
    render();
  }

  function openDetail(id) {
    const a = artworks.find(x => String(x.id) === String(id));
    if (!a) return;
    const preview = a.preview_url || a.image_url || a.file_url;
    const media = preview
      ? (isVideo(a) && !a.preview_url ? `<div class="video-placeholder">▶ Video</div>` : isVideo(a) ? `<video src="${escapeHtml(a.file_url)}" controls playsinline></video>` : `<img src="${escapeHtml(preview)}" alt="${escapeHtml(a.title)}">`)
      : `<div class="video-placeholder">Preview belum tersedia</div>`;
    $("#detailContent").innerHTML = `<div class="detail-layout"><div class="detail-preview">${media}</div><div class="detail-info"><p class="eyebrow">${escapeHtml(a.category || "VISUAL")} · ${escapeHtml(prettyDate(a.created_at))}</p><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.description || "Tidak ada deskripsi untuk karya ini.")}</p><p>Kreator: <b>${escapeHtml(a.creator || "Tidak dicantumkan")}</b></p><p>File: ${escapeHtml(a.file_name || "File karya")}${a.file_size ? ` · ${bytesLabel(a.file_size)}` : ""}</p><div class="detail-actions">${a.file_url ? `<a class="primary-button" href="${escapeHtml(a.file_url)}" target="_blank" rel="noopener" download>Unduh karya ↓</a>` : `<button class="primary-button" disabled>File tidak tersedia</button>`}<button class="secondary-button" data-detail-favorite="${escapeHtml(a.id)}">${favorites.has(String(a.id)) ? "♥ Tersimpan" : "♡ Simpan favorit"}</button></div></div></div>`;
    $("#detailDialog")?.showModal();
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
      currentUser = result.data.user;
      $("#uploadPanel").hidden = false;
      $("#loginForm").hidden = true;
      showMessage("Berhasil masuk. Kamu dapat mengunggah karya.", true);
    } catch (error) {
      console.error("Login admin gagal:", error);
      showMessage("Login gagal: " + getErrorMessage(error));
    } finally {
      if (button) { button.disabled = false; button.textContent = "Masuk sebagai admin"; }
    }
  }

  async function uploadArtwork(event) {
    event.preventDefault();
    if (!supabase || !currentUser) { showMessage("Silakan masuk sebagai admin terlebih dahulu."); return; }
    const file = $("#artFile")?.files?.[0];
    const previewFile = $("#artPreview")?.files?.[0];
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

      /* Menggunakan kolom inti yang ada pada skema awal: title, description,
         category, image_url, file_url, file_name, file_size, created_by.
         preview_url/creator/mime_type/uploaded_by tidak diasumsikan tersedia. */
      const record = {
        title: $("#artTitle").value.trim(),
        description: $("#artDescription").value.trim(),
        category: $("#artCategory").value,
        image_url: previewUrl,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        created_by: currentUser.id
      };
      const { error: insertError } = await supabase.from(TABLE).insert(record);
      if (insertError) throw insertError;

      showMessage("Karya berhasil diunggah ke library.", true);
      $("#uploadForm").reset();
      await loadArtworks();
    } catch (error) {
      console.error("Upload karya gagal:", error);
      showMessage("Gagal mengunggah: " + getErrorMessage(error) + " Periksa kebijakan Storage, izin tabel artworks, dan nama bucket.");
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = "Unggah karya"; }
    }
  }

  async function logoutAdmin() {
    try { if (supabase) await supabase.auth.signOut(); }
    catch (error) { console.error("Logout gagal:", error); }
    currentUser = null;
    if ($("#uploadPanel")) $("#uploadPanel").hidden = true;
    if ($("#loginForm")) $("#loginForm").hidden = false;
    showMessage("Kamu telah keluar.");
  }

  function init() {
    const required = ["#year","#searchInput","#sortSelect","#categories","#artGrid","#notice","#adminDialog","#loginForm","#adminMessage"];
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
    $("#sortSelect")?.addEventListener("change", render);
    $("#categories")?.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      activeCategory = button.dataset.category;
      document.querySelectorAll(".category").forEach(el => el.classList.toggle("active", el === button));
      render();
    });
    $("#artGrid")?.addEventListener("click", event => {
      const favoriteButton = event.target.closest("[data-favorite]");
      if (favoriteButton) { event.stopPropagation(); toggleFavorite(favoriteButton.dataset.favorite); return; }
      const card = event.target.closest("[data-open]");
      if (card) openDetail(card.dataset.open);
    });
    $("#favoritesToggle")?.addEventListener("click", () => {
      favoritesOnly = !favoritesOnly;
      $("#favoritesToggle").style.fontWeight = favoritesOnly ? "700" : "400";
      $("#favoritesToggle").innerHTML = `${favoritesOnly ? "♥" : "♡"} Favorit <span id="favoriteCount">${favorites.size}</span>`;
      $("#library")?.scrollIntoView({ behavior: "smooth" });
      render();
    });
    $("#adminOpen")?.addEventListener("click", () => $("#adminDialog")?.showModal());
    $("#submitInfo")?.addEventListener("click", () => $("#infoDialog")?.showModal());
    document.addEventListener("click", event => {
      const closeButton = event.target.closest("[data-close]");
      if (closeButton) $("#" + closeButton.dataset.close)?.close();
      const favoriteButton = event.target.closest("[data-detail-favorite]");
      if (favoriteButton) { toggleFavorite(favoriteButton.dataset.detailFavorite); openDetail(favoriteButton.dataset.detailFavorite); }
    });
    $("#loginForm")?.addEventListener("submit", loginAdmin);
    $("#uploadForm")?.addEventListener("submit", uploadArtwork);
    $("#logoutButton")?.addEventListener("click", logoutAdmin);

    if (supabase) {
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) console.warn("Gagal memeriksa sesi:", error.message);
        if (data?.session) {
          currentUser = data.session.user;
          if ($("#uploadPanel")) $("#uploadPanel").hidden = false;
          if ($("#loginForm")) $("#loginForm").hidden = true;
        }
      }).catch(error => console.warn("Pemeriksaan sesi gagal:", error));
    }

    loadArtworks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
