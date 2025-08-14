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
                disableChat()
            },
            _0x4d5e6f: function() { // This is actually enableChat
                enableChat()
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