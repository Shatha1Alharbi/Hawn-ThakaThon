const BASE_URL = "/api/chat";

let currentSummaryData = null;

// --- Navigation Logic ---
function showToast(message, type = "success", duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) {
    return;
  }

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
    if (!element) {
      return;
    }

    element.innerHTML = emptyValue;
  });
}

function goHome({ clearResults = false } = {}) {
  if (clearResults) {
    clearSummaryResults();
  }

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
    document.getElementById(id)?.addEventListener("click", () => {
      goHome();
    });
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const { section } = button.dataset;
      if (section) {
        showSection(section);
      }
    });
  });
}

// --- Summary Rendering ---
function normalizeSummaryData(data) {
  const clean = {
    diagnosis: [],
    medications: [],
    instructions: [],
    follow_up: [],
  };

  const allItems = Object.values(data ?? {})
    .flat()
    .filter((item) => typeof item === "string" && item.trim().length > 2);

  allItems.forEach((item) => {
    const normalizedItem = item.trim();
    const value = normalizedItem.toLowerCase();

    if (
      value.includes("فحص") ||
      value.includes("تحليل") ||
      value.includes("موعد") ||
      value.includes("مراجعة") ||
      value.includes("بعد شهر") ||
      value.includes("cbc")
    ) {
      clean.follow_up.push(normalizedItem);
      return;
    }

    if (
      (value.includes("حبة") ||
        value.includes("جرعة") ||
        value.includes("muscadol") ||
        value.includes("مكمل")) &&
      !value.includes("نقص") &&
      !value.includes("سبب")
    ) {
      clean.medications.push(normalizedItem);
      return;
    }

    if (
      value.includes("وضعية") ||
      value.includes("استراحة") ||
      value.includes("مشي") ||
      value.includes("سباحة") ||
      value.includes("رياضة") ||
      value.includes("تجنب")
    ) {
      if (value.includes("إجهاد") || value.includes("بسبب")) {
        clean.diagnosis.push(normalizedItem);
      } else {
        clean.instructions.push(normalizedItem);
      }
      return;
    }

    if (!clean.diagnosis.includes(normalizedItem)) {
      clean.diagnosis.push(normalizedItem);
    }
  });

  if (clean.diagnosis.length === 0 && clean.medications.length > 0) {
    clean.diagnosis.push(clean.medications.shift());
  }

  return clean;
}

function buildSummaryItems(items, icon) {
  if (!items.length) {
    return '<p class="summary-empty">لا يوجد</p>';
  }

  return items
    .map(
      (item) => `
        <div class="summary-item">
          <span class="summary-item-icon">${icon}</span>
          <span>${item}</span>
        </div>
      `
    )
    .join("");
}

function renderSummary(data) {
  currentSummaryData = data;

  const diagnosisContent = document.getElementById("diagnosis-content");
  const medicationsContent = document.getElementById("medications-content");
  const instructionsContent = document.getElementById("instructions-content");
  const followupContent = document.getElementById("followup-content");

  if (diagnosisContent) {
    diagnosisContent.textContent = data.diagnosis.join("، ") || "لا يوجد";
  }

  if (medicationsContent) {
    medicationsContent.innerHTML = buildSummaryItems(data.medications, "💊");
  }

  if (instructionsContent) {
    instructionsContent.innerHTML = data.instructions.length
      ? data.instructions.map((item) => `<li>${item}</li>`).join("")
      : "<li>لا يوجد</li>";
  }

  if (followupContent) {
    followupContent.innerHTML = buildSummaryItems(data.follow_up, "📅");
  }
}

function formatSummaryForShare(data) {
  const sections = [
    ["🔍 التشخيص", data.diagnosis],
    ["💊 الأدوية الموصوفة", data.medications],
    ["📝 التعليمات والنصائح", data.instructions],
    ["📅 المتابعة المطلوبة", data.follow_up],
  ];

  const content = sections
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => `${title}:\n${items.map((item) => `  • ${item}`).join("\n")}`)
    .join("\n\n");

  return [
    "🏥 ملخص الزيارة الطبية",
    "━".repeat(40),
    content,
    "━".repeat(40),
    "تم إنشاء هذا الملخص بواسطة منصة هَـون",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// --- Utility Helpers ---
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copied;
  } catch (error) {
    console.error("فشل نسخ النص:", error);
    return false;
  }
}

async function fallbackShare() {
  showToast("❌ المشاركة غير متاحة على هذا المتصفح. استخدم زر نسخ النص.", "info", 4500);
}

