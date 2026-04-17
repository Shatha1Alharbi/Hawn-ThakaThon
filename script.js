const BASE_URL = "https://elmodels.ngrok.app/v1/chat/completions"; // تم تعديل الرابط للاتصال المباشر
const API_KEY = "sk-F6keAXeUKjjBQIdh8homgg"; // مفتاحك الخاص

let currentSummaryData = null;

// --- Navigation Logic ---
function showToast(message, type = "success", duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setActiveNav(sectionId) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    const isActive = button.dataset.section === sectionId;
    button.classList.toggle("active", isActive);
  });
}

function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });

  if (sectionId === "home" || sectionId === "about") {
    setActiveNav(sectionId);
  } else {
    setActiveNav("");
  }
  scrollToTop();
}

function clearSummaryResults() {
  currentSummaryData = null;
  const fields = [
    ["diagnosis-content", ""],
    ["medications-content", ""],
    ["instructions-content", ""],
    ["followup-content", ""],
  ];
  fields.forEach(([id, emptyValue]) => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = emptyValue;
  });
}

function goHome({ clearResults = false } = {}) {
  if (clearResults) clearSummaryResults();
  showSection("home");
}

function bindNavigation() {
  document.getElementById("logo-home")?.addEventListener("click", (event) => {
    event.preventDefault();
    goHome({ clearResults: true });
  });

  document.getElementById("start-btn")?.addEventListener("click", () => {
    showSection("record-visit");
  });

  document.getElementById("about-btn")?.addEventListener("click", () => {
    showSection("about");
  });

  ["back-home-record", "back-home-summary", "back-home-about"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => goHome());
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const { section } = button.dataset;
      if (section) showSection(section);
    });
  });
}

// --- Summary Rendering & Normalization ---
function normalizeSummaryData(data) {
  const clean = { diagnosis: [], medications: [], instructions: [], follow_up: [] };
  const allItems = Object.values(data ?? {}).flat().filter((item) => typeof item === "string" && item.trim().length > 2);

  allItems.forEach((item) => {
    const normalizedItem = item.trim();
    const value = normalizedItem.toLowerCase();

    if (value.includes("فحص") || value.includes("تحليل") || value.includes("موعد") || value.includes("مراجعة") || value.includes("بعد شهر") || value.includes("cbc")) {
      clean.follow_up.push(normalizedItem);
      return;
    }
    if ((value.includes("حبة") || value.includes("جرعة") || value.includes("muscadol") || value.includes("مكمل")) && !value.includes("نقص") && !value.includes("سبب")) {
      clean.medications.push(normalizedItem);
      return;
    }
    if (value.includes("وضعية") || value.includes("استراحة") || value.includes("مشي") || value.includes("سباحة") || value.includes("رياضة") || value.includes("تجنب")) {
      if (value.includes("إجهاد") || value.includes("بسبب")) clean.diagnosis.push(normalizedItem);
      else clean.instructions.push(normalizedItem);
      return;
    }
    if (!clean.diagnosis.includes(normalizedItem)) clean.diagnosis.push(normalizedItem);
  });
  if (clean.diagnosis.length === 0 && clean.medications.length > 0) clean.diagnosis.push(clean.medications.shift());
  return clean;
}

function buildSummaryItems(items, icon) {
  if (!items.length) return '<p class="summary-empty">لا يوجد</p>';
  return items.map(item => `
    <div class="summary-item">
      <span class="summary-item-icon">${icon}</span>
      <span>${item}</span>
    </div>
  `).join("");
}

function renderSummary(data) {
  currentSummaryData = data;
  const diag = document.getElementById("diagnosis-content");
  const meds = document.getElementById("medications-content");
  const inst = document.getElementById("instructions-content");
  const foll = document.getElementById("followup-content");

  if (diag) diag.textContent = data.diagnosis.join("، ") || "لا يوجد";
  if (meds) meds.innerHTML = buildSummaryItems(data.medications, "💊");
  if (inst) inst.innerHTML = data.instructions.length ? data.instructions.map(i => `<li>${i}</li>`).join("") : "<li>لا يوجد</li>";
  if (foll) foll.innerHTML = buildSummaryItems(data.follow_up, "📅");
}

function formatSummaryForShare(data) {
  const sections = [["🔍 التشخيص", data.diagnosis], ["💊 الأدوية الموصوفة", data.medications], ["📝 التعليمات والنصائح", data.instructions], ["📅 المتابعة المطلوبة", data.follow_up]];
  const content = sections.filter(([, items]) => items.length > 0).map(([title, items]) => `${title}:\n${items.map(i => `  • ${i}`).join("\n")}`).join("\n\n");
  return ["🏥 ملخص الزيارة الطبية", "━".repeat(40), content, "━".repeat(40), "تم إنشاء هذا الملخص بواسطة منصة هَـون"].filter(Boolean).join("\n\n");
}

// --- API Integration (تم التعديل هنا ليعمل مباشرة) ---
async function handleGenerateSummary() {
  const scenarioInput = document.getElementById("scenario-input");
  const text = scenarioInput?.value.trim();

  if (!text) {
    window.alert("الرجاء إدخال نص الزيارة");
    return;
  }

  showSection("processing");

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "nuha-2.0",
        messages: [
          { role: "system", content: 'أنت محرك تحليل طبي. ردك يجب أن يكون JSON فقط: {"diagnosis": [], "medications": [], "instructions": [], "follow_up": []}' },
          { role: "user", content: text }
        ]
      })
    });

    if (!response.ok) throw new Error(`فشل الاتصال (Status: ${response.status})`);

    const responseData = await response.json();
    const rawContent = responseData?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("تنسيق البيانات غير صحيح");

    const parsedData = JSON.parse(jsonMatch[0]);
    renderSummary(normalizeSummaryData(parsedData));
    showSection("summary");
  } catch (error) {
    console.error("Error:", error);
    window.alert(`حدث خطأ في الاتصال: ${error.message}`);
    showSection("record-visit");
  }
}

// --- Helpers & Actions ---
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); const c = document.execCommand("copy"); document.body.removeChild(t); return c;
  } catch { return false; }
}

async function handleCopySummary() {
  if (!currentSummaryData) return showToast("❌ لا توجد بيانات", "error");
  const copied = await copyToClipboard(formatSummaryForShare(currentSummaryData));
  showToast(copied ? "تم نسخ الملخص بنجاح ✅" : "❌ فشل النسخ", copied ? "success" : "error");
}

async function handleShareSummary() {
  if (!currentSummaryData) return showToast("❌ لا توجد بيانات", "error");
  const shareData = { title: "ملخص هَـون", text: formatSummaryForShare(currentSummaryData), url: window.location.href };
  if (navigator.share) {
    try { await navigator.share(shareData); showToast("✅ تم المشاركة!", "success"); } catch (e) { if (e.name !== "AbortError") console.error(e); }
  } else { showToast("❌ المشاركة غير مدعومة", "info"); }
}

async function handleDownloadPdf() {
  if (!currentSummaryData) return showToast("❌ لا توجد بيانات", "error");
  window.print(); // طريقة سريعة للطباعة كـ PDF في المتصفح
}

// --- Start ---
document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  document.getElementById("generate-btn")?.addEventListener("click", handleGenerateSummary);
  document.getElementById("copy-btn")?.addEventListener("click", handleCopySummary);
  document.getElementById("share-btn")?.addEventListener("click", handleShareSummary);
  document.getElementById("download-pdf-btn")?.addEventListener("click", handleDownloadPdf);
});
