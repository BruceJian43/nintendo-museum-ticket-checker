const BASE_URL = "https://museum-tickets.nintendo.com/en";

// Function to get settings from storage, with defaults
async function getSettings() {
  const result = await chrome.storage.sync.get({
    enabled: true,
    year: new Date().getFullYear(),
    months: [new Date().getMonth() + 1], // Default to an array with the current month
    interval: 60
  });
  return result;
}

async function checkNintendoMuseumTickets() {
  const { year, months } = await getSettings();
  const CALENDAR_URL = `${BASE_URL}/calendar`;

  const currentTime = new Date().toLocaleString();
  console.log(`[${currentTime}] Starting check for Year: ${year}, Months: [${months.join(', ')}]...`);

  const allAvailableDates = new Map();

  try {
    // Step 1: Establish a single session for all requests
    console.log("Establishing session...");
    await fetch(CALENDAR_URL);
    const xsrfCookie = await chrome.cookies.get({ url: BASE_URL, name: 'XSRF-TOKEN' });
    if (!xsrfCookie) throw new Error("Could not find XSRF-TOKEN cookie.");
    const xsrfToken = decodeURIComponent(xsrfCookie.value);
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'x-requested-with': 'XMLHttpRequest',
      'x-xsrf-token': xsrfToken,
      'Referer': CALENDAR_URL
    };
    console.log("Session established.");

    // Step 2: Loop through each selected month and fetch its data
    for (const month of months) {
      console.log(`--- Checking month: ${month}/${year} ---`);
      const API_URL = `${BASE_URL}/api/calendar?target_year=${year}&target_month=${month}`;
      const apiResponse = await fetch(API_URL, { headers });

      if (!apiResponse.ok) {
        console.warn(`API request failed for ${month}/${year} with status: ${apiResponse.status}`);
        continue; // Skip to the next month
      }
      
      const data = await apiResponse.json();
      const monthDates = [];
      if (data?.data?.calendar) {
        for (const [date, details] of Object.entries(data.data.calendar)) {
          if (details.apply_type === 3 && details.sale_status === 1 && details.open_status === 1) {
            monthDates.push(date);
          }
        }
      }

      if (monthDates.length > 0) {
        monthDates.sort();
        allAvailableDates.set(month, monthDates);
        console.log(`Found ${monthDates.length} available dates in ${month}/${year}.`);
      } else {
        console.log(`No tickets available for ${month}/${year}.`);
      }
    }

    // Step 3: Consolidate results and send one notification
    if (allAvailableDates.size > 0) {
      console.log("🎉 Tickets found! Sending notification.");
      sendNotification(allAvailableDates, year);
    } else {
      console.log("😞 No tickets found across all selected months.");
    }

  } catch (error) {
    console.error("An error occurred during the check:", error);
  }
}

function sendNotification(availableDatesByMonth, year) {
  const notificationId = `nintendo-ticket-alert-${Date.now()}`;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const notificationItems = [];
  for (const [month, dates] of availableDatesByMonth.entries()) {
    const monthName = monthNames[month - 1];
    dates.forEach(date => {
      // Extract day (e.g., '15' from '2025-11-15')
      const day = date.split('-')[2];
      notificationItems.push({ title: `${monthName} ${day}`, message: '' });
    });
  }

  chrome.notifications.create(notificationId, {
    type: 'list',
    iconUrl: 'icons/icon128.png',
    title: '🎟️ Nintendo Museum Tickets Available!',
    message: `Tickets found for year ${year}. See dates below:`,
    items: notificationItems,
    priority: 2
  });
}

// --- Main Alarm and Settings Logic (No changes needed here) ---
async function setupAlarm() {
  const { enabled, interval } = await getSettings();
  if (enabled) {
    const periodInMinutes = Math.max(1, interval / 60);
    chrome.alarms.create('ticketCheckAlarm', { periodInMinutes: periodInMinutes });
    console.log(`Alarm created. Will check every ${periodInMinutes} minute(s).`);
  } else {
    chrome.alarms.clear('ticketCheckAlarm');
    console.log('Alarm cleared. Checker is disabled.');
  }
}
chrome.runtime.onInstalled.addListener(setupAlarm);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ticketCheckAlarm') checkNintendoMuseumTickets();
});
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('Settings changed. Re-evaluating alarm.');
    setupAlarm();
  }
});