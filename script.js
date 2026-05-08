const PASSWORD = "esther1218";
const STORE_KEY = "shelf-storage-v3";

const starterData = {
  boxes: [
    { id: crypto.randomUUID(), name: "C箱", location: "货架1层", photo: "" },
    { id: crypto.randomUUID(), name: "D箱", location: "货架1层", photo: "" },
  ],
  items: [],
};
starterData.items.push(
  { id: crypto.randomUUID(), boxId: starterData.boxes[0].id, name: "虞书欣周边", qty: 1, note: "", photo: "", mfgDate: "", shelfLife: "", expiryDate: "", openedDate: "", afterOpenDays: "" },
  { id: crypto.randomUUID(), boxId: starterData.boxes[1].id, name: "虞书欣周边", qty: 1, note: "", photo: "", mfgDate: "", shelfLife: "", expiryDate: "", openedDate: "", afterOpenDays: "" }
);

let data = loadData();
let activeBoxId = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadData() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) return structuredClone(starterData);
  try {
    const parsed = JSON.parse(saved);
    return {
      boxes: Array.isArray(parsed.boxes) ? parsed.boxes : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return structuredClone(starterData);
  }
}

function saveData() {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function openDialog(dialog) {
  dialog.showModal();
}

function closeDialogs() {
  $$("dialog").forEach((dialog) => dialog.open && dialog.close());
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function boxById(id) {
  return data.boxes.find((box) => box.id === id);
}

function itemsInBox(boxId) {
  return data.items.filter((item) => item.boxId === boxId);
}

function addMonths(dateValue, months) {
  if (!dateValue || !months) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months));
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  if (!dateValue || !days) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

function effectiveExpiry(item) {
  const dates = [
    item.expiryDate,
    addMonths(item.mfgDate, item.shelfLife),
    addDays(item.openedDate, item.afterOpenDays),
  ].filter(Boolean);
  return dates.sort()[0] || "";
}

function expiryInfo(item) {
  const expiry = effectiveExpiry(item);
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${expiry}T00:00:00`);
  const days = Math.ceil((target - today) / 86400000);
  if (days < 0) return { text: `已过期 ${Math.abs(days)} 天，建议丢掉或补货`, cls: "expired" };
  if (days <= 30) return { text: `${expiry} 到期，剩余 ${days} 天`, cls: "warn" };
  return { text: `${expiry} 到期`, cls: "" };
}

function render() {
  renderBoxes();
  renderSearch();
  renderBoxOptions();
  if (activeBoxId) renderDetail(activeBoxId);
}

function renderBoxes() {
  const list = $("#boxList");
  if (!data.boxes.length) {
    list.innerHTML = `<div class="empty">还没有收纳箱</div>`;
    return;
  }
  list.innerHTML = data.boxes.map((box) => {
    const count = itemsInBox(box.id).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return `
      <article class="box-card">
        <div class="box-info">
          <h3>${escapeHtml(box.name)}</h3>
          <p class="box-meta">
            <span class="pill">位置：${escapeHtml(box.location || "未填写")}</span>
            <span class="pill">物品数量：${count}个</span>
          </p>
          <div class="actions">
            <button class="btn accent" type="button" data-add-item="${box.id}">新增</button>
            <button class="btn view" type="button" data-view-box="${box.id}">查看</button>
            <button class="btn strong" type="button" data-edit-box="${box.id}">编辑</button>
          </div>
        </div>
        ${box.photo ? `<img class="box-photo" src="${box.photo}" alt="${escapeHtml(box.name)}照片" />` : `<div class="box-photo" aria-hidden="true"></div>`}
      </article>
    `;
  }).join("");
}

function renderSearch() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const results = data.items.filter((item) => {
    const box = boxById(item.boxId);
    const text = `${item.name} ${box?.name || ""} ${box?.location || ""} ${item.note || ""}`.toLowerCase();
    return !query || text.includes(query);
  });
  $("#searchResults").innerHTML = results.length ? results.map(renderItemCard).join("") : `<div class="empty">没有找到物品</div>`;
}

function renderItemCard(item) {
  const box = boxById(item.boxId);
  const expiry = expiryInfo(item);
  return `
    <article class="item-card">
      ${item.photo ? `<img class="item-photo" src="${item.photo}" alt="${escapeHtml(item.name)}照片" />` : ""}
      <div class="item-info">
        <h3>${escapeHtml(item.name)}</h3>
        <p class="item-meta">
          <span class="pill">${escapeHtml(box?.name || "未分配")}</span>
          <span class="pill">${escapeHtml(box?.location || "未填写位置")}</span>
          <span class="pill">数量：${Number(item.qty || 1)}</span>
        </p>
        ${item.note ? `<p class="note">${escapeHtml(item.note)}</p>` : ""}
        ${expiry ? `<p class="expiry ${expiry.cls}">${escapeHtml(expiry.text)}</p>` : ""}
        <div class="actions">
          <button class="btn strong" type="button" data-edit-item="${item.id}">编辑</button>
          <button class="btn ghost danger" type="button" data-delete-item="${item.id}">删除</button>
        </div>
      </div>
    </article>
  `;
}

function renderDetail(boxId) {
  const box = boxById(boxId);
  if (!box) return;
  const items = itemsInBox(boxId);
  activeBoxId = boxId;
  $("#detailTitle").textContent = box.name;
  $("#detailMeta").textContent = `${box.location || "未填写位置"} · 物品数量：${items.reduce((sum, item) => sum + Number(item.qty || 0), 0)}个`;
  $("#detailItems").innerHTML = items.length ? items.map(renderItemCard).join("") : `<div class="empty">这个箱子里还没有物品</div>`;
}

function renderBoxOptions() {
  $("#itemBox").innerHTML = data.boxes.map((box) => `<option value="${box.id}">${escapeHtml(box.name)} · ${escapeHtml(box.location || "未填写位置")}</option>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function openBoxForm(boxId = "") {
  const box = boxById(boxId);
  $("#boxDialogTitle").textContent = box ? "编辑收纳箱" : "新增收纳箱";
  $("#boxDangerActions").hidden = !box;
  $("#boxId").value = box?.id || "";
  $("#boxName").value = box?.name || "";
  $("#boxLocation").value = box?.location || "";
  $("#boxPhoto").value = "";
  $("#boxPhotoPreview").hidden = !box?.photo;
  $("#boxPhotoPreview").src = box?.photo || "";
  openDialog($("#boxDialog"));
}

function openItemForm(itemId = "", preferredBoxId = activeBoxId) {
  const item = data.items.find((entry) => entry.id === itemId);
  $("#itemDialogTitle").textContent = item ? "编辑物品" : "新增物品";
  $("#deleteItem").hidden = !item;
  $("#itemId").value = item?.id || "";
  $("#itemName").value = item?.name || "";
  $("#itemBox").value = item?.boxId || preferredBoxId || data.boxes[0]?.id || "";
  $("#itemQty").value = item?.qty || 1;
  $("#itemNote").value = item?.note || "";
  $("#mfgDate").value = item?.mfgDate || "";
  $("#shelfLife").value = item?.shelfLife || "";
  $("#expiryDate").value = item?.expiryDate || "";
  $("#openedDate").value = item?.openedDate || "";
  $("#afterOpenDays").value = item?.afterOpenDays || "";
  $("#itemPhoto").value = "";
  $("#itemPhotoPreview").hidden = !item?.photo;
  $("#itemPhotoPreview").src = item?.photo || "";
  openDialog($("#itemDialog"));
}

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if ($("#passwordInput").value === PASSWORD) {
    sessionStorage.setItem("storage-auth", "1");
    $("#lockScreen").hidden = true;
    $("#app").hidden = false;
    render();
  } else {
    $("#loginError").hidden = false;
  }
});