// --- API Integration ---
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
      },
      body: JSON.stringify({
        model: "nuha-2.0",
        messages: [
          {
            role: "system",
            content:
              'أنت محرك تحليل طبي. ردك يجب أن يكون JSON فقط: {"diagnosis": [], "medications": [], "instructions": [], "follow_up": []}',
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (Status: ${response.status})`);
    }

    const responseData = await response.json();
    const rawContent = responseData?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("تنسيق البيانات غير صحيح");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    renderSummary(normalizeSummaryData(parsedData));
    showSection("summary");
  } catch (error) {
    console.error("Error in handleGenerateSummary:", error);
    window.alert(`حدث خطأ: ${error.message}`);
    showSection("record-visit");
  }
}

// --- Summary Actions ---
async function handleCopySummary() {
  if (!currentSummaryData) {
    showToast("❌ لا توجد بيانات لنسخها", "error");
    return;
  }

  const formattedText = formatSummaryForShare(currentSummaryData);
  const copied = await copyToClipboard(formattedText);

  if (copied) {
    showToast("تم نسخ الملخص بنجاح ✅", "success", 4000);
    return;
  }

  showToast("❌ فشل نسخ النص، يرجى المحاولة مجددًا", "error");
}

async function handleShareSummary() {
  if (!currentSummaryData) {
    showToast("❌ لا توجد بيانات لمشاركتها", "error");
    return;
  }

  const formattedText = formatSummaryForShare(currentSummaryData);
  const shareData = {
    title: "ملخص الزيارة الطبية - هَـون",
    text: formattedText,
    url: window.location.href,
  };

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      showToast("✅ تم مشاركة الملخص بنجاح!", "success");
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("خطأ في المشاركة:", error);
    }
  }

  await fallbackShare();
}

function handleListenSummary() {
  if (!currentSummaryData) {
    showToast("❌ لا توجد بيانات للاستماع إليها", "error");
    return;
  }

  showToast("🔊 ميزة الاستماع للملخص ستكون متاحة قريبًا", "info");
}

async function handleDownloadPdf() {
  if (!currentSummaryData) {
    showToast("❌ لا توجد بيانات لتحميلها", "error");
    return;
  }

  const summaryElement = document.querySelector(".summary-content");
  if (!summaryElement) {
    showToast("❌ لم يتم العثور على الملخص", "error");
    return;
  }

  const summaryActions = summaryElement.querySelector(".summary-actions");
  const actionButtons = summaryElement.querySelector(".action-buttons");
  const originalActionsDisplay = summaryActions?.style.display ?? "";
  const originalButtonsDisplay = actionButtons?.style.display ?? "";

  try {
    showToast("📥 جاري تحضير ملف PDF...", "info");

    if (summaryActions) {
      summaryActions.style.display = "none";
    }

    if (actionButtons) {
      actionButtons.style.display = "none";
    }

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      throw new Error("فشل في فتح نافذة الطباعة - تأكد من السماح بالنوافذ المنبثقة");
    }

    const allStylesheets = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join("\n");

    const printHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ملخص الزيارة الطبية</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: "RiwaaPro";
      src: url("${window.location.origin}/RiwaaPro-Regular.woff2") format("woff2");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
  </style>
  <style>
    ${allStylesheets}

    body {
      margin: 0;
      padding: 20px;
      background: #ffffff;
      color: #213040;
      font-family: "RiwaaPro", "Cairo", sans-serif;
      direction: rtl;
      text-align: right;
    }

    .print-message {
      margin-bottom: 20px;
      color: #64748b;
      text-align: center;
    }

    @media print {
      body {
        padding: 12mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-message,
      .summary-actions,
      .action-buttons,
      button,
      input,
      textarea,
      select {
        display: none !important;
      }

      .summary-content {
        margin: 0 !important;
        max-width: none !important;
      }

      .summary-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      @page {
        size: A4;
        margin: 12mm;
      }
    }
  </style>
</head>
<body>
  <div class="print-message">جاري تحضير الملف للطباعة...</div>
  <div class="summary-content">
    ${summaryElement.innerHTML}
  </div>
  <script>
    async function waitForFontsAndPrint() {
      try {
        await document.fonts.ready;
        await new Promise((resolve) => setTimeout(resolve, 500));
        const message = document.querySelector(".print-message");
        if (message) {
          message.style.display = "none";
        }
        window.print();
      } catch (error) {
        console.error("Print error:", error);
        window.print();
      } finally {
        setTimeout(() => window.close(), 1000);
      }
    }

    waitForFontsAndPrint();
  </script>
</body>
</html>`;

    printWindow.document.write(printHtml);
    printWindow.document.close();

    showToast('✅ تم فتح نافذة الطباعة - اختر "حفظ كـ PDF" من قائمة الطباعة', "success", 6000);
  } catch (error) {
    console.error("خطأ في تحميل PDF:", error);
    showToast(`❌ حدث خطأ: ${error.message}`, "error", 4000);
  } finally {
    if (summaryActions) {
      summaryActions.style.display = originalActionsDisplay;
    }

    if (actionButtons) {
      actionButtons.style.display = originalButtonsDisplay;
    }
  }
}

// --- App Bootstrap ---
document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();

  document.getElementById("generate-btn")?.addEventListener("click", handleGenerateSummary);
  document.getElementById("copy-btn")?.addEventListener("click", handleCopySummary);
  document.getElementById("share-btn")?.addEventListener("click", handleShareSummary);
  document.getElementById("listen-summary-btn")?.addEventListener("click", handleListenSummary);
  document.getElementById("download-pdf-btn")?.addEventListener("click", handleDownloadPdf);
});
