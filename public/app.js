const dropzone = document.getElementById("dropzone");
const fileEl = document.getElementById("file");
const btnUpload = document.getElementById("btnUpload");
const msg = document.getElementById("msg");

const grid = document.getElementById("grid");

const previewImg = document.getElementById("previewImg");
const viewerEmpty = document.getElementById("viewerEmpty");
const previewMeta = document.getElementById("previewMeta");
const previewDate = document.getElementById("previewDate");
const btnDeletePreview = document.getElementById("btnDeletePreview");

// ===== Modal elements =====
const modalBackdrop = document.getElementById("modalBackdrop");
const modalText = document.getElementById("modalText");
const modalYes = document.getElementById("modalYes");
const modalNo = document.getElementById("modalNo");

let items = [];
let selected = null;

let modalResolve = null;

function openModal(text = "삭제하시겠습니까?") {
  modalText.textContent = text;
  modalBackdrop.style.display = "grid";

  return new Promise((resolve) => {
    modalResolve = resolve;
    setTimeout(() => modalNo.focus(), 0);
  });
}

function closeModal(result) {
  modalBackdrop.style.display = "none";
  if (modalResolve) modalResolve(result);
  modalResolve = null;
}

modalYes.addEventListener("click", () => closeModal(true));
modalNo.addEventListener("click", () => closeModal(false));

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal(false);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBackdrop.style.display !== "none") {
    closeModal(false);
  }
});

function fmtDate(ms) {
  const d = new Date(ms);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setMessage(text) {
  msg.textContent = text || "";
}

function setPreview(item) {
  selected = item || null;

  if (!selected) {
    previewImg.style.display = "none";
    btnDeletePreview.style.display = "none";
    previewMeta.style.display = "none";
    viewerEmpty.style.display = "block";
    previewImg.src = "";
    return;
  }

  viewerEmpty.style.display = "none";
  previewImg.src = selected.url;
  previewImg.style.display = "block";

  previewDate.textContent = fmtDate(selected.uploadedAt);
  previewMeta.style.display = "block";

  btnDeletePreview.style.display = "grid";
}

async function fetchPhotos() {
  const res = await fetch("/photos");
  items = await res.json();
}

function renderGrid() {
  grid.innerHTML = "";

  if (items.length === 0) {
    setPreview(null);
    return;
  }

  items.forEach((it) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb";
    if (selected && selected.filename === it.filename) wrap.classList.add("active");

    const box = document.createElement("div");
    box.className = "thumbbox";

    const img = document.createElement("img");
    img.src = it.url;
    img.alt = "업로드 사진";
    box.appendChild(img);

    const del = document.createElement("button");
    del.className = "delbtn";
    del.type = "button";
    del.textContent = "✕";
    del.title = "삭제";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      await confirmAndDelete(it);
    });
    box.appendChild(del);

    box.addEventListener("click", () => {
      setPreview(it);
      renderGrid();
    });

    const date = document.createElement("div");
    date.className = "thdate";
    date.textContent = fmtDate(it.uploadedAt);

    wrap.appendChild(box);
    wrap.appendChild(date);
    grid.appendChild(wrap);
  });
}

async function reloadAndKeepSelection() {
  const prevFilename = selected?.filename || null;
  await fetchPhotos();

  if (prevFilename) {
    const still = items.find((x) => x.filename === prevFilename);
    setPreview(still || null);
  } else {
    setPreview(null);
  }

  renderGrid();
}

async function uploadSelectedFile(file) {
  if (!file) return;

  btnUpload.disabled = true;
  setMessage("업로드 중…");

  const form = new FormData();
  form.append("photo", file);

  try {
    const res = await fetch("/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");

    setMessage("업로드 완료 ✅");
    fileEl.value = "";

    await reloadAndKeepSelection();
  } catch (err) {
    setMessage("업로드 실패 ❌");
  } finally {
    btnUpload.disabled = false;
  }
}

async function confirmAndDelete(it) {
  const ok = await openModal("삭제하시겠습니까?");
  if (!ok) return;

  try {
    const res = await fetch(`/photos/${encodeURIComponent(it.filename)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");

    if (selected && selected.filename === it.filename) {
      setPreview(null);
    }

    await reloadAndKeepSelection();
    setMessage("삭제 완료 ✅");
  } catch (e) {
    setMessage("삭제 실패 ❌");
  }
}

/* Drag & Drop */
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file) {
    fileEl.files = e.dataTransfer.files;
    setMessage(`선택됨: ${file.name}`);
  }
});

fileEl.addEventListener("change", () => {
  const file = fileEl.files?.[0];
  if (file) setMessage(`선택됨: ${file.name}`);
});

btnUpload.addEventListener("click", async () => {
  const file = fileEl.files?.[0];
  if (!file) {
    setMessage("사진을 먼저 선택해줘!");
    return;
  }
  await uploadSelectedFile(file);
});

btnDeletePreview.addEventListener("click", async () => {
  if (!selected) return;
  await confirmAndDelete(selected);
});

(async function init() {
  setMessage("");
  await reloadAndKeepSelection();
})();