if (sessionStorage.getItem("storage-auth") === "1") {
  $("#lockScreen").hidden = true;
  $("#app").hidden = false;
}

$$("[data-close]").forEach((button) => button.addEventListener("click", closeDialogs));

$(".tabs").addEventListener("click", (event) => {
  const target = event.target.closest("[data-view]");
  if (!target) return;
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab === target));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === target.dataset.view));
});

$("#addBoxTop").addEventListener("click", () => openBoxForm());
$("#searchInput").addEventListener("input", renderSearch);

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.viewBox) {
    renderDetail(button.dataset.viewBox);
    openDialog($("#boxDetailDialog"));
  }
  if (button.dataset.editBox) openBoxForm(button.dataset.editBox);
  if (button.dataset.addItem) openItemForm("", button.dataset.addItem);
  if (button.dataset.editItem) openItemForm(button.dataset.editItem);
  if (button.dataset.deleteItem && confirm("确定删除这个物品吗？")) {
    data.items = data.items.filter((item) => item.id !== button.dataset.deleteItem);
    saveData();
    render();
  }
});

$("#addItemInBox").addEventListener("click", () => openItemForm("", activeBoxId));
$("#editBoxInDetail").addEventListener("click", () => openBoxForm(activeBoxId));

$("#boxForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("#boxId").value || crypto.randomUUID();
  const existing = boxById(id);
  const filePhoto = await fileToDataUrl($("#boxPhoto").files[0]);
  const box = {
    id,
    name: $("#boxName").value.trim(),
    location: $("#boxLocation").value.trim(),
    photo: filePhoto || existing?.photo || "",
  };
  if (existing) {
    Object.assign(existing, box);
  } else {
    data.boxes.push(box);
  }
  saveData();
  closeDialogs();
  render();
});

