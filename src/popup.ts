import { StorageData } from './types';

// Load and save settings
async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  const settings = result.settings || { autoCopyOnExit: true, extensionEnabled: true, theme: 'dark' };
  const autoCopyCheckbox = document.getElementById('autoCopyOnExit') as HTMLInputElement;
  if (autoCopyCheckbox) {
    autoCopyCheckbox.checked = settings.autoCopyOnExit;
  }
  const enabledCheckbox = document.getElementById('extensionEnabled') as HTMLInputElement;
  if (enabledCheckbox) {
    enabledCheckbox.checked = settings.extensionEnabled !== false;
  }
  
  // Load theme
  const theme = settings.theme || 'dark';
  document.body.setAttribute('data-theme', theme);
  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
  if (themeToggle) {
    themeToggle.checked = theme === 'dark';
  }
  
  return settings;
}

async function saveSettings() {
  const autoCopyCheckbox = document.getElementById('autoCopyOnExit') as HTMLInputElement;
  const enabledCheckbox = document.getElementById('extensionEnabled') as HTMLInputElement;
  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
  const settings = {
    autoCopyOnExit: autoCopyCheckbox.checked,
    extensionEnabled: enabledCheckbox.checked,
    theme: themeToggle?.checked ? 'dark' : 'light'
  };
  await chrome.storage.local.set({ settings });
  
  // Send message to all tabs to update button visibility
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'UPDATE_EXTENSION_STATE', 
          enabled: enabledCheckbox.checked 
        });
      } catch (e) {
        // Content script might not be loaded on this tab
      }
    }
  }
}

async function updateStats() {
  const result = await chrome.storage.local.get('comments');
  const allComments: StorageData = result.comments || {};
  
  let totalComments = 0;
  let pageComments = 0;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab.url || '';
  
  for (const url in allComments) {
    const comments = allComments[url];
    totalComments += comments.length;
    
    if (url === currentUrl) {
      pageComments = comments.length;
    }
  }
  
  document.getElementById('totalComments')!.textContent = totalComments.toString();
  document.getElementById('pageComments')!.textContent = pageComments.toString();
}

document.getElementById('toggleMode')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECTION_MODE' });
      window.close();
    } catch (error) {
      console.error('Failed to toggle selection mode:', error);
      // Try injecting the content script if it's not loaded
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      }).then(() => {
        // Try again after injection
        chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_SELECTION_MODE' });
        window.close();
      }).catch(err => {
        showMessage('Unable to activate on this page. Try refreshing the page.');
        console.error('Script injection failed:', err);
      });
    }
  }
});

// Export as JSON file
document.getElementById('exportJSON')?.addEventListener('click', async () => {
  const result = await chrome.storage.local.get('comments');
  const allComments: StorageData = result.comments || {};
  
  const exportData = [];
  for (const url in allComments) {
    for (const comment of allComments[url]) {
      // Extract text content if available
      let elementText = '';
      if (comment.elementHtml) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = comment.elementHtml;
        elementText = tempDiv.textContent?.trim() || '';
        if (elementText.length > 500) {
          elementText = elementText.substring(0, 500) + '...';
        }
      }
      
      exportData.push({
        page: comment.pageUrl,
        element: comment.selector,
        text: elementText,
        feedback: comment.comment
      });
    }
  }
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  chrome.downloads.download({
    url: url,
    filename: `i-dont-like-that-export-${Date.now()}.json`
  });
});

// Copy to clipboard
document.getElementById('copyToClipboard')?.addEventListener('click', async () => {
  const result = await chrome.storage.local.get('comments');
  const allComments: StorageData = result.comments || {};
  
  // Format for clipboard - create a concise format
  let clipboardText = '';
  
  Object.entries(allComments).forEach(([, comments]) => {
    comments.forEach((comment) => {
      clipboardText += `Page: ${comment.pageUrl}\n`;
      clipboardText += `Element: ${comment.selector}\n`;
      
      // Extract text content from the element HTML if available
      if (comment.elementHtml) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = comment.elementHtml;
        const textContent = tempDiv.textContent?.trim() || '';
        if (textContent && textContent.length > 0) {
          // Limit text content to 500 chars
          const truncatedText = textContent.length > 500 
            ? textContent.substring(0, 500) + '...' 
            : textContent;
          clipboardText += `Text: "${truncatedText}"\n`;
        }
      }
      
      clipboardText += `Feedback: ${comment.comment}\n\n`;
    });
  });
  
  try {
    await navigator.clipboard.writeText(clipboardText.trim());
    
    // Show success feedback
    const button = document.getElementById('copyToClipboard') as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#51cf66';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    showMessage('Failed to copy to clipboard. Please try again.');
  }
});

