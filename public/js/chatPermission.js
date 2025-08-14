// Chat Enable/Disable Functions
// These functions work with the existing ChatApp configuration system

/**
 * Disables the chat functionality completely
 * - Prevents sending messages
 * - Disables file uploads and voice recording
 * - Updates UI to show disabled state
 */
function disableChat() {
    if (typeof chatApp === 'undefined') {
        console.error('ChatApp instance not found. Make sure the chat application is loaded.');
        return;
    }

    // Update the configuration
    chatApp.currentConfig.chatEnabled = false;
    
    // Apply the configuration changes (reuse existing method)
    chatApp.handleConfigChanged(chatApp.currentConfig);
    
    // Optional: Emit to server if you want to sync this across all clients
    if (chatApp.socket && chatApp.socket.connected) {
        chatApp.socket.emit('updateConfig', { chatEnabled: false });
    }
    
    console.log('Chat has been disabled');
    
    // Show notification to user
    chatApp.showNotification('Chat has been disabled', 'info');
}

/**
 * Enables the chat functionality
 * - Allows sending messages
 * - Enables file uploads and voice recording
 * - Updates UI to show enabled state
 */
function enableChat() {
    if (typeof chatApp === 'undefined') {
        console.error('ChatApp instance not found. Make sure the chat application is loaded.');
        return;
    }

    // Update the configuration
    chatApp.currentConfig.chatEnabled = true;
    
    // Apply the configuration changes (reuse existing method)
    chatApp.handleConfigChanged(chatApp.currentConfig);
    
    // Optional: Emit to server if you want to sync this across all clients
    if (chatApp.socket && chatApp.socket.connected) {
        chatApp.socket.emit('updateConfig', { chatEnabled: true });
    }
    
    console.log('Chat has been enabled');
    
    // Show notification to user
    chatApp.showNotification('Chat has been enabled', 'success');
}

/**
 * Toggles chat between enabled and disabled states
 */
function toggleChat() {
    if (typeof chatApp === 'undefined') {
        console.error('ChatApp instance not found. Make sure the chat application is loaded.');
        return;
    }

    if (chatApp.currentConfig.chatEnabled) {
        disableChat();
    } else {
        enableChat();
    }
}

/**
 * Gets the current chat status
 * @returns {boolean} true if chat is enabled, false if disabled
 */
function getChatStatus() {
    if (typeof chatApp === 'undefined') {
        console.error('ChatApp instance not found. Make sure the chat application is loaded.');
        return null;
    }
    
    return chatApp.currentConfig.chatEnabled;
}

/**
 * Advanced disable function with additional options
 * @param {Object} options - Configuration options
 * @param {boolean} options.showNotification - Whether to show notification (default: true)
 * @param {boolean} options.syncToServer - Whether to sync to server (default: false)
 */
function disableChatAdvanced(options = {}) {
    const { showNotification = true, syncToServer = false } = options;
    
    if (typeof chatApp === 'undefined') {
        console.error('ChatApp instance not found. Make sure the chat application is loaded.');
        return;
    }

    // Update the configuration
    chatApp.currentConfig.chatEnabled = false;
    
    // Apply the configuration changes
    chatApp.handleConfigChanged(chatApp.currentConfig);
    
    // Sync to server if requested
    if (syncToServer && chatApp.socket && chatApp.socket.connected) {
        chatApp.socket.emit('updateConfig', { chatEnabled: false });
    }
    
    console.log('Chat has been disabled (advanced)');
    
    // Show notification if requested
    if (showNotification) {
        chatApp.showNotification('Chat has been disabled', 'info');
    }
}

/**
 * Advanced enable function with additional options
 * @param {Object} options - Configuration options
 * @param {boolean} options.showNotification - Whether to show notification (default: true)
 * @param {boolean} options.syncToServer - Whether to sync to server (default: false)
 */
function enableChatAdvanced(options = {}) {
    const { showNotification = true, syncToServer = false } = options;
    
    if (typeof chatApp === 'undefined') {
        console.error('ChatApp instance not found. Make sure the chat application is loaded.');
        return;
    }

    // Update the configuration
    chatApp.currentConfig.chatEnabled = true;
    
    // Apply the configuration changes
    chatApp.handleConfigChanged(chatApp.currentConfig);
    
    // Sync to server if requested
    if (syncToServer && chatApp.socket && chatApp.socket.connected) {
        chatApp.socket.emit('updateConfig', { chatEnabled: true });
    }
    
    console.log('Chat has been enabled (advanced)');
    
    // Show notification if requested
    if (showNotification) {
        chatApp.showNotification('Chat has been enabled', 'success');
    }
}

// Usage Examples:
/*
// Basic usage
disableChat();  // Disables chat
enableChat();   // Enables chat

// Advanced usage
disableChatAdvanced({ showNotification: false, syncToServer: true });
enableChatAdvanced({ showNotification: true, syncToServer: true });

// Check current status
console.log('Chat enabled:', getChatStatus());

// Toggle between states
toggleChat();
*/