$("#itemForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("#itemId").value || crypto.randomUUID();
  const existing = data.items.find((item) => item.id === id);
  const filePhoto = await fileToDataUrl($("#itemPhoto").files[0]);
  const item = {
    id,
    name: $("#itemName").value.trim(),
    boxId: $("#itemBox").value,
    qty: Number($("#itemQty").value || 1),
    note: $("#itemNote").value.trim(),
    photo: filePhoto || existing?.photo || "",
    mfgDate: $("#mfgDate").value,
    shelfLife: $("#shelfLife").value,
    expiryDate: $("#expiryDate").value,
    openedDate: $("#openedDate").value,
    afterOpenDays: $("#afterOpenDays").value,
  };
  if (existing) {
    Object.assign(existing, item);
  } else {
    data.items.push(item);
  }
  saveData();
  activeBoxId = item.boxId;
  closeDialogs();
  render();
});

$("#deleteBox").addEventListener("click", () => {
  const id = $("#boxId").value;
  if (!id || !confirm("确定删除这个收纳箱和里面的物品吗？")) return;
  data.boxes = data.boxes.filter((box) => box.id !== id);
  data.items = data.items.filter((item) => item.boxId !== id);
  activeBoxId = "";
  saveData();
  closeDialogs();
  render();
});

$("#clearBoxItems").addEventListener("click", () => {
  const id = $("#boxId").value;
  if (!id || !confirm("确定清空这个箱子里的所有物品吗？")) return;
  data.items = data.items.filter((item) => item.boxId !== id);
  saveData();
  render();
});

$("#deleteItem").addEventListener("click", () => {
  const id = $("#itemId").value;
  if (!id || !confirm("确定删除这个物品吗？")) return;
  data.items = data.items.filter((item) => item.id !== id);
  saveData();
  closeDialogs();
  render();
});

$("#boxPhoto").addEventListener("change", async (event) => {
  const src = await fileToDataUrl(event.target.files[0]);
  $("#boxPhotoPreview").hidden = !src;
  $("#boxPhotoPreview").src = src;
});

$("#itemPhoto").addEventListener("change", async (event) => {
  const src = await fileToDataUrl(event.target.files[0]);
  $("#itemPhotoPreview").hidden = !src;
  $("#itemPhotoPreview").src = src;
});

render();
