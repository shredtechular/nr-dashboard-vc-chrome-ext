document.addEventListener('DOMContentLoaded', () => {
  const settingsForm = document.getElementById('settingsForm');
  const statusMessage = document.getElementById('statusMessage');

  // Load saved settings
  chrome.storage.sync.get(['newRelicApiKey', 'githubPat', 'githubOwner', 'githubRepo', 'githubBranch', 'githubDashboardPath'], (items) => {
    document.getElementById('newRelicApiKey').value = items.newRelicApiKey || '';
    document.getElementById('githubPat').value = items.githubPat || '';
    document.getElementById('githubOwner').value = items.githubOwner || '';
    document.getElementById('githubRepo').value = items.githubRepo || '';
    document.getElementById('githubBranch').value = items.githubBranch || 'main';
    document.getElementById('githubDashboardPath').value = items.githubDashboardPath || 'dashboards/';
  });

  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newRelicApiKey = document.getElementById('newRelicApiKey').value;
    const githubPat = document.getElementById('githubPat').value;
    const githubOwner = document.getElementById('githubOwner').value;
    const githubRepo = document.getElementById('githubRepo').value;
    const githubBranch = document.getElementById('githubBranch').value;
    const githubDashboardPath = document.getElementById('githubDashboardPath').value;

    chrome.storage.sync.set({
      newRelicApiKey,
      githubPat,
      githubOwner,
      githubRepo,
      githubBranch,
      githubDashboardPath
    }, () => {
      statusMessage.textContent = 'Settings saved successfully!';
      statusMessage.style.color = 'green';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);
    });
  });
});