/**
 * AGGRESSIVE Meeting ID Copy Script
 * Uses multiple methods and forced approaches to ensure functionality
 */

(function() {
  'use strict';
  
  let MEETING_ID = null;
  let retryCount = 0;
  const MAX_RETRIES = 50;
  let copyButton = null;
  let meetingIdInput = null;
  
  // Force create CSS styles immediately
  const forceCreateStyles = () => {
    const styleId = 'aggressive-meeting-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .copy-btn {
        transition: all 0.2s ease !important;
        cursor: pointer !important;
        outline: none !important;
        border: 1px solid #d1d5db !important;
        background: #6b7280 !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 40px !important;
        height: 36px !important;
        font-size: 14px !important;
      }
      
      .copy-btn:hover {
        background: #4b5563 !important;
        transform: translateY(-1px) !important;
      }
      
      .copy-btn:active {
        transform: translateY(0) !important;
      }
      
      .copy-btn.success {
        background: #10b981 !important;
        transform: scale(1.05) !important;
        border-color: #10b981 !important;
      }
      
      .copy-btn.error {
        background: #ef4444 !important;
        transform: scale(1.05) !important;
        border-color: #ef4444 !important;
      }
      
      .copy-btn i {
        font-size: 14px !important;
        pointer-events: none !important;
      }
      
      .text-input {
        flex: 1 !important;
        padding: 8px 12px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        background: #f9fafb !important;
        font-family: 'Courier New', monospace !important;
        font-size: 14px !important;
        color: #374151 !important;
        outline: none !important;
        user-select: all !important;
      }
      
      .text-input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }
      
      .id-display {
        display: flex !important;
        gap: 8px !important;
        align-items: center !important;
        max-width: 400px !important;
      }
      
      .force-toast {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: #10b981 !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        z-index: 999999 !important;
        transform: translateX(100%) !important;
        transition: transform 0.3s ease-in-out !important;
        max-width: 300px !important;
        word-wrap: break-word !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
      }
      
      .force-toast.error {
        background: #ef4444 !important;
      }
      
      .force-toast.show {
        transform: translateX(0) !important;
      }
    `;
    
    (document.head || document.documentElement).appendChild(styles);
    console.log('✅ Styles forcefully injected');
  };
  
  // Method 1: Extract from URL - Multiple approaches
  const extractMeetingIdFromURL = () => {
    try {
      const url = window.location.href;
      const pathname = window.location.pathname;
      
      console.log('🔍 Analyzing URL:', url);
      console.log('🔍 Pathname:', pathname);
      
      // Approach 1: Standard path extraction
      const pathParts = pathname.split('/').filter(part => part.length > 0);
      const lastPart = pathParts[pathParts.length - 1];
      
      console.log('🔍 Path parts:', pathParts);
      console.log('🔍 Last part:', lastPart);
      
      // Approach 2: Look for meeting patterns
      const meetingPatterns = [
        /\/meeting\/([a-zA-Z0-9-_]+)/i,
        /\/join\/([a-zA-Z0-9-_]+)/i,
        /\/room\/([a-zA-Z0-9-_]+)/i,
        /meetingId[=:]([a-zA-Z0-9-_]+)/i,
        /id[=:]([a-zA-Z0-9-_]+)/i
      ];
      
      for (const pattern of meetingPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          console.log('✅ Found meeting ID via pattern:', match[1]);
          return match[1];
        }
      }
      
      // Approach 3: If last part looks like an ID
      if (lastPart && lastPart.length > 3 && !/^(dashboard|login|register|home|index|admin)$/i.test(lastPart)) {
        console.log('✅ Using last path part as meeting ID:', lastPart);
        return lastPart;
      }
      
      return null;
    } catch (e) {
      console.error('❌ URL extraction failed:', e);
      return null;
    }
  };
  
  // Method 2: Extract from global variables - Aggressive search
  const extractFromGlobals = () => {
    console.log('🔍 Searching global variables...');
    
    const possibleSources = [
      'window.hostMeetingInstance?.meetingId',
      'window.hostMeeting?.meetingId', 
      'window.meetingInstance?.meetingId',
      'window.meeting?.id',
      'window.meeting?.meetingId',
      'window.currentMeeting?.id',
      'window.roomId',
      'window.meetingId',
      'window.currentMeetingId',
      'window.sessionId'
    ];
    
    for (const source of possibleSources) {
      try {
        const value = eval(source);
        if (value && typeof value === 'string' && value.length > 3) {
          console.log('✅ Found meeting ID in global:', source, '=', value);
          return value;
        }
      } catch (e) {
        // Ignore eval errors
      }
    }
    
    // Search all window properties
    for (const key in window) {
      try {
        const obj = window[key];
        if (obj && typeof obj === 'object') {
          if (obj.meetingId && typeof obj.meetingId === 'string') {
            console.log('✅ Found meetingId in window.' + key);
            return obj.meetingId;
          }
          if (obj.id && typeof obj.id === 'string' && obj.id.length > 5) {
            console.log('✅ Found id in window.' + key);
            return obj.id;
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    return null;
  };
  
  // Method 3: Extract from DOM elements
  const extractFromDOM = () => {
    console.log('🔍 Searching DOM elements...');
    
    const selectors = [
      '#meetingTitle',
      '#meetingId', 
      '#roomId',
      '[data-meeting-id]',
      '[data-room-id]',
      '.meeting-title',
      '.meeting-id',
      '.room-id'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          // Try textContent
          const text = element.textContent || element.innerText || '';
          const match = text.match(/(?:meeting|room|id)[:\s]*([a-zA-Z0-9-_]+)/i);
          if (match && match[1]) {
            console.log('✅ Found meeting ID in DOM element text:', match[1]);
            return match[1];
          }
          
          // Try data attributes
          const dataId = element.dataset.meetingId || element.dataset.roomId || element.dataset.id;
          if (dataId) {
            console.log('✅ Found meeting ID in data attribute:', dataId);
            return dataId;
          }
        }
      } catch (e) {
        console.error('Error checking selector:', selector, e);
      }
    }
    
    return null;
  };
  
  // Method 4: Generate fallback ID
  const generateFallbackId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `MEETING-${timestamp}-${random}`.toUpperCase();
  };
  
  // AGGRESSIVE meeting ID detection
  const detectMeetingId = () => {
    console.log('🚀 Starting aggressive meeting ID detection...');
    
    // Try all methods
    let id = extractMeetingIdFromURL();
    if (id) return id;
    
    id = extractFromGlobals();
    if (id) return id;
    
    id = extractFromDOM();
    if (id) return id;
    
    console.log('⚠️ All detection methods failed, generating fallback ID');
    return generateFallbackId();
  };
  
  // FORCE find elements
  const forceGetElements = () => {
    console.log('🔍 Force finding elements...');
    
    // Try multiple selectors for input
    const inputSelectors = [
      '#meetingIdValue',
      '[id="meetingIdValue"]',
      'input[readonly]',
      '.text-input',
      '.id-display input',
      'input[type="text"][readonly]'
    ];
    
    for (const selector of inputSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('✅ Found input element:', selector);
        meetingIdInput = element;
        break;
      }
    }
    
    // Try multiple selectors for button
    const buttonSelectors = [
      '.copy-btn',
      'button.copy-btn',
      '.id-display button',
      'button[class*="copy"]',
      '.id-display .copy-btn'
    ];
    
    for (const selector of buttonSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('✅ Found copy button:', selector);
        copyButton = element;
        break;
      }
    }
    
    return meetingIdInput && copyButton;
  };
  
  // FORCE copy to clipboard - Multiple methods
  const forceCopyToClipboard = async (text) => {
    console.log('📋 Attempting to copy:', text);
    
    // Method 1: Modern Clipboard API
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log('✅ Copied using Clipboard API');
        return true;
      }
    } catch (e) {
      console.log('❌ Clipboard API failed:', e);
    }
    
    // Method 2: Select and copy input
    try {
      if (meetingIdInput) {
        meetingIdInput.focus();
        meetingIdInput.select();
        meetingIdInput.setSelectionRange(0, 99999);
        
        const success = document.execCommand('copy');
        if (success) {
          console.log('✅ Copied using execCommand on input');
          return true;
        }
      }
    } catch (e) {
      console.log('❌ Input copy failed:', e);
    }
    
    // Method 3: Create temporary textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        console.log('✅ Copied using temporary textarea');
        return true;
      }
    } catch (e) {
      console.log('❌ Textarea copy failed:', e);
    }
    
    // Method 4: Use Range and Selection
    try {
      if (meetingIdInput) {
        const range = document.createRange();
        range.selectNodeContents(meetingIdInput);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const success = document.execCommand('copy');
        selection.removeAllRanges();
        
        if (success) {
          console.log('✅ Copied using Range selection');
          return true;
        }
      }
    } catch (e) {
      console.log('❌ Range copy failed:', e);
    }
    
    console.log('❌ All copy methods failed');
    return false;
  };
  
  // FORCE show toast notification
  const forceShowToast = (message, type = 'success') => {
    console.log('🍞 Showing toast:', message);
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.force-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `force-toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Force show with delay
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Force hide with delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  };
  
  // FORCE update button state
  const forceUpdateButton = (type = 'success', duration = 2000) => {
    if (!copyButton) return;
    
    const originalHTML = copyButton.innerHTML;
    const icon = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation-triangle';
    
    copyButton.innerHTML = `<i class="${icon}"></i>`;
    copyButton.classList.add(type);
    
    setTimeout(() => {
      copyButton.innerHTML = originalHTML;
      copyButton.classList.remove('success', 'error');
    }, duration);
  };
  
  // MAIN copy handler
  const handleCopyClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 Copy button clicked!');
    
    if (!MEETING_ID) {
      console.log('❌ No meeting ID available');
      forceShowToast('No meeting ID found!', 'error');
      forceUpdateButton('error');
      return;
    }
    
    const success = await forceCopyToClipboard(MEETING_ID);
    
    if (success) {
      forceShowToast('Copied to Clipboard!', 'success');
      forceUpdateButton('success');
    } else {
      forceShowToast('Copy failed - please copy manually', 'error');
      forceUpdateButton('error');
    }
  };
  
  // AGGRESSIVE initialization
  const aggressiveInit = () => {
    retryCount++;
    console.log(`🚀 Aggressive init attempt ${retryCount}/${MAX_RETRIES}`);
    
    // Force create styles
    forceCreateStyles();
    
    // Detect meeting ID
    if (!MEETING_ID) {
      MEETING_ID = detectMeetingId();
      console.log('🎯 Meeting ID detected:', MEETING_ID);
    }
    
    // Force get elements
    const elementsFound = forceGetElements();
    
    if (elementsFound) {
      console.log('✅ All elements found!');
      
      // Set meeting ID in input
      if (meetingIdInput && MEETING_ID) {
        meetingIdInput.value = MEETING_ID;
        console.log('✅ Meeting ID set in input');
      }
      
      // Remove existing listeners
      if (copyButton) {
        const newButton = copyButton.cloneNode(true);
        copyButton.parentNode.replaceChild(newButton, copyButton);
        copyButton = newButton;
        
        // Add click listener
        copyButton.addEventListener('click', handleCopyClick);
        console.log('✅ Click listener attached');
      }
      
      // Success!
      console.log('🎉 AGGRESSIVE INITIALIZATION COMPLETE!');
      
      // Make globally accessible
      window.FORCE_MEETING_ID = MEETING_ID;
      window.forceCopyMeetingId = () => handleCopyClick({ preventDefault: () => {}, stopPropagation: () => {} });
      
      return true;
    }
    
    // Retry if not at max
    if (retryCount < MAX_RETRIES) {
      console.log('⏳ Retrying in 200ms...');
      setTimeout(aggressiveInit, 200);
    } else {
      console.log('❌ Max retries reached, giving up');
      forceShowToast('Failed to initialize - elements not found', 'error');
    }
    
    return false;
  };
  
  // START AGGRESSIVE INITIALIZATION
  console.log('🚀 STARTING AGGRESSIVE MEETING ID COPY SCRIPT');
  
  // Try immediate initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aggressiveInit);
    document.addEventListener('load', aggressiveInit);
  } else {
    aggressiveInit();
  }
  
  // Also try after a delay regardless
  setTimeout(aggressiveInit, 1000);
  setTimeout(aggressiveInit, 3000);
  setTimeout(aggressiveInit, 5000);
  
  // Watch for DOM changes
  if (window.MutationObserver) {
    const observer = new MutationObserver(() => {
      if (retryCount < MAX_RETRIES && (!meetingIdInput || !copyButton)) {
        aggressiveInit();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
})();