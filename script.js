// Year End Dinner dashboard: countdowns + live guest chart from Google Sheets
(function () {
  // --- CONFIG: set your event times here (MYT / UTC+8) ---
  const DINNER_TARGET = new Date("2025-12-24T18:30:00+08:00").getTime();
  const REG_TARGET = new Date("2025-12-16T23:59:00+08:00").getTime();

  // --- CONFIG: Google Apps Script Web App URL for guest breakdown ---
  const GUEST_API_URL = "PASTE_YOUR_WEB_APP_URL_HERE";

  // Elements: Dinner
  const dinnerDays = document.getElementById("dinnerDays");
  const dinnerHours = document.getElementById("dinnerHours");
  const dinnerMinutes = document.getElementById("dinnerMinutes");
  const dinnerSeconds = document.getElementById("dinnerSeconds");
  const dinnerStatus = document.getElementById("dinnerStatus");

  // Elements: Registration
  const regDays = document.getElementById("regDays");
  const regHours = document.getElementById("regHours");
  const regMinutes = document.getElementById("regMinutes");
  const regSeconds = document.getElementById("regSeconds");
  const regStatus = document.getElementById("regStatus");

  // Elements: Guests
  const guestTotalEl = document.getElementById("guestTotal");
  const guestStatusEl = document.getElementById("guestStatus");
  const chartCanvas = document.getElementById("guestChart");
  const chartCtx = chartCanvas.getContext("2d");

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function updateCountdown(targetTime, daysEl, hoursEl, minutesEl, secondsEl, statusEl, finishedMessage) {
    const now = Date.now();
    const diff = targetTime - now;

    if (diff <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      statusEl.textContent = finishedMessage;
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds / (60 * 60)) % 24);
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);
  }

  function startCountdowns() {
    function tick() {
      updateCountdown(
        DINNER_TARGET,
        dinnerDays,
        dinnerHours,
        dinnerMinutes,
        dinnerSeconds,
        dinnerStatus,
        "🎉 It's dinner time!"
      );
      updateCountdown(
        REG_TARGET,
        regDays,
        regHours,
        regMinutes,
        regSeconds,
        regStatus,
        "Registration & payment period has ended."
      );
    }
    tick();
    setInterval(tick, 1000);
  }

  // --- Simple bar chart renderer using Canvas ---
  function renderGuestChart(categories) {
    if (!categories || categories.length === 0) {
      chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
      return;
    }

    const rect = chartCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 55, left: 35 };

    chartCtx.clearRect(0, 0, width, height);

    const values = categories.map(c => c.value);
    const labels = categories.map(c => c.label);

    const maxVal = Math.max(...values, 1);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const barCount = categories.length;
    const barGapRatio = 0.35;
    const slotWidth = chartWidth / barCount;
    const barWidth = slotWidth * (1 - barGapRatio);

    // Baseline
    chartCtx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    chartCtx.lineWidth = 1;
    chartCtx.beginPath();
    chartCtx.moveTo(padding.left, padding.top + chartHeight);
    chartCtx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    chartCtx.stroke();

    categories.forEach((cat, index) => {
      const value = cat.value;
      const barHeight = (value / maxVal) * (chartHeight - 10);
      const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;

      const radius = 6;
      chartCtx.fillStyle = "rgba(239, 68, 68, 0.9)";
      chartCtx.beginPath();
      chartCtx.moveTo(x, y + barHeight);
      chartCtx.lineTo(x, y + radius);
      chartCtx.quadraticCurveTo(x, y, x + radius, y);
      chartCtx.lineTo(x + barWidth - radius, y);
      chartCtx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      chartCtx.lineTo(x + barWidth, y + barHeight);
      chartCtx.closePath();
      chartCtx.fill();

      // Value label
      chartCtx.fillStyle = "#111827";
      chartCtx.font = "11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      chartCtx.textAlign = "center";
      chartCtx.fillText(String(value), x + barWidth / 2, y - 4);

      // Category label (wrap if long)
      chartCtx.fillStyle = "#6b7280";
      const label = labels[index] || (`Group ${index + 1}`);
      const maxLabelWidth = slotWidth;
      const words = label.split(" ");
      let line = "";
      const lines = [];
      for (let i = 0; i < words.length; i++) {
        const testLine = line ? line + " " + words[i] : words[i];
        const metrics = chartCtx.measureText(testLine);
        if (metrics.width > maxLabelWidth && line) {
          lines.push(line);
          line = words[i];
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
      const labelBaseY = padding.top + chartHeight + 15;
      lines.forEach((ln, lineIdx) => {
        chartCtx.fillText(ln, x + barWidth / 2, labelBaseY + lineIdx * 12);
      });
    });
  }

  function fetchGuestData() {
    if (!GUEST_API_URL || GUEST_API_URL === "PASTE_YOUR_WEB_APP_URL_HERE") {
      guestStatusEl.textContent = "";
      return;
    }

    fetch(GUEST_API_URL, { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(data => {
        if (typeof data.totalConfirmed === "number") {
          guestTotalEl.textContent = data.totalConfirmed;
        }

        if (Array.isArray(data.categories)) {
          renderGuestChart(data.categories);
          guestStatusEl.textContent = "";
        } else {
          guestStatusEl.textContent =
            "Problem reading categories from sheet. Please check Apps Script.";
        }
      })
      .catch(error => {
        console.error("Error fetching guest data:", error);
        guestStatusEl.textContent =
          "Error fetching guest data. Please check your Apps Script URL.";
      });
  }

  function startGuestPolling() {
    fetchGuestData();
    setInterval(fetchGuestData, 30000);
  }

  window.addEventListener("resize", () => {
    fetchGuestData();
  });

  document.addEventListener("DOMContentLoaded", () => {
    startCountdowns();
    startGuestPolling();
  });
})();

/*
Google Apps Script reminder (same as previous version):

- Column I: label for each COUNTIF group (e.g. "Adult (Paid)", "Kids", etc.)
- Column J: COUNTIF result (number of guests) for that group, from row 2 down.

function doGet(e) {
  var sheet = SpreadsheetApp.openById("1ud1IhldDdoat1zas1zXOfDZ_MfTNdetpRjUgZJXvu60")
                             .getSheets()[0];

  var labelRange = sheet.getRange("I2:I");
  var valueRange = sheet.getRange("J2:J");
  var labels = labelRange.getValues();
  var values = valueRange.getValues();

  var categories = [];
  var total = 0;

  for (var i = 0; i < values.length; i++) {
    var val = values[i][0];
    if (val === "" || val === null) continue;
    var num = Number(val);
    if (isNaN(num)) continue;
    var label = labels[i][0] || ("Group " + (i + 1));
    categories.push({ label: label, value: num });
    total += num;
  }

  var result = { totalConfirmed: total, categories: categories };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
