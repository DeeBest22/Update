// Complete blocking of disableChat() and enableChat() functions
(function() {
    'use strict';
    
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    // Store original eval function
    const originalEval = window.eval;
    
    // Store original Function constructor
    const OriginalFunction = window.Function;
    
    // Function to check if code contains blocked functions
    function containsBlockedFunction(code) {
        const blockedPatterns = [
            /disableChat\s*\(/,
            /enableChat\s*\(/,
            /window\s*\.\s*disableChat\s*\(/,
            /window\s*\.\s*enableChat\s*\(/,
            /this\s*\.\s*disableChat\s*\(/,
            /this\s*\.\s*enableChat\s*\(/
        ];
        
        return blockedPatterns.some(pattern => pattern.test(code));
    }
    
    // Override eval to block execution
    window.eval = function(code) {
        if (typeof code === 'string' && containsBlockedFunction(code)) {
            return undefined; // Silent block
        }
        return originalEval.call(this, code);
    };
    
    // Override Function constructor to block execution
    window.Function = function(...args) {
        const code = args[args.length - 1];
        if (typeof code === 'string' && containsBlockedFunction(code)) {
            return function() { return undefined; }; // Silent block
        }
        return OriginalFunction.apply(this, args);
    };
    
    // Block direct function calls by overriding window methods
    Object.defineProperty(window, 'disableChat', {
        get: function() {
            return function() { return undefined; }; // Silent block
        },
        set: function() {
            return true; // Pretend to set but do nothing
        },
        configurable: false,
        enumerable: false
    });
    
    Object.defineProperty(window, 'enableChat', {
        get: function() {
            return function() { return undefined; }; // Silent block
        },
        set: function() {
            return true; // Pretend to set but do nothing
        },
        configurable: false,
        enumerable: false
    });
    
    // Override console methods to filter blocked function calls
    console.log = function(...args) {
        const message = args.join(' ');
        if (containsBlockedFunction(message)) {
            return; // Silent block
        }
        return originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
        const message = args.join(' ');
        if (containsBlockedFunction(message)) {
            return; // Silent block
        }
        return originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        const message = args.join(' ');
        if (containsBlockedFunction(message)) {
            return; // Silent block
        }
        return originalWarn.apply(console, args);
    };
    
    console.info = function(...args) {
        const message = args.join(' ');
        if (containsBlockedFunction(message)) {
            return; // Silent block
        }
        return originalInfo.apply(console, args);
    };
    
    // Block setTimeout and setInterval if they contain blocked functions
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    window.setTimeout = function(func, delay, ...args) {
        if (typeof func === 'string' && containsBlockedFunction(func)) {
            return setTimeout(() => {}, delay); // Return dummy timeout
        }
        if (typeof func === 'function') {
            const funcStr = func.toString();
            if (containsBlockedFunction(funcStr)) {
                return setTimeout(() => {}, delay); // Return dummy timeout
            }
        }
        return originalSetTimeout.call(this, func, delay, ...args);
    };
    
    window.setInterval = function(func, delay, ...args) {
        if (typeof func === 'string' && containsBlockedFunction(func)) {
            return setInterval(() => {}, delay); // Return dummy interval
        }
        if (typeof func === 'function') {
            const funcStr = func.toString();
            if (containsBlockedFunction(funcStr)) {
                return setInterval(() => {}, delay); // Return dummy interval
            }
        }
        return originalSetInterval.call(this, func, delay, ...args);
    };
    
    // Block event listeners that might contain blocked functions
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (typeof listener === 'function') {
            const funcStr = listener.toString();
            if (containsBlockedFunction(funcStr)) {
                return; // Silent block
            }
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Prevent access through bracket notation
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = function(obj, prop) {
        if ((prop === 'disableChat' || prop === 'enableChat') && obj === window) {
            return {
                value: function() { return undefined; },
                writable: false,
                enumerable: false,
                configurable: false
            };
        }
        return originalGetOwnPropertyDescriptor.call(this, obj, prop);
    };
    
    // Block Object.keys, Object.getOwnPropertyNames to hide the functions
    const originalKeys = Object.keys;
    const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
    
    Object.keys = function(obj) {
        const keys = originalKeys.call(this, obj);
        if (obj === window) {
            return keys.filter(key => key !== 'disableChat' && key !== 'enableChat');
        }
        return keys;
    };
    
    Object.getOwnPropertyNames = function(obj) {
        const names = originalGetOwnPropertyNames.call(this, obj);
        if (obj === window) {
            return names.filter(name => name !== 'disableChat' && name !== 'enableChat');
        }
        return names;
    };
    
    // Seal the blocking system
    Object.freeze(window.eval);
    Object.freeze(window.Function);
    Object.freeze(console);
    
})();