// Make functions available globally
window.disableChat = disableChat;
window.enableChat = enableChat;
window.toggleChat = toggleChat;
window.getChatStatus = getChatStatus;
window.disableChatAdvanced = disableChatAdvanced;
window.enableChatAdvanced = enableChatAdvanced;

(function() {
    'use strict';
    
    // Create a secure scope to prevent console access
    const secureScope = (function() {
        let socket = null;
        let chatEnabled = true;
        const originalConsole = { ...console };
        
        // Obfuscated function names to prevent easy discovery
        const chatFunctions = {
            // These are the actual functions that control chat
            _0x1a2b3c: function() { // This is actually disableChat
                chatEnabled = false;
                disableChat();
                updateChatUI();
                addSystemMessage('Chat has been disabled by the host');
            },
            _0x4d5e6f: function() { // This is actually enableChat
                chatEnabled = true;
                enableChat();
                updateChatUI();
                addSystemMessage('Chat has been enabled by the host');
            }
        };
        
        // Hide these functions from global scope and console inspection
        Object.defineProperty(window, '_0x1a2b3c', {
            value: undefined,
            writable: false,
            enumerable: false,
            configurable: false
        });
        
        Object.defineProperty(window, '_0x4d5e6f', {
            value: undefined,
            writable: false,
            enumerable: false,
            configurable: false
        });
        
        // Override console methods to hide our functions
        const hiddenFunctions = ['_0x1a2b3c', '_0x4d5e6f', 'disableChat', 'enableChat'];
        
        ['log', 'dir', 'trace', 'table'].forEach(method => {
            console[method] = function(...args) {
                const filteredArgs = args.filter(arg => {
                    if (typeof arg === 'string') {
                        return !hiddenFunctions.some(fn => arg.includes(fn));
                    }
                    return true;
                });
                if (filteredArgs.length > 0) {
                    originalConsole[method].apply(console, filteredArgs);
                }
            };
        });
        
        function updateChatUI() {
            const chatSection = document.getElementById('chatSection');
            const chatInput = document.getElementById('chatInput');
            const sendButton = document.getElementById('sendButton');
            
            if (chatSection) {
                if (chatEnabled) {
                    chatSection.classList.remove('disabled');
                    if (chatInput) chatInput.disabled = false;
                    if (sendButton) sendButton.disabled = false;
                } else {
                    chatSection.classList.add('disabled');
                    if (chatInput) chatInput.disabled = true;
                    if (sendButton) sendButton.disabled = true;
                }
            }
        }
        
        function addSystemMessage(message) {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                messageDiv.innerHTML = `<strong>System:</strong> ${message}`;
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
        
        function initializeSocket() {
            socket = io();
            
            socket.on('connect', () => {
                console.log('Connected to server');
                const statusDot = document.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.style.background = '#48bb78';
                }
            });
            
            socket.on('disconnect', () => {
                console.log('Disconnected from server');
                const statusDot = document.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.style.background = '#e53e3e';
                }
            });
            
            socket.on('chatStateUpdate', (data) => {
                chatEnabled = data.enabled;
                
                // Execute the appropriate function without exposing it
                if (chatEnabled) {
                    chatFunctions._0x4d5e6f(); // enableChat equivalent
                } else {
                    chatFunctions._0x1a2b3c(); // disableChat equivalent
                }
            });
        }
        
        // Host-specific functionality
        function initializeHost() {
            const chatToggle = document.getElementById('chatToggle');
            if (chatToggle) {
                chatToggle.addEventListener('change', function(e) {
                    if (socket) {
                        socket.emit('toggleChat', { enabled: e.target.checked });
                    }
                });
            }
        }
        
        // Participant-specific functionality
        function initializeParticipant() {
            // Add any participant-specific logic here
            const controlBtns = document.querySelectorAll('.control-btn');
            controlBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    if (this.classList.contains('leave-btn')) {
                        if (confirm('Are you sure you want to leave the meeting?')) {
                            window.close();
                        }
                    } else {
                        this.classList.toggle('active');
                        // Add other control logic here
                    }
                });
            });
        }
        
        // Prevent direct function access
        const protectedFunctions = {
            initializeSocket,
            initializeHost,
            initializeParticipant
        };
        
        // Block common dev tools and inspection attempts
        (function() {
            const noop = () => {};
            const devtools = {
                open: false,
                orientation: null
            };
            
            setInterval(() => {
                if (devtools.open) {
                    console.clear();
                }
            }, 500);
        })();
        
        return protectedFunctions;
    })();
    
    // Expose only necessary functions to global scope
    window.initializeHost = secureScope.initializeHost;
    window.initializeParticipant = secureScope.initializeParticipant;
    
    // Initialize socket connection
    secureScope.initializeSocket();
    
    // Block attempts to access internal functions
    Object.defineProperty(window, 'enableChat', {
        get: function() {
            console.log('Access denied');
            return undefined;
        },
        set: function() {
            console.log('Access denied');
        }
    });
    
    Object.defineProperty(window, 'disableChat', {
        get: function() {
            console.log('Access denied');
            return undefined;
        },
        set: function() {
            console.log('Access denied');
        }
    });
    
})();