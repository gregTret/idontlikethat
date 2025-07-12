chrome.runtime.onInstalled.addListener(() => {
  console.log('I Don\'t Like That extension installed');
});

// Note: We don't need action.onClicked since we have a popup