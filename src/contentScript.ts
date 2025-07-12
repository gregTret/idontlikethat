import { Comment, StorageData } from './types';
import './styles.css';

// Debug helper to store errors
const debugErrors: any[] = [];
(window as any).__idltDebugErrors = debugErrors;

class IDontLikeThat {
  private selectionMode = false;
  private hoveredElement: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private commentBoxes: Map<string, HTMLElement> = new Map();
  private existingComments: Comment[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await this.loadExistingComments();
      this.createToggleButton();
      this.setupEventListeners();
      this.displayExistingComments();
    } catch (error) {
      console.error('Failed to initialize I Don\'t Like That:', error);
      debugErrors.push({ type: 'init', error, stack: (error as Error).stack });
      // Still create the toggle button even if storage fails
      this.createToggleButton();
      this.setupEventListeners();
    }
  }

  private async loadExistingComments() {
    try {
      const currentUrl = window.location.href;
      const result = await chrome.storage.local.get('comments');
      const allComments: StorageData = result.comments || {};
      this.existingComments = allComments[currentUrl] || [];
    } catch (error) {
      console.error('Failed to load existing comments:', error);
      this.existingComments = [];
    }
  }

  private createToggleButton() {
    this.toggleButton = document.createElement('div');
    this.toggleButton.className = 'idlt-toggle-button';
    this.toggleButton.innerHTML = '✏️';
    this.toggleButton.title = 'Toggle feedback mode';
    
    // Add debug info to title if there are errors
    if (debugErrors.length > 0) {
      this.toggleButton.style.backgroundColor = '#fa5252';
      this.toggleButton.title = `Errors detected! Check console and type: window.__idltDebugErrors`;
    }
    
    document.body.appendChild(this.toggleButton);

    this.toggleButton.addEventListener('click', () => {
      try {
        this.toggleSelectionMode();
      } catch (error) {
        console.error('Error in toggleSelectionMode:', error);
        debugErrors.push({ type: 'toggle', error, stack: (error as Error).stack });
        alert('Error toggling selection mode. Check console for details.');
      }
    });
  }

  private async toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    console.log('Selection mode:', this.selectionMode);
    document.body.classList.toggle('idlt-selection-mode', this.selectionMode);
    
    if (this.toggleButton) {
      this.toggleButton.classList.toggle('active', this.selectionMode);
    }

    if (!this.selectionMode && this.hoveredElement) {
      this.hoveredElement.classList.remove('idlt-hover');
      this.hoveredElement = null;
    }
    
    // Show/hide selection mode indicator
    if (this.selectionMode) {
      this.showSelectionModeIndicator();
    } else {
      this.hideSelectionModeIndicator();
      // Check if we should auto-copy comments
      await this.checkAutoCopyOnExit();
    }
  }
  
  private showSelectionModeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'idlt-selection-indicator';
    indicator.innerHTML = 'Selection Mode Active - Press ESC to exit';
    document.body.appendChild(indicator);
  }
  
  private hideSelectionModeIndicator() {
    const indicator = document.querySelector('.idlt-selection-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  private async checkAutoCopyOnExit() {
    try {
      // Get settings
      const result = await chrome.storage.local.get('settings');
      const settings = result.settings || { autoCopyOnExit: false };
      
      if (settings.autoCopyOnExit && this.existingComments.length > 0) {
        // Copy current page comments to clipboard
        await this.copyPageCommentsToClipboard();
      }
    } catch (error) {
      console.error('Error checking auto-copy setting:', error);
    }
  }
  
  private async copyPageCommentsToClipboard() {
    let clipboardText = '';
    
    this.existingComments.forEach((comment) => {
      clipboardText += `Page: ${comment.pageUrl}\n`;
      clipboardText += `Element: ${comment.selector}\n`;
      
      // Extract text content from the element HTML if available
      if (comment.elementHtml) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = comment.elementHtml;
        const textContent = tempDiv.textContent?.trim() || '';
        if (textContent && textContent.length > 0) {
          const truncatedText = textContent.length > 500 
            ? textContent.substring(0, 500) + '...' 
            : textContent;
          clipboardText += `Text: "${truncatedText}"\n`;
        }
      }
      
      clipboardText += `Feedback: ${comment.comment}\n\n`;
    });
    
    if (clipboardText.trim()) {
      try {
        await navigator.clipboard.writeText(clipboardText.trim());
        // Show a brief notification
        this.showCopyNotification();
      } catch (err) {
        console.error('Failed to auto-copy comments:', err);
      }
    }
  }
  
  private showCopyNotification() {
    const notification = document.createElement('div');
    notification.className = 'idlt-copy-notification';
    notification.textContent = 'Comments copied to clipboard!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private setupEventListeners() {
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleClick.bind(this), true); // Use capture phase
    
    // Also add pointer events for better compatibility
    document.addEventListener('pointerdown', (e) => {
      if (!this.selectionMode) return;
      const target = e.target as HTMLElement;
      if (!this.isSystemElement(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_SELECTION_MODE') {
        this.toggleSelectionMode();
      }
      // Return true to indicate we'll respond asynchronously (even though we don't)
      return true;
    });
    
    // Add ESC key listener to exit selection mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.selectionMode) {
        this.toggleSelectionMode();
        console.log('Exited selection mode via ESC key');
      }
    });
  }

  private handleMouseOver(e: MouseEvent) {
    if (!this.selectionMode) return;
    
    const target = e.target as HTMLElement;
    if (this.isSystemElement(target)) return;

    if (this.hoveredElement && this.hoveredElement !== target) {
      this.hoveredElement.classList.remove('idlt-hover');
    }

    this.hoveredElement = target;
    target.classList.add('idlt-hover');
  }

  private handleMouseOut(e: MouseEvent) {
    if (!this.selectionMode) return;
    
    const target = e.target as HTMLElement;
    if (this.isSystemElement(target)) return;

    target.classList.remove('idlt-hover');
    if (this.hoveredElement === target) {
      this.hoveredElement = null;
    }
  }

  private handleClick(e: MouseEvent) {
    if (!this.selectionMode) return;
    
    const target = e.target as HTMLElement;
    if (this.isSystemElement(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    console.log('Element clicked:', target);
    this.createCommentBox(target);
    // Don't toggle off selection mode after clicking
  }

  private isSystemElement(element: HTMLElement): boolean {
    return element.classList.contains('idlt-toggle-button') ||
           element.classList.contains('idlt-comment-box') ||
           element.closest('.idlt-comment-box') !== null ||
           element.closest('.idlt-toggle-button') !== null;
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const path: string[] = [];
    let currentElement: HTMLElement | null = element;

    while (currentElement && currentElement !== document.body) {
      let selector = currentElement.tagName.toLowerCase();
      
      if (currentElement.className) {
        const classes = Array.from(currentElement.classList)
          .filter(cls => !cls.startsWith('idlt-'))
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      const siblings = currentElement.parentElement?.children;
      if (siblings && siblings.length > 1) {
        const index = Array.from(siblings).indexOf(currentElement) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      currentElement = currentElement.parentElement;
    }

    return path.join(' > ');
  }

  private createCommentBox(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const commentBox = document.createElement('div');
    commentBox.className = 'idlt-comment-box';
    
    const commentId = `comment-${Date.now()}`;
    
    commentBox.innerHTML = `
      <div class="idlt-comment-header">
        <span>Add Feedback</span>
        <button class="idlt-close-btn">✕</button>
      </div>
      <textarea class="idlt-comment-textarea" placeholder="What don't you like about this element? (Enter to save, Esc to cancel)"></textarea>
      <div class="idlt-comment-actions">
        <button class="idlt-save-btn">Save</button>
        <button class="idlt-cancel-btn">Cancel</button>
      </div>
    `;

    commentBox.style.position = 'absolute';
    commentBox.style.top = `${rect.bottom + window.scrollY + 10}px`;
    commentBox.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(commentBox);
    
    const textarea = commentBox.querySelector('.idlt-comment-textarea') as HTMLTextAreaElement;
    const saveBtn = commentBox.querySelector('.idlt-save-btn') as HTMLButtonElement;
    const cancelBtn = commentBox.querySelector('.idlt-cancel-btn') as HTMLButtonElement;
    const closeBtn = commentBox.querySelector('.idlt-close-btn') as HTMLButtonElement;

    const removeCommentBox = () => {
      commentBox.remove();
      this.commentBoxes.delete(commentId);
    };

    const saveComment = async () => {
      const commentText = textarea.value.trim();
      if (!commentText) return;

      const comment: Comment = {
        id: commentId,
        selector: this.getElementSelector(element),
        comment: commentText,
        timestamp: Date.now(),
        pageUrl: window.location.href,
        elementHtml: element.outerHTML,
        boundingBox: rect.toJSON()
      };

      await this.saveComment(comment);
      removeCommentBox();
      this.displayComment(comment);
      // Stay in selection mode after saving
    };

    // Save on button click
    saveBtn.addEventListener('click', () => saveComment());

    // Save on Enter key
    const handleKeyEvent = async (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        await saveComment();
        return false;
      }
      // Close on Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        removeCommentBox();
        return false;
      }
    };
    
    // Add both keydown and keypress listeners for better compatibility
    textarea.addEventListener('keydown', handleKeyEvent, true);
    textarea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);

    cancelBtn.addEventListener('click', removeCommentBox);
    closeBtn.addEventListener('click', removeCommentBox);

    this.commentBoxes.set(commentId, commentBox);
    textarea.focus();
  }

  private async saveComment(comment: Comment) {
    try {
      const result = await chrome.storage.local.get('comments');
      const allComments: StorageData = result.comments || {};
      
      if (!allComments[comment.pageUrl]) {
        allComments[comment.pageUrl] = [];
      }
      
      allComments[comment.pageUrl].push(comment);
      this.existingComments.push(comment);
      
      await chrome.storage.local.set({ comments: allComments });
    } catch (error) {
      console.error('Failed to save comment:', error);
      // Still add to local array even if storage fails
      this.existingComments.push(comment);
    }
  }

  private displayExistingComments() {
    this.existingComments.forEach(comment => {
      this.displayComment(comment);
    });
  }

  private displayComment(comment: Comment) {
    const marker = document.createElement('div');
    marker.className = 'idlt-comment-marker';
    marker.innerHTML = '💬';
    marker.title = comment.comment;
    
    const element = document.querySelector(comment.selector) as HTMLElement;
    if (element) {
      const rect = element.getBoundingClientRect();
      marker.style.position = 'absolute';
      marker.style.top = `${rect.top + window.scrollY}px`;
      marker.style.left = `${rect.right + window.scrollX + 5}px`;
      
      marker.addEventListener('click', () => {
        this.showCommentDetails(comment, marker);
      });
      
      document.body.appendChild(marker);
    }
  }

  private showCommentDetails(comment: Comment, marker: HTMLElement) {
    const existingDetails = document.querySelector('.idlt-comment-details');
    if (existingDetails) {
      existingDetails.remove();
    }

    const detailsBox = document.createElement('div');
    detailsBox.className = 'idlt-comment-details';
    
    detailsBox.innerHTML = `
      <div class="idlt-comment-header">
        <span>Feedback</span>
        <button class="idlt-close-btn">✕</button>
      </div>
      <div class="idlt-comment-content">${comment.comment}</div>
      <div class="idlt-comment-meta">
        <small>${new Date(comment.timestamp).toLocaleString()}</small>
      </div>
      <div class="idlt-comment-actions">
        <button class="idlt-copy-prompt-btn">Copy Prompt</button>
        <button class="idlt-delete-btn">Delete</button>
      </div>
    `;

    const markerRect = marker.getBoundingClientRect();
    detailsBox.style.position = 'absolute';
    detailsBox.style.top = `${markerRect.bottom + window.scrollY + 5}px`;
    detailsBox.style.left = `${markerRect.left + window.scrollX}px`;
    
    document.body.appendChild(detailsBox);

    const closeBtn = detailsBox.querySelector('.idlt-close-btn') as HTMLButtonElement;
    const copyBtn = detailsBox.querySelector('.idlt-copy-prompt-btn') as HTMLButtonElement;
    const deleteBtn = detailsBox.querySelector('.idlt-delete-btn') as HTMLButtonElement;

    closeBtn.addEventListener('click', () => detailsBox.remove());
    
    // Add keyboard listener for Escape to close details
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        detailsBox.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    
    copyBtn.addEventListener('click', () => {
      this.copyPromptToClipboard(comment);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Prompt';
      }, 2000);
    });

    deleteBtn.addEventListener('click', async () => {
      await this.deleteComment(comment);
      marker.remove();
      detailsBox.remove();
    });
  }

  private generatePrompt(comment: Comment): string {
    // Extract text content from the element HTML if available
    let elementText = '';
    if (comment.elementHtml) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = comment.elementHtml;
      elementText = tempDiv.textContent?.trim() || '';
      if (elementText.length > 500) {
        elementText = elementText.substring(0, 500) + '...';
      }
    }
    
    let prompt = `Page: ${comment.pageUrl}\n`;
    prompt += `Element: ${comment.selector}\n`;
    if (elementText) {
      prompt += `Text: "${elementText}"\n`;
    }
    prompt += `Feedback: ${comment.comment}`;
    
    return prompt;
  }

  private async copyPromptToClipboard(comment: Comment) {
    const prompt = this.generatePrompt(comment);
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  }

  private async deleteComment(comment: Comment) {
    try {
      const result = await chrome.storage.local.get('comments');
      const allComments: StorageData = result.comments || {};
      
      if (allComments[comment.pageUrl]) {
        allComments[comment.pageUrl] = allComments[comment.pageUrl].filter(
          c => c.id !== comment.id
        );
        
        if (allComments[comment.pageUrl].length === 0) {
          delete allComments[comment.pageUrl];
        }
      }
      
      this.existingComments = this.existingComments.filter(c => c.id !== comment.id);
      await chrome.storage.local.set({ comments: allComments });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      // Still remove from local array even if storage fails
      this.existingComments = this.existingComments.filter(c => c.id !== comment.id);
    }
  }
  
  public cleanup() {
    // Remove toggle button
    if (this.toggleButton) {
      this.toggleButton.remove();
      this.toggleButton = null;
    }
    
    // Remove all comment markers
    this.commentBoxes.forEach(box => box.remove());
    this.commentBoxes.clear();
    
    // Remove selection mode if active
    if (this.selectionMode) {
      this.selectionMode = false;
      document.body.classList.remove('idlt-selection-mode');
      this.hideSelectionModeIndicator();
    }
    
    // Remove hover state
    if (this.hoveredElement) {
      this.hoveredElement.classList.remove('idlt-hover');
      this.hoveredElement = null;
    }
  }
}

// Store instance globally to handle messages
let extensionInstance: IDontLikeThat | null = null;

// Initialize the extension with error handling
async function initializeExtension() {
  try {
    // Check if extension is enabled
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || { extensionEnabled: true };
    
    if (settings.extensionEnabled !== false) {
      extensionInstance = new IDontLikeThat();
      console.log('I Don\'t Like That extension initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize I Don\'t Like That extension:', error);
    debugErrors.push({ type: 'startup', error, stack: (error as Error).stack });
    
    // Show a visible error indicator
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #fa5252;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 999999;
      font-family: monospace;
      font-size: 12px;
    `;
    errorDiv.textContent = 'IDLT Extension Error! Check console.';
    document.body.appendChild(errorDiv);
  }
}

// Initialize on load
initializeExtension();

// Listen for extension state changes from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_EXTENSION_STATE') {
    if (message.enabled && !extensionInstance) {
      // Extension was re-enabled, create new instance
      extensionInstance = new IDontLikeThat();
    } else if (!message.enabled && extensionInstance) {
      // Extension was disabled, cleanup and remove instance
      extensionInstance.cleanup();
      extensionInstance = null;
    }
  }
  return true;
});