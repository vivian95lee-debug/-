const STORAGE_KEY = "school_inventory_records";

const form = document.querySelector("#inventory-form");
const list = document.querySelector("#inventory-list");
const template = document.querySelector("#item-template");
const voiceStatus = document.querySelector("#voice-status");
const searchInput = document.querySelector("#search");
const filterCategory = document.querySelector("#filter-category");

const fields = {
  category: document.querySelector("#category"),
  name: document.querySelector("#name"),
  quantity: document.querySelector("#quantity"),
  location: document.querySelector("#location"),
  note: document.querySelector("#note"),
  photo: document.querySelector("#photo"),
};

let records = loadRecords();

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderRecords() {
  const keyword = searchInput.value.trim().toLowerCase();
  const category = filterCategory.value;

  list.innerHTML = "";
  const filtered = records.filter((item) => {
    const matchesKeyword = [item.name, item.location, item.note]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const matchesCategory = category === "all" || item.category === category;
    return matchesKeyword && matchesCategory;
  });

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.textContent = "目前沒有符合條件的庫存資料。";
    list.appendChild(empty);
    return;
  }

  filtered.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;

    const thumb = node.querySelector(".thumb");
    if (item.photoDataUrl) {
      thumb.src = item.photoDataUrl;
    } else {
      thumb.alt = "無照片";
    }

    node.querySelector(".title").textContent = `${item.name}（${item.category}）`;
    node.querySelector(".meta").textContent = `數量：${item.quantity}｜地點：${item.location}｜建立：${new Date(item.createdAt).toLocaleString()}`;
    node.querySelector(".note").textContent = item.note ? `備註：${item.note}` : "備註：-";

    node.querySelector(".danger").addEventListener("click", () => {
      records = records.filter((entry) => entry.id !== item.id);
      saveRecords();
      renderRecords();
    });

    list.appendChild(node);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const photoDataUrl = await toBase64(fields.photo.files[0]);

  const entry = {
    id: crypto.randomUUID(),
    category: fields.category.value,
    name: fields.name.value.trim(),
    quantity: Number(fields.quantity.value),
    location: fields.location.value.trim(),
    note: fields.note.value.trim(),
    photoDataUrl,
    createdAt: Date.now(),
  };

  records.unshift(entry);
  saveRecords();
  form.reset();
  renderRecords();
});

searchInput.addEventListener("input", renderRecords);
filterCategory.addEventListener("change", renderRecords);

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!Recognition) {
  voiceStatus.textContent = "目前瀏覽器不支援語音輸入，請改為手動輸入。";
} else {
  document.querySelectorAll("[data-voice-target]").forEach((button) => {
    button.addEventListener("click", () => startVoiceInput(button.dataset.voiceTarget));
  });
}

function startVoiceInput(targetKey) {
  const recognition = new Recognition();
  recognition.lang = "zh-TW";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceStatus.textContent = "🎙️ 正在聆聽，請說話...";
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const target = fields[targetKey];
    if (target) {
      target.value = transcript;
    }
    voiceStatus.textContent = `已填入：${transcript}`;
  };

  recognition.onerror = () => {
    voiceStatus.textContent = "語音辨識失敗，請再試一次或改手動輸入。";
  };

  recognition.onend = () => {
    if (voiceStatus.textContent.includes("聆聽")) {
      voiceStatus.textContent = "語音辨識結束。";
    }
  };
}

renderRecords();