// Confirmation dialog helpers
function showConfirmation(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmationOverlay')!;
    const titleEl = document.getElementById('confirmTitle')!;
    const messageEl = document.getElementById('confirmMessage')!;
    const cancelBtn = document.getElementById('confirmCancel')!;
    const confirmBtn = document.getElementById('confirmAction')!;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.style.display = 'flex';
    
    const cleanup = () => {
      overlay.style.display = 'none';
      cancelBtn.removeEventListener('click', handleCancel);
      confirmBtn.removeEventListener('click', handleConfirm);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
  });
}

function showMessage(message: string) {
  const overlay = document.getElementById('confirmationOverlay')!;
  const titleEl = document.getElementById('confirmTitle')!;
  const messageEl = document.getElementById('confirmMessage')!;
  const cancelBtn = document.getElementById('confirmCancel')!;
  const confirmBtn = document.getElementById('confirmAction')!;
  
  titleEl.textContent = 'Notice';
  messageEl.textContent = message;
  overlay.style.display = 'flex';
  
  // Hide confirm button, only show OK
  confirmBtn.style.display = 'none';
  cancelBtn.textContent = 'OK';
  
  const cleanup = () => {
    overlay.style.display = 'none';
    confirmBtn.style.display = '';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.removeEventListener('click', handleOk);
  };
  
  const handleOk = () => {
    cleanup();
  };
  
  cancelBtn.addEventListener('click', handleOk);
}

document.getElementById('clearPage')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab.url || '';
  
  const result = await chrome.storage.local.get('comments');
  const allComments: StorageData = result.comments || {};
  const pageComments = allComments[currentUrl] || [];
  
  if (pageComments.length === 0) {
    showMessage('No comments on this page.');
    return;
  }
  
  const confirmed = await showConfirmation(
    'Clear Page Comments',
    `Delete ${pageComments.length} comment${pageComments.length > 1 ? 's' : ''} on this page?`
  );
  
  if (!confirmed) {
    return;
  }
  
  delete allComments[currentUrl];
  await chrome.storage.local.set({ comments: allComments });
  
  await updateStats();
  
  if (tab.id) {
    chrome.tabs.reload(tab.id);
  }
});

// Clear all comments across all pages
document.getElementById('clearAll')?.addEventListener('click', async () => {
  const result = await chrome.storage.local.get('comments');
  const allComments: StorageData = result.comments || {};
  
  // Count total comments
  let totalCount = 0;
  for (const url in allComments) {
    totalCount += allComments[url].length;
  }
  
  if (totalCount === 0) {
    showMessage('No comments to clear.');
    return;
  }
  
  const confirmed = await showConfirmation(
    'Clear All Comments',
    `Delete ALL ${totalCount} comments across all pages? This cannot be undone.`
  );
  
  if (!confirmed) {
    return;
  }
  
  // Clear all comments
  await chrome.storage.local.set({ comments: {} });
  
  await updateStats();
  
  // Reload current tab to reflect changes
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    chrome.tabs.reload(tab.id);
  }
});

// Add checkbox event listeners
document.getElementById('autoCopyOnExit')?.addEventListener('change', () => {
  saveSettings();
});

document.getElementById('extensionEnabled')?.addEventListener('change', () => {
  saveSettings();
});

// Initialize popup
loadSettings();
updateStats();

// Add theme toggle event listener
document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  const theme = target.checked ? 'dark' : 'light';
  document.body.setAttribute('data-theme', theme);
  saveSettings();
});