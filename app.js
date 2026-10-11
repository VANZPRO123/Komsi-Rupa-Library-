/* KOMSI RUPA LIBRARY — V1
   Demo mode works without credentials. For real database/upload, configure Supabase below.
   Never put a Supabase service_role key in frontend code. Use only the anon/publishable key. */
const SUPABASE_URL = "https://odcxkypwvhmpliuntmdc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gHdYS_wikUsuWtXpzzGh3Q_21TFwkyD"; // publishable key only
const STORAGE_BUCKET = "rupa-library";
const TABLE = "artworks";

const demoArtworks = [
  {id:"demo-1",title:"Quiet Forms",category:"Desain",creator:"KOMSI Studio",description:"Eksplorasi bentuk dan ruang dengan pendekatan minimalis.",file_url:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=85",file_name:"quiet-forms.jpg",created_at:"2026-10-08T10:00:00Z",is_demo:true},
  {id:"demo-2",title:"Soft Architecture",category:"Fotografi",creator:"Visual Archive",description:"Permainan cahaya dan bayangan dalam arsitektur.",file_url:"https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85",file_name:"soft-architecture.jpg",created_at:"2026-10-07T10:00:00Z",is_demo:true},
  {id:"demo-3",title:"Color Study 04",category:"Ilustrasi",creator:"KOMSI Studio",description:"Studi warna, tekstur, dan komposisi abstrak.",file_url:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85",file_name:"color-study.jpg",created_at:"2026-10-06T10:00:00Z",is_demo:true},
  {id:"demo-4",title:"Still Life Notes",category:"Artwork",creator:"Visual Archive",description:"Komposisi objek sehari-hari dengan tone lembut.",file_url:"https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1000&q=85",file_name:"still-life.jpg",created_at:"2026-10-05T10:00:00Z",is_demo:true},
  {id:"demo-5",title:"Open Canvas",category:"Desain",creator:"KOMSI Studio",description:"Referensi visual untuk proyek kreatif berikutnya.",file_url:"https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=85",file_name:"open-canvas.jpg",created_at:"2026-10-04T10:00:00Z",is_demo:true},
  {id:"demo-6",title:"Nature in Frame",category:"Fotografi",creator:"Visual Archive",description:"Fragmen alam dengan komposisi sederhana.",file_url:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",file_name:"nature-frame.jpg",created_at:"2026-10-03T10:00:00Z",is_demo:true},
  {id:"demo-7",title:"Motion Notes",category:"Video",creator:"KOMSI Studio",description:"Contoh entri kategori video. Upload video memerlukan koneksi Supabase.",file_url:"",preview_url:"https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1000&q=85",file_name:"motion-notes.mp4",created_at:"2026-10-02T10:00:00Z",is_demo:true},
  {id:"demo-8",title:"Poster Experiments",category:"Desain",creator:"Visual Archive",description:"Eksperimen tipografi dan tata letak poster.",file_url:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1000&q=85",preview_url:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1000&q=85",file_name:"poster-experiments.jpg",created_at:"2026-10-01T10:00:00Z",is_demo:true}
];

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = hasSupabaseConfig && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let artworks = [];
let activeCategory = "Semua";
let favoritesOnly = false;
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem("komsi-rupa-favorites") || "[]")); }
catch (e) { localStorage.removeItem("komsi-rupa-favorites"); }
let currentUser = null;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isVideo = (art) => art.category === "Video" || /\.(mp4|webm|mov)$/i.test(art.file_name || art.file_url || "");
const prettyDate = (date) => date ? new Date(date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "Koleksi KOMSI";
const bytesLabel = (bytes) => { if (!bytes) return ""; const units=["B","KB","MB","GB"]; let i=0,n=bytes; while(n>=1024&&i<3){n/=1024;i++;} return `${n.toFixed(i?1:0)} ${units[i]}`; };

async function loadArtworks(){
  if(!supabase){artworks=demoArtworks;$("#notice").textContent="Mode pratinjau aktif. Hubungkan Supabase untuk memakai database dan upload sungguhan.";render();return;}
  $("#notice").textContent="Menghubungkan ke katalog KOMSI…";
  const {data,error}=await supabase.from(TABLE).select("*").order("created_at",{ascending:false});
  if(error){console.error(error);$("#notice").textContent="Katalog belum dapat dimuat. Periksa tabel Supabase dan kebijakan akses, atau lihat README untuk setup.";artworks=[];}
  else {artworks=data||[];$("#notice").textContent="Terhubung ke katalog KOMSI RUPA LIBRARY.";}
  render();
}
function filteredArtworks(){
  const q=$("#searchInput").value.trim().toLowerCase();
  let result=artworks.filter(a=>(activeCategory==="Semua"||a.category===activeCategory)&&(!favoritesOnly||favorites.has(String(a.id)))&&(!q||[a.title,a.category,a.creator,a.description,a.tags].join(" ").toLowerCase().includes(q)));
  if($("#sortSelect").value==="az")result.sort((a,b)=>(a.title||"").localeCompare(b.title||""));
  else result.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  return result;
}
function render(){
  const list=filteredArtworks();$("#resultCount").textContent=`${list.length} karya`;$("#favoriteCount").textContent=favorites.size;
  $("#emptyState").hidden=list.length!==0;
  $("#artGrid").innerHTML=list.map(a=>{
    const thumb=a.preview_url||a.file_url;
    const media=thumb?(isVideo(a)&&!a.preview_url?`<div class="video-placeholder">▶ Video</div>`:`<img src="${escapeHtml(thumb)}" alt="${escapeHtml(a.title)}" loading="lazy">`):`<div class="video-placeholder">KOMSI<br>RUPA</div>`;
    return `<article class="art-card" data-open="${escapeHtml(a.id)}"><div class="art-thumb">${media}<span class="art-type">${escapeHtml(a.category||"Visual")}</span><button class="favorite-button ${favorites.has(String(a.id))?"saved":""}" data-favorite="${escapeHtml(a.id)}" aria-label="Tambah ke favorit" type="button">${favorites.has(String(a.id))?"♥":"♡"}</button></div><div class="art-meta"><div class="art-title-row"><h3 class="art-title">${escapeHtml(a.title)}</h3><span class="art-size">${a.file_size?bytesLabel(a.file_size):""}</span></div><p class="art-creator">${escapeHtml(a.creator||"KOMSI Library")}</p></div></article>`;
  }).join("");
}
function toggleFavorite(id){id=String(id);favorites.has(id)?favorites.delete(id):favorites.add(id);localStorage.setItem("komsi-rupa-favorites",JSON.stringify([...favorites]));render();}
function openDetail(id){
  const a=artworks.find(x=>String(x.id)===String(id));if(!a)return;
  const preview=a.preview_url||a.file_url;
  const media=preview?(isVideo(a)&&!a.preview_url?`<div class="video-placeholder">▶ Video</div>`:isVideo(a)?`<video src="${escapeHtml(a.file_url)}" controls playsinline></video>`:`<img src="${escapeHtml(preview)}" alt="${escapeHtml(a.title)}">`):`<div class="video-placeholder">Preview belum tersedia</div>`;
  $("#detailContent").innerHTML=`<div class="detail-layout"><div class="detail-preview">${media}</div><div class="detail-info"><p class="eyebrow">${escapeHtml(a.category||"VISUAL")} · ${escapeHtml(prettyDate(a.created_at))}</p><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.description||"Tidak ada deskripsi untuk karya ini.")}</p><p>Kreator: <b>${escapeHtml(a.creator||"Tidak dicantumkan")}</b></p><p>File: ${escapeHtml(a.file_name||"File karya")}${a.file_size?` · ${bytesLabel(a.file_size)}`:""}</p><div class="detail-actions">${a.file_url?`<a class="primary-button" href="${escapeHtml(a.file_url)}" target="_blank" rel="noopener" download>Unduh karya ↓</a>`:`<button class="primary-button" disabled>File demo</button>`}<button class="secondary-button" data-detail-favorite="${escapeHtml(a.id)}">${favorites.has(String(a.id))?"♥ Tersimpan":"♡ Simpan favorit"}</button></div></div></div>`;
  $("#detailDialog").showModal();
}
function showMessage(text,ok=false){$("#adminMessage").textContent=text;$("#adminMessage").style.color=ok?"#4e7812":"#a04b38";}
async function loginAdmin(e){
  e.preventDefault();if(!supabase){showMessage("Supabase belum dikonfigurasi. Isi URL dan anon key di app.js, lalu jalankan SQL pada README.");return;}
  const {data,error}=await supabase.auth.signInWithPassword({email:$("#adminEmail").value,password:$("#adminPassword").value});
  if(error){showMessage(error.message);return;}currentUser=data.user;$("#uploadPanel").hidden=false;$("#loginForm").hidden=true;showMessage("Berhasil masuk. Kamu dapat mengunggah karya.",true);
}
async function uploadArtwork(e){
  e.preventDefault();if(!supabase||!currentUser){showMessage("Silakan masuk sebagai admin terlebih dahulu.");return;}
  const file=$("#artFile").files[0],previewFile=$("#artPreview").files[0];if(!file)return;
  if(file.size>50*1024*1024){showMessage("Ukuran file melebihi 50 MB. Kompres file terlebih dahulu atau gunakan unggahan resumable yang dikonfigurasi terpisah.");return;}
  const submit=$("#uploadForm button[type=submit]");submit.disabled=true;submit.textContent="Mengunggah…";
  try{
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");const path=`${currentUser.id}/${Date.now()}-${safeName}`;
    const {error:uploadError}=await supabase.storage.from(STORAGE_BUCKET).upload(path,file,{upsert:false,contentType:file.type||"application/octet-stream"});
    if(uploadError)throw uploadError;
    const {data:publicData}=supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    let previewUrl=publicData.publicUrl;
    if(previewFile){const ppath=`${currentUser.id}/preview-${Date.now()}-${previewFile.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;const {error:pe}=await supabase.storage.from(STORAGE_BUCKET).upload(ppath,previewFile,{upsert:false,contentType:previewFile.type});if(pe)throw pe;previewUrl=supabase.storage.from(STORAGE_BUCKET).getPublicUrl(ppath).data.publicUrl;}
    const record={title:$("#artTitle").value.trim(),category:$("#artCategory").value,description:$("#artDescription").value.trim(),creator:$("#artCreator").value.trim()||"KOMSI Library",file_url:publicData.publicUrl,preview_url:previewUrl,file_name:file.name,file_size:file.size,mime_type:file.type,uploaded_by:currentUser.id};
    const {error:insertError}=await supabase.from(TABLE).insert(record);if(insertError)throw insertError;
    showMessage("Karya berhasil diunggah ke library.",true);$("#uploadForm").reset();await loadArtworks();
  }catch(err){console.error(err);showMessage("Gagal mengunggah: "+(err.message||"periksa konfigurasi Supabase dan kebijakan akses."));}
  finally{submit.disabled=false;submit.textContent="Unggah karya";}
}
async function logoutAdmin(){if(supabase)await supabase.auth.signOut();currentUser=null;$("#uploadPanel").hidden=true;$("#loginForm").hidden=false;showMessage("Kamu telah keluar.");}

document.addEventListener("DOMContentLoaded",()=>{
  $("#year").textContent=new Date().getFullYear();
  $("#searchInput").addEventListener("input",render);$("#sortSelect").addEventListener("change",render);
  $("#categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;activeCategory=b.dataset.category;document.querySelectorAll(".category").forEach(x=>x.classList.toggle("active",x===b));render();});
  $("#artGrid").addEventListener("click",e=>{const f=e.target.closest("[data-favorite]");if(f){e.stopPropagation();toggleFavorite(f.dataset.favorite);return;}const card=e.target.closest("[data-open]");if(card)openDetail(card.dataset.open);});
  $("#favoritesToggle").addEventListener("click",()=>{favoritesOnly=!favoritesOnly;$("#favoritesToggle").style.fontWeight=favoritesOnly?"700":"400";$("#favoritesToggle").innerHTML=`${favoritesOnly?"♥":"♡"} Favorit <span id="favoriteCount">${favorites.size}</span>`;$("#library").scrollIntoView({behavior:"smooth"});render();});
  $("#adminOpen").addEventListener("click",()=>{$("#adminDialog").showModal();});
  $("#submitInfo").addEventListener("click",()=>$("#infoDialog").showModal());
  document.addEventListener("click",e=>{const b=e.target.closest("[data-close]");if(b)$("#"+b.dataset.close).close();const f=e.target.closest("[data-detail-favorite]");if(f){toggleFavorite(f.dataset.detailFavorite);openDetail(f.dataset.detailFavorite);}});
  $("#loginForm").addEventListener("submit",loginAdmin);$("#uploadForm").addEventListener("submit",uploadArtwork);$("#logoutButton").addEventListener("click",logoutAdmin);
  if(supabase){supabase.auth.getSession().then(({data})=>{if(data.session){currentUser=data.session.user;$("#uploadPanel").hidden=false;$("#loginForm").hidden=true;}});}
  loadArtworks();
});
