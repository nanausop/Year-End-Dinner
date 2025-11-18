// Dinner & registration countdowns + live guest count from Google Sheets
(function () {
  // --- CONFIG: set your event times here (MYT / UTC+8) ---
  const DINNER_TARGET = new Date("2025-12-24T18:30:00+08:00").getTime();
  const REG_TARGET = new Date("2025-12-16T23:59:00+08:00").getTime();

  // --- CONFIG: Google Apps Script Web App URL for guest count ---
  // 1. Create an Apps Script tied to your Google Sheet.
  // 2. Paste the sample code (see comment at bottom of this file).
  // 3. Deploy as a web app (Anyone with the link can access).
  // 4. Copy the deployment URL and paste it below.
  const GUEST_API_URL = "https://script.google.com/macros/s/AKfycbwjM162BwhPvh7dIzq9QXqyK9bhZt7Mcm9zQ-vGtbzyBazmeYjaXFLMYYq1QaWOp8o1YQ/exec";

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
  const guestCountEl = document.getElementById("guestCount");
  const guestStatusEl = document.getElementById("guestStatus");

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

  // Fetch confirmed guests count from Google Sheets via Apps Script
  function fetchGuestCount() {
    if (!GUEST_API_URL || GUEST_API_URL === "PASTE_YOUR_WEB_APP_URL_HERE") {
      guestStatusEl.textContent =
        "Guest counter not connected yet. Please add your Apps Script Web App URL in script.js.";
      return;
    }

    fetch(GUEST_API_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(function (data) {
        if (typeof data.confirmedGuests === "number") {
          guestCountEl.textContent = data.confirmedGuests;
          guestStatusEl.textContent =
            "Live count from Google Sheets (updates every 30 seconds).";
        } else {
          guestStatusEl.textContent =
            "Could not find 'confirmedGuests' in the response.";
        }
      })
      .catch(function (error) {
        console.error("Error fetching guest count:", error);
        guestStatusEl.textContent =
          "Error fetching guest count. Please check your Apps Script URL.";
      });
  }

  function startGuestPolling() {
    fetchGuestCount();
    // Update every 30 seconds
    setInterval(fetchGuestCount, 30000);
  }

  // Init
  document.addEventListener("DOMContentLoaded", function () {
    startCountdowns();
    startGuestPolling();
  });
})();

/*
========================
Google Apps Script (Server)
========================
Use this code in an Apps Script project linked to your Google Sheet.

1. Open your Google Sheet.
2. Extensions -> Apps Script.
3. Delete any default code and paste this:

function doGet(e) {
  // Replace with your own Sheet ID and sheet name if needed
  var sheet = SpreadsheetApp.openById("1ud1IhldDdoat1zas1zXOfDZ_MfTNdetpRjUgZJXvu60")
                             .getSheets()[0]; // first sheet

  // Get all values from column C, starting row 2 (skip header)
  var values = sheet.getRange("C2:C").getValues();

  // Count non-empty cells
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] !== "" && values[i][0] !== null) {
      count++;
    }
  }

  var result = { confirmedGuests: count };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

4. Click "Deploy" -> "New deployment".
5. Choose "Web app" as the deployment type.
6. Set "Who has access" to "Anyone with the link".
7. Deploy and copy the Web App URL.
8. Paste that URL into the GUEST_API_URL constant in script.js.
*/
