// Function to extract Dashboard GUID from New Relic URL
function getDashboardGuidFromUrl() {
  const url = window.location.href;
  const match = url.match(/\/detail\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// Function to inject UI elements and handle blinking
function createSyncStatusUI() {
  let statusDiv = document.getElementById('nr-sync-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'nr-sync-status';
    statusDiv.style.position = 'fixed';
    statusDiv.style.top = '10px';
    statusDiv.style.left = '10px';
    statusDiv.style.zIndex = '99999';
    statusDiv.style.padding = '8px 15px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.color = 'white';
    statusDiv.style.fontWeight = 'bold';
    statusDiv.style.fontSize = '14px';
    statusDiv.style.display = 'flex';
    statusDiv.style.alignItems = 'center';
    statusDiv.style.gap = '8px';
    document.body.appendChild(statusDiv);
  }
  return statusDiv;
}

function updateStatusUI(statusDiv, inSync, message) {
  statusDiv.classList.remove('sync', 'out-of-sync', 'error', 'blinking');
  statusDiv.textContent = ''; // Clear previous content

  const icon = document.createElement('span');
  icon.style.fontSize = '18px';

  const text = document.createElement('span');
  text.textContent = message;

  if (inSync === true) {
    statusDiv.classList.add('sync');
    statusDiv.style.backgroundColor = '#4CAF50'; // Green
    icon.textContent = '✅';
  } else if (inSync === false) {
    statusDiv.classList.add('out-of-sync');
    statusDiv.style.backgroundColor = '#f44336'; // Red
    icon.textContent = '⚠️';
    statusDiv.classList.add('blinking'); // Start blinking
  } else { // Error or initial state
    statusDiv.classList.add('error');
    statusDiv.style.backgroundColor = '#FFC107'; // Orange
    icon.textContent = 'ℹ️';
  }
  statusDiv.appendChild(icon);
  statusDiv.appendChild(text);
}

// Observe URL changes to re-check dashboard
let lastGuid = null;
const observer = new MutationObserver(() => {
  const currentGuid = getDashboardGuidFromUrl();
  if (currentGuid && currentGuid !== lastGuid) {
    lastGuid = currentGuid;
    console.log('New Relic Dashboard GUID detected:', currentGuid);
    checkDashboardSync(currentGuid);
  } else if (!currentGuid && lastGuid) {
    lastGuid = null;
    const statusDiv = document.getElementById('nr-sync-status');
    if (statusDiv) statusDiv.remove(); // Remove UI if not on a dashboard
  }
});

// Start observing the body for changes in the DOM, including URL
observer.observe(document.body, { childList: true, subtree: true });


// Initial check on page load
window.addEventListener('load', () => {
  const initialGuid = getDashboardGuidFromUrl();
  if (initialGuid) {
    lastGuid = initialGuid;
    console.log('Initial New Relic Dashboard GUID detected:', initialGuid);
    // checkDashboardSync(initialGuid);
    startPeriodicCheck(initialGuid);
  }
});

async function checkDashboardSync(guid) {
  const statusUI = createSyncStatusUI();
  updateStatusUI(statusUI, null, 'Checking sync status...');

  chrome.runtime.sendMessage({ action: 'compareDashboards', guid: guid }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError.message);
      updateStatusUI(statusUI, null, 'Extension Error: Check console for details.');
      return;
    }

    if (response.status === 'success') {
      console.log(response.inSync);
      if (response.inSync) {
        updateStatusUI(statusUI, true, 'Dashboard is in sync with GitHub');
      } else {
        updateStatusUI(statusUI, false, 'Dashboard is OUT OF SYNC with GitHub!');
      }
    } else {
      updateStatusUI(statusUI, null, response.message);
    }
  });
}

const CHECK_INTERVAL_MS = 30 * 1000;
let intervalId = null;

// Function to start the periodic check
function startPeriodicCheck(guid) {
  // Clear any existing interval to prevent multiple checks running
  if (intervalId) {
    clearInterval(intervalId);
  }
  currentDashboardGuid = guid;
  checkDashboardSync(currentDashboardGuid); // Initial check immediately
  intervalId = setInterval(() => {
    // Only perform check if still on the same dashboard
    if (getDashboardGuidFromUrl() === currentDashboardGuid) {
      checkDashboardSync(currentDashboardGuid);
    } else {
      // If the URL changed, stop this interval and let the observer handle it
      clearInterval(intervalId);
      intervalId = null;
    }
  }, CHECK_INTERVAL_MS);
}

// Function to stop the periodic check and remove UI
function stopPeriodicCheck() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  currentDashboardGuid = null;
  const statusDiv = document.getElementById('nr-sync-status');
  if (statusDiv) statusDiv.remove(); // Remove UI
}
