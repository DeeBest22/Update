// Theme Toggle System with Settings Support
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'system';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListener();
        this.setupSystemThemeListener();
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            // Fallback if localStorage is not available
            return null;
        }
    }

    setStoredTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            // Ignore if localStorage is not available
            console.warn('Could not save theme preference');
        }
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    applyTheme(theme) {
        const body = document.body;
        const html = document.documentElement;

        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-system', 'dark-mode');
        html.classList.remove('theme-light', 'theme-dark', 'theme-system', 'dark-mode');

        let actualTheme = theme;
        
        if (theme === 'system') {
            actualTheme = this.getSystemTheme();
            body.classList.add('theme-system');
            html.classList.add('theme-system');
        }

        // Apply the theme class
        body.classList.add(`theme-${actualTheme}`);
        html.classList.add(`theme-${actualTheme}`);
        
        // Add dark-mode class for notes.css compatibility
        if (actualTheme === 'dark') {
            body.classList.add('dark-mode');
            html.classList.add('dark-mode');
        }

        // Update CSS custom properties for smooth transitions
        this.updateCSSVariables(actualTheme);

        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateDropdownValue(theme);
    }

    updateCSSVariables(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            // Light theme variables for main app
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f8fafc');
            root.style.setProperty('--bg-tertiary', '#e2e8f0');
            root.style.setProperty('--bg-quaternary', '#cbd5e1');
            root.style.setProperty('--text-primary', '#0f172a');
            root.style.setProperty('--text-secondary', '#334155');
            root.style.setProperty('--text-tertiary', '#64748b');
            root.style.setProperty('--border-primary', 'rgba(203, 213, 225, 0.5)');
            root.style.setProperty('--border-secondary', 'rgba(148, 163, 184, 0.5)');
            root.style.setProperty('--glass-bg', 'rgba(248, 250, 252, 0.98)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)');
            
            // Light theme for settings
            root.style.setProperty('--settings-bg', '#ffffff');
            root.style.setProperty('--settings-nav-bg', '#f8f9fa');
            root.style.setProperty('--settings-border', '#e9ecef');
            root.style.setProperty('--settings-text', '#2b2d42');
            root.style.setProperty('--settings-text-secondary', '#6c757d');
            root.style.setProperty('--settings-input-bg', '#ffffff');
            root.style.setProperty('--settings-hover-bg', 'rgba(67, 97, 238, 0.05)');
            root.style.setProperty('--settings-active-bg', '#ebefff');
            root.style.setProperty('--video-placeholder-bg', '#e9ecef');
            root.style.setProperty('--video-placeholder-text', '#6c757d');

            // Chat CSS variables
            root.style.setProperty('--primary-color', '#4361EE');
            root.style.setProperty('--primary-light', '#738AFF');
            root.style.setProperty('--primary-dark', '#2F49D6');
            root.style.setProperty('--secondary-color', '#06D6A0');
            root.style.setProperty('--accent-color', '#FF5A5F');
            root.style.setProperty('--success-color', '#10B981');
            root.style.setProperty('--warning-color', '#F59E0B');
            root.style.setProperty('--error-color', '#EF4444');
            root.style.setProperty('--text-color', '#1F2937');
            root.style.setProperty('--text-light', '#6B7280');
            root.style.setProperty('--text-muted', '#9CA3AF');
            root.style.setProperty('--bg-color', '#F9FAFB');
            root.style.setProperty('--bg-secondary', '#F3F4F6');
            root.style.setProperty('--chat-bg', '#FFFFFF');
            root.style.setProperty('--border-color', '#E5E7EB');

            // File Share CSS variables
            root.style.setProperty('--primary-color-share', '#4a6cf7');
            root.style.setProperty('--primary-dark-share', '#3755d8');
            root.style.setProperty('--accent-color-share', '#6a82fb');
            root.style.setProperty('--dark-color', '#343a40');
            root.style.setProperty('--light-color', '#f8f9fa');
            root.style.setProperty('--gray-color', '#6c757d');
            root.style.setProperty('--gray-light', '#e9ecef');
            root.style.setProperty('--gray-dark', '#495057');

            // Poll CSS variables
            root.style.setProperty('--primary-color-poll', '#6366f1');
            root.style.setProperty('--primary-light-poll', '#818cf8');
            root.style.setProperty('--primary-dark-poll', '#4f46e5');
            root.style.setProperty('--secondary-color-poll', '#8b5cf6');
            root.style.setProperty('--text-primary-poll', '#1e293b');
            root.style.setProperty('--text-secondary-poll', '#64748b');
            root.style.setProperty('--bg-light-poll', '#ffffff');
            root.style.setProperty('--bg-off-white', '#f8fafc');

            // Notes CSS variables
            root.style.setProperty('--primary-color-notes', '#6366f1');
            root.style.setProperty('--primary-gradient-notes', 'linear-gradient(135deg, #6366f1, #4f46e5)');
            root.style.setProperty('--primary-hover-notes', '#4338ca');
            root.style.setProperty('--secondary-color-notes', '#f1f5f9');
            root.style.setProperty('--text-color-notes', '#1e293b');
            root.style.setProperty('--background-color-notes', '#f8fafc');
            root.style.setProperty('--card-bg-notes', '#ffffff');
            root.style.setProperty('--shadow-color-notes', 'rgba(15, 23, 42, 0.08)');
            root.style.setProperty('--border-color-notes', '#e2e8f0');

            // Meeting Tools CSS variables
            root.style.setProperty('--meeting-tools-bg', '#f8fafc');
            root.style.setProperty('--meeting-tools-panel-bg', 'rgba(255, 255, 255, 0.95)');
            root.style.setProperty('--meeting-tools-item-bg', 'rgba(248, 250, 252, 0.8)');
            root.style.setProperty('--meeting-tools-item-hover', 'rgba(241, 245, 249, 0.9)');
            root.style.setProperty('--meeting-tools-text', '#334155');
            root.style.setProperty('--meeting-tools-icon-bg', 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)');
            root.style.setProperty('--meeting-tools-icon-color', '#64748b');
            
        } else {
            // Dark theme variables for main app
            root.style.setProperty('--bg-primary', '#0f172a');
            root.style.setProperty('--bg-secondary', '#1e293b');
            root.style.setProperty('--bg-tertiary', '#334155');
            root.style.setProperty('--bg-quaternary', '#475569');
            root.style.setProperty('--text-primary', '#f1f5f9');
            root.style.setProperty('--text-secondary', '#e2e8f0');
            root.style.setProperty('--text-tertiary', '#94a3b8');
            root.style.setProperty('--border-primary', 'rgba(71, 85, 105, 0.3)');
            root.style.setProperty('--border-secondary', 'rgba(71, 85, 105, 0.5)');
            root.style.setProperty('--glass-bg', 'rgba(30, 41, 59, 0.98)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)');
            
            // Dark theme for settings
            root.style.setProperty('--settings-bg', '#1e293b');
            root.style.setProperty('--settings-nav-bg', '#334155');
            root.style.setProperty('--settings-border', '#475569');
            root.style.setProperty('--settings-text', '#f1f5f9');
            root.style.setProperty('--settings-text-secondary', '#94a3b8');
            root.style.setProperty('--settings-input-bg', '#334155');
            root.style.setProperty('--settings-hover-bg', 'rgba(67, 97, 238, 0.1)');
            root.style.setProperty('--settings-active-bg', 'rgba(67, 97, 238, 0.2)');
            root.style.setProperty('--video-placeholder-bg', '#475569');
            root.style.setProperty('--video-placeholder-text', '#94a3b8');

            // Chat CSS variables (dark)
            root.style.setProperty('--primary-color', '#5B73F5');
            root.style.setProperty('--primary-light', '#7B8EFF');
            root.style.setProperty('--primary-dark', '#4A5FE7');
            root.style.setProperty('--secondary-color', '#10D6A0');
            root.style.setProperty('--accent-color', '#FF6B6F');
            root.style.setProperty('--success-color', '#22C55E');
            root.style.setProperty('--warning-color', '#F59E0B');
            root.style.setProperty('--error-color', '#EF4444');
            root.style.setProperty('--text-color', '#F1F5F9');
            root.style.setProperty('--text-light', '#CBD5E1');
            root.style.setProperty('--text-muted', '#94A3B8');
            root.style.setProperty('--bg-color', '#0F172A');
            root.style.setProperty('--bg-secondary', '#1E293B');
            root.style.setProperty('--chat-bg', '#1E293B');
            root.style.setProperty('--border-color', '#334155');

            // File Share CSS variables (dark)
            root.style.setProperty('--primary-color-share', '#5B73F5');
            root.style.setProperty('--primary-dark-share', '#4A5FE7');
            root.style.setProperty('--accent-color-share', '#7B8EFF');
            root.style.setProperty('--dark-color', '#F1F5F9');
            root.style.setProperty('--light-color', '#1E293B');
            root.style.setProperty('--gray-color', '#94A3B8');
            root.style.setProperty('--gray-light', '#334155');
            root.style.setProperty('--gray-dark', '#CBD5E1');

            // Poll CSS variables (dark)
            root.style.setProperty('--primary-color-poll', '#818cf8');
            root.style.setProperty('--primary-light-poll', '#a5b4fc');
            root.style.setProperty('--primary-dark-poll', '#6366f1');
            root.style.setProperty('--secondary-color-poll', '#a78bfa');
            root.style.setProperty('--text-primary-poll', '#f1f5f9');
            root.style.setProperty('--text-secondary-poll', '#94a3b8');
            root.style.setProperty('--bg-light-poll', '#1e293b');
            root.style.setProperty('--bg-off-white', '#0f172a');

            // Notes CSS variables (dark)
            root.style.setProperty('--primary-color-notes', '#818cf8');
            root.style.setProperty('--primary-gradient-notes', 'linear-gradient(135deg, #818cf8, #6366f1)');
            root.style.setProperty('--primary-hover-notes', '#4f46e5');
            root.style.setProperty('--secondary-color-notes', '#334155');
            root.style.setProperty('--text-color-notes', '#f1f5f9');
            root.style.setProperty('--background-color-notes', '#0f172a');
            root.style.setProperty('--card-bg-notes', '#1e293b');
            root.style.setProperty('--shadow-color-notes', 'rgba(0, 0, 0, 0.3)');
            root.style.setProperty('--border-color-notes', '#334155');

            // Meeting Tools CSS variables (dark)
            root.style.setProperty('--meeting-tools-bg', '#0f172a');
            root.style.setProperty('--meeting-tools-panel-bg', 'rgba(30, 41, 59, 0.95)');
            root.style.setProperty('--meeting-tools-item-bg', 'rgba(51, 65, 85, 0.8)');
            root.style.setProperty('--meeting-tools-item-hover', 'rgba(71, 85, 105, 0.9)');
            root.style.setProperty('--meeting-tools-text', '#f1f5f9');
            root.style.setProperty('--meeting-tools-icon-bg', 'linear-gradient(135deg, #475569 0%, #334155 100%)');
            root.style.setProperty('--meeting-tools-icon-color', '#94a3b8');
        }
    }

    updateDropdownValue(theme) {
        const dropdown = document.querySelector('.theme-dropdown');
        if (dropdown) {
            dropdown.value = theme;
        }
    }

    setupEventListener() {
        const dropdown = document.querySelector('.theme-dropdown');
        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
        }
    }

    setupSystemThemeListener() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    }

    // Public method to change theme programmatically
    setTheme(theme) {
        if (['light', 'dark', 'system'].includes(theme)) {
            this.applyTheme(theme);
        }
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Get actual applied theme (resolves 'system' to 'light' or 'dark')
    getAppliedTheme() {
        if (this.currentTheme === 'system') {
            return this.getSystemTheme();
        }
        return this.currentTheme;
    }
}

// Enhanced CSS Styles with Settings Support for ALL CSS files
const themeStyles = `
/* Base theme variables for transitions */
:root {
    /* Main app variables */
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --bg-quaternary: #475569;
    --text-primary: #f1f5f9;
    --text-secondary: #e2e8f0;
    --text-tertiary: #94a3b8;
    --border-primary: rgba(71, 85, 105, 0.3);
    --border-secondary: rgba(71, 85, 105, 0.5);
    --glass-bg: rgba(30, 41, 59, 0.98);
    --gradient-bg: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    
    /* Settings variables */
    --settings-bg: #1e293b;
    --settings-nav-bg: #334155;
    --settings-border: #475569;
    --settings-text: #f1f5f9;
    --settings-text-secondary: #94a3b8;
    --settings-input-bg: #334155;
    --settings-hover-bg: rgba(67, 97, 238, 0.1);
    --settings-active-bg: rgba(67, 97, 238, 0.2);
    --video-placeholder-bg: #475569;
    --video-placeholder-text: #94a3b8;
    
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* ===== CHAT CSS THEME SUPPORT ===== */
.chat-button {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
}

.chat-bar {
    background-color: var(--bg-color);
    border-left: 1px solid var(--border-color);
    color: var(--text-color);
}

.chat-header {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
}

.chat-participants-list {
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
}

.chat-participants-list li {
    color: var(--text-color);
}

.chat-participants-list li:hover {
    background: rgba(67, 97, 238, 0.1);
    color: var(--primary-color);
}

.chat-participants-list li.active {
    background: var(--primary-color);
    color: white;
}

.chat-window {
    background: var(--chat-bg);
}

.chat-title {
    background: var(--chat-bg);
    color: var(--text-color);
    border-bottom: 1px solid var(--border-color);
}

.chat-messages {
    background: linear-gradient(to bottom, var(--bg-color), var(--chat-bg));
}

.message.sent {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
}

.message.received {
    background: var(--chat-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
}

.input-wrapper {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
}

.input-wrapper:focus-within {
    border-color: var(--primary-color);
}

.message-input {
    background: transparent;
    color: var(--text-color);
}

.input-actions {
    border-top: 1px solid var(--border-color);
}

.chat-action-btn {
    color: var(--text-muted);
}

.chat-action-btn:hover {
    background: var(--primary-color);
    color: white;
}

.send-btn {
    background: var(--primary-color);
}

.send-btn:hover {
    background: var(--primary-dark);
}

/* ===== FILE SHARE CSS THEME SUPPORT ===== */
body {
    background-color: var(--meeting-tools-bg);
    color: var(--dark-color);
}

.floating-btn {
    background: var(--primary-color-share);
}

.floating-btn:hover {
    background: var(--primary-dark-share);
}

.modal-content-share {
    background-color: var(--light-color);
}

.modal-header-share {
    background-color: var(--primary-color-share);
    border-bottom: 1px solid var(--gray-light);
}

.group-nav {
    background-color: var(--light-color);
}

.group-item {
    background-color: var(--light-color);
    border: 1px solid var(--gray-light);
    color: var(--dark-color);
}

.group-item:hover {
    background-color: #f0f4ff;
    border-color: var(--primary-color-share);
}

.group-item.active {
    background-color: var(--primary-color-share);
    color: white;
    border-color: var(--primary-color-share);
}

#search-input {
    border: 1px solid var(--gray-light);
    background-color: var(--light-color);
    color: var(--dark-color);
}

#search-btn {
    background-color: var(--primary-color-share);
}

#search-btn:hover {
    background-color: var(--primary-dark-share);
}

.upload-container {
    background-color: var(--light-color);
}

.upload-btn {
    background-color: var(--light-color);
    border: 1px solid var(--primary-color-share);
    color: var(--primary-color-share);
}

.upload-submit-btn {
    background-color: var(--primary-color-share);
}

.upload-submit-btn:hover {
    background-color: var(--primary-dark-share);
}

.file-item {
    background-color: var(--light-color);
}

.file-icon {
    background-color: #f7f9fc;
    color: var(--primary-color-share);
}

.file-name {
    color: var(--dark-color);
}

.file-meta {
    color: var(--gray-color);
}

.file-size, .file-date {
    background-color: var(--gray-light);
}

.file-group {
    background-color: #e3e8ff;
    color: var(--primary-dark-share);
}

.file-actions {
    background-color: #f7f9fc;
}

.action-btn {
    color: var(--gray-dark);
}

.action-btn:hover {
    background-color: var(--light-color);
}

/* ===== POLL CSS THEME SUPPORT ===== */
.app-container {
    background: var(--bg-off-white);
    color: var(--text-primary-poll);
}

.video-container-poll {
    background: linear-gradient(145deg, #111827, #1f2937);
}

.user-name {
    background: rgba(0, 0, 0, 0.6);
    color: white;
}

.poller {
    background-color: rgba(15, 23, 42, 0.7);
}

.poller-content-poll {
    background: var(--bg-light-poll);
}

.poller-header-poll {
    border-bottom: 1px solid #e2e8f0;
}

.poller-header-poll h2 {
    color: var(--text-primary-poll);
}

.close-poller-poll {
    color: var(--text-secondary-poll);
}

.close-poller-poll:hover {
    color: var(--primary-color-poll);
    background-color: #f1f5f9;
}

label {
    color: var(--text-primary-poll);
}

.poll-option, #poll-question, input[type="number"] {
    border: 1px solid #e2e8f0;
    color: var(--text-primary-poll);
    background-color: var(--bg-off-white);
}

.poll-option:focus, #poll-question:focus, input[type="number"]:focus {
    border-color: var(--primary-color-poll);
    background-color: var(--bg-light-poll);
}

.checkbox-group label {
    color: var(--text-primary-poll);
}

.primary-btn, .submit-btn {
    background: linear-gradient(135deg, var(--primary-color-poll), var(--secondary-color-poll));
}

.secondary-btn {
    background-color: #f8fafc;
    color: var(--text-primary-poll);
    border: 1px solid #e2e8f0;
}

.cancel-btn {
    color: var(--text-secondary-poll);
    border: 1px solid #e2e8f0;
}

.tab-btn {
    color: var(--text-secondary-poll);
}

.tab-btn.active {
    color: var(--primary-color-poll);
}

.poll-selection-item {
    background: var(--bg-light-poll);
    border: 1px solid #e2e8f0;
}

.poll-selection-question {
    color: var(--text-primary-poll);
}

.poll-selection-meta {
    color: var(--text-secondary-poll);
}

.checkbox-container {
    background: var(--bg-light-poll);
    border: 1px solid #e2e8f0;
}

.checkbox-container:hover {
    background: #f1f5f9;
    border-color: var(--primary-light-poll);
}

.checkbox-text {
    color: var(--text-primary-poll);
}

.vote-percentage {
    color: var(--primary-color-poll);
    background: rgba(99, 102, 241, 0.1);
}

.poll-option-btn {
    background: var(--bg-light-poll);
    border: 1px solid #e2e8f0;
    color: var(--text-primary-poll);
}

.poll-option-btn:hover {
    background: #f8fafc;
    border-color: var(--primary-light-poll);
}

.poll-result-text {
    color: var(--text-primary-poll);
}

.vote-count {
    color: var(--text-secondary-poll);
}

.poll-result-progress {
    background: linear-gradient(to right, var(--primary-color-poll), var(--secondary-color-poll));
}

#poll-timer {
    color: var(--text-secondary-poll);
    background: #f8fafc;
}

#minimized-poll-indicator {
    background: linear-gradient(135deg, var(--primary-color-poll), var(--secondary-color-poll));
}

/* ===== NOTES CSS THEME SUPPORT ===== */
.floating-btn-note {
    background: var(--primary-gradient-notes);
}

.notes-overlay {
    background-color: rgba(15, 23, 42, 0.6);
}

.notes-modal {
    background-color: var(--card-bg-notes);
    border: 1px solid var(--border-color-notes);
}

.notes-header {
    border-bottom: 1px solid var(--border-color-notes);
    background: linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent);
}

.notes-title {
    color: var(--text-color-notes);
    background: var(--primary-gradient-notes);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
}

.btn-primary {
    background: var(--primary-gradient-notes);
}

.btn-primary:hover {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
}

.btn-secondary {
    background-color: var(--secondary-color-notes);
    color: var(--text-color-notes);
    border: 1px solid var(--border-color-notes);
}

.btn-secondary:hover {
    background-color: var(--border-color-notes);
}

.note-card {
    background-color: var(--card-bg-notes);
    border: 1px solid var(--border-color-notes);
}

.note-card::before {
    background: var(--primary-gradient-notes);
}

.note-title {
    color: var(--text-color-notes);
}

.note-content {
    color: var(--text-color-notes);
}

.note-date {
    color: var(--primary-color-notes);
}

.action-btn {
    background-color: var(--secondary-color-notes);
    color: var(--text-color-notes);
}

.action-btn:hover {
    background-color: var(--border-color-notes);
}

.text-input {
    border: 1px solid var(--border-color-notes);
    background-color: var(--card-bg-notes);
    color: var(--text-color-notes);
}

.text-input:focus {
    border-color: var(--primary-color-notes);
}

.empty-state {
    color: var(--text-color-notes);
}

.empty-state svg {
    color: var(--primary-color-notes);
}

.theme-toggle {
    background-color: var(--card-bg-notes);
    border: 1px solid var(--border-color-notes);
    color: var(--primary-color-notes);
}

/* ===== MEETING TOOLS CSS THEME SUPPORT ===== */
body {
    background: var(--meeting-tools-bg);
}

.aurora-tools-panel-7h2x {
    background: var(--meeting-tools-panel-bg);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.quantum-tool-item-2x9v {
    background: var(--meeting-tools-item-bg);
    border: 1px solid rgba(226, 232, 240, 0.6);
    color: var(--meeting-tools-text);
}

.quantum-tool-item-2x9v:hover {
    background: var(--meeting-tools-item-hover);
    border-color: rgba(148, 163, 184, 0.4);
}

.nebula-icon-container-5w7k {
    background: var(--meeting-tools-icon-bg);
    color: var(--meeting-tools-icon-color);
}

.eclipse-header-9m2x {
    color: var(--meeting-tools-text);
}

/* ===== DARK MODE SPECIFIC OVERRIDES ===== */
.theme-dark .chat-messages {
    background: linear-gradient(to bottom, var(--bg-color), var(--chat-bg));
}

.theme-dark .notes-header {
    background: linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.05));
}

.theme-dark .aurora-tools-panel-7h2x {
    background: var(--meeting-tools-panel-bg);
    border: 1px solid rgba(51, 65, 85, 0.6);
}

.theme-dark .quantum-tool-item-2x9v:hover .nebula-icon-container-5w7k {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

/* Update main app styles to use CSS variables */
body {
    background: var(--gradient-bg) !important;
    color: var(--text-primary) !important;
    transition: background 0.3s ease, color 0.3s ease;
}

.video-call-app {
    background: var(--bg-primary) !important;
}

.participants-panel {
    background: var(--glass-bg) !important;
    border-left: 1px solid var(--border-primary) !important;
}

.participants-header {
    border-bottom: 1px solid var(--border-primary) !important;
}

.participants-title {
    color: var(--text-primary) !important;
}

.close-participants {
    color: var(--text-tertiary) !important;
}

.close-participants:hover {
    color: var(--text-primary) !important;
    background: var(--bg-tertiary) !important;
}

.search-input {
    background: var(--bg-tertiary) !important;
    border: 1px solid var(--border-secondary) !important;
    color: var(--text-primary) !important;
}

.search-input::placeholder {
    color: var(--text-tertiary) !important;
}

.participant-item:hover {
    background: var(--bg-tertiary) !important;
}

.participant-name {
    color: var(--text-primary) !important;
}

.participant-role {
    color: var(--text-tertiary) !important;
}

.taskbar {
    background: var(--glass-bg) !important;
    border-top: 1px solid var(--border-primary) !important;
}

.meeting-title {
    color: var(--text-primary) !important;
}

.meeting-time {
    color: var(--text-tertiary) !important;
}

.control-btn {
    background: var(--bg-tertiary) !important;
    color: var(--text-secondary) !important;
}

.control-btn:hover {
    background: var(--bg-quaternary) !important;
}

.view-toggle-btn {
    background: var(--bg-tertiary) !important;
    color: var(--text-secondary) !important;
}

.view-toggle-btn:hover {
    background: var(--bg-quaternary) !important;
}

.video-wrapper {
    background: var(--bg-secondary) !important;
}

/* Settings Modal Theme Support */
.modalForSettings-content {
    background-color: var(--settings-bg) !important;
}

.modalForSettings-header {
    border-bottom: 1px solid var(--settings-border) !important;
}

.modalForSettings-header h2 {
    color: var(--settings-text) !important;
}

.modalForSettings-footer {
    border-top: 1px solid var(--settings-border) !important;
}

.settings-nav {
    background-color: var(--settings-nav-bg) !important;
    border-right: 1px solid var(--settings-border) !important;
}

.nav-item {
    color: var(--settings-text) !important;
}

.nav-item:hover {
    background-color: var(--settings-hover-bg) !important;
}

.nav-item.active {
    background-color: var(--settings-active-bg) !important;
}

.settings-tab h3 {
    color: var(--settings-text) !important;
    border-bottom: 1px solid var(--settings-border) !important;
}

.setting-item span {
    color: var(--settings-text) !important;
}

/* Form Controls Theme Support */
.dropdown, .text-input {
    background-color: var(--settings-input-bg) !important;
    border: 1px solid var(--settings-border) !important;
    color: var(--settings-text) !important;
}

.dropdown:focus, .text-input:focus {
    border-color: var(--primary-color) !important;
}

.theme-dropdown {
    background: var(--settings-input-bg) !important;
    color: var(--settings-text) !important;
    border: 1px solid var(--settings-border) !important;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.theme-dropdown:hover {
    background: var(--bg-quaternary) !important;
}

.theme-dropdown:focus {
    outline: none;
    border-color: #3b82f6 !important;
}

/* Video Placeholder Theme Support */
.video-placeholder {
    background-color: var(--video-placeholder-bg) !important;
    color: var(--video-placeholder-text) !important;
}

.video-placeholder i {
    color: var(--video-placeholder-text) !important;
}

/* Button Theme Support */
.secondary-btn {
    background-color: var(--settings-input-bg) !important;
    color: var(--settings-text) !important;
    border: 1px solid var(--settings-border) !important;
}

.secondary-btn:hover {
    background-color: var(--settings-hover-bg) !important;
}

.option-btn {
    background-color: var(--settings-input-bg) !important;
    color: var(--settings-text) !important;
    border: 1px solid var(--settings-border) !important;
}

.option-btn:hover {
    background-color: var(--settings-hover-bg) !important;
}

.copy-btn {
    background-color: var(--settings-input-bg) !important;
    border: 1px solid var(--settings-border) !important;
    color: var(--settings-text) !important;
}

.copy-btn:hover {
    background-color: var(--settings-hover-bg) !important;
}

.info-btn {
    background-color: var(--settings-input-bg) !important;
    color: var(--settings-text) !important;
    border: 1px solid var(--settings-border) !important;
}

.info-btn:hover {
    background-color: var(--settings-hover-bg) !important;
}

/* Notification Item Theme Support */
.notification-item {
    border-bottom: 1px solid var(--settings-border) !important;
}

/* Close Button Theme Support */
.close-btn-settings {
    color: var(--settings-text-secondary) !important;
}

.close-btn-settings:hover {
    color: var(--danger-color) !important;
}

/* Control Item Theme Support */
.control-item label {
    color: var(--settings-text) !important;
}

/* Video Monitor Theme Support */
.video-monitor {
    background-color: var(--video-placeholder-bg) !important;
    color: var(--video-placeholder-text) !important;
}

/* Background Option Theme Support */
.bg-thumbnail.none {
    background-color: var(--settings-nav-bg) !important;
}

.bg-thumbnail.custom {
    background-color: var(--settings-nav-bg) !important;
}

/* Audio Meter Theme Support */
.audio-meter-mic {
    background-color: var(--settings-nav-bg) !important;
}

/* Slider Theme Support */
.slider {
    background: var(--settings-nav-bg) !important;
}

.toggle-slider {
    background-color: var(--settings-border) !important;
}

/* Theme-specific overrides */
.theme-light .video-frame {
    background: #e5e7eb !important;
}

.theme-dark .video-frame {
    background: #374151 !important;
}

/* Light theme specific adjustments */
.theme-light .bg-thumbnail.none {
    background-color: #f3f4f6 !important;
}

.theme-light .bg-thumbnail.blur {
    background-color: #d1d5db !important;
}

/* Ensure proper contrast for light theme */
.theme-light .video-placeholder i {
    opacity: 0.4;
}

.theme-dark .video-placeholder i {
    opacity: 0.6;
}

/* Modal overlay theme support */
.theme-light .modalForSettings {
    background-color: rgba(0, 0, 0, 0.3) !important;
}

.theme-dark .modalForSettings {
    background-color: rgba(0, 0, 0, 0.5) !important;
}
`;

// Function to inject theme styles
function injectThemeStyles() {
    // Remove existing theme styles if they exist
    const existingStyles = document.getElementById('theme-styles');
    if (existingStyles) {
        existingStyles.remove();
    }
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'theme-styles';
    styleSheet.textContent = themeStyles;
    document.head.appendChild(styleSheet);
}

// Initialize theme system when DOM is ready
function initializeThemeSystem() {
    // Inject theme styles
    injectThemeStyles();
    
    // Create theme manager instance
    const themeManager = new ThemeManager();
    
    // Make it globally accessible if needed
    window.themeManager = themeManager;
    
    return themeManager;
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThemeSystem);
} else {
    initializeThemeSystem();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, initializeThemeSystem };
}