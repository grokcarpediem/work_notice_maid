:root {
    --primary: #4f46e5;
    --primary-hover: #4338ca;
    --danger: #ef4444;
    --danger-hover: #dc2626;
    --success: #22c55e;
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #e2e8f0;
    --text: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    --radius: 12px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
}

.app {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px 48px;
}

.header {
    text-align: center;
    padding: 52px 0 24px;
    --wails-draggable: drag;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.header h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
}

.btn-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    --wails-draggable: no-drag;
}

.btn-refresh:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: #eef2ff;
}

.btn-refresh.spinning svg {
    animation: spin 0.6s ease;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.subtitle {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 4px;
}

/* ──── Tabs ──── */

.tabs {
    display: flex;
    gap: 4px;
    background: var(--surface);
    border-radius: var(--radius);
    padding: 4px;
    box-shadow: var(--shadow);
    margin-bottom: 24px;
}

.tab {
    flex: 1;
    padding: 10px 16px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.tab:hover {
    color: var(--text);
    background: var(--bg);
}

.tab.active {
    background: var(--primary);
    color: white;
    box-shadow: var(--shadow);
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

/* ──── Toolbar ──── */

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.toolbar h2 {
    font-size: 18px;
    font-weight: 600;
}

.toolbar-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.btn-outline-danger {
    background: transparent;
    color: var(--danger);
    border: 1px solid var(--danger);
    padding: 7px 14px;
    font-size: 13px;
}

.btn-outline-danger:hover {
    background: var(--danger);
    color: white;
}

/* ──── Buttons ──── */

.btn {
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s;
}

.btn-primary {
    background: var(--primary);
    color: white;
}

.btn-primary:hover {
    background: var(--primary-hover);
}

.btn-secondary {
    background: var(--border);
    color: var(--text-secondary);
}

.btn-secondary:hover {
    background: #cbd5e1;
}

.btn-danger {
    background: transparent;
    color: var(--danger);
    padding: 6px 12px;
}

.btn-danger:hover {
    background: #fef2f2;
}

.btn-edit {
    background: transparent;
    color: var(--primary);
    padding: 6px 12px;
}

.btn-edit:hover {
    background: #eef2ff;
}

.btn-sm {
    padding: 4px 10px;
    font-size: 12px;
}

/* ──── Form ──── */

.form-card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
}

.form-card h3 {
    font-size: 16px;
    margin-bottom: 16px;
    color: var(--text);
}

.form-group {
    margin-bottom: 14px;
}

.form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 4px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="time"],
.form-group input[type="datetime-local"],
.form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    color: var(--text);
    background: var(--bg);
    transition: border-color 0.15s;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}

.form-row {
    display: flex;
    gap: 12px;
}

.form-row .form-group {
    flex: 1;
}

.form-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
}

/* ──── Weekday Picker ──── */

.weekday-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
}

.weekday {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
}

.weekday:has(input:checked) {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.weekday input {
    display: none;
}

/* ──── Card List ──── */

.card-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 12px;
    transition: box-shadow 0.15s;
}

.card:hover {
    box-shadow: var(--shadow-md);
}

.card.disabled {
    opacity: 0.5;
}

.card-toggle {
    position: relative;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
}

.card-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.card-toggle .slider {
    position: absolute;
    inset: 0;
    background: #cbd5e1;
    border-radius: 12px;
    cursor: pointer;
    transition: 0.2s;
}

.card-toggle .slider::before {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
}

.card-toggle input:checked + .slider {
    background: var(--success);
}

.card-toggle input:checked + .slider::before {
    transform: translateX(20px);
}

.card-info {
    flex: 1;
    min-width: 0;
}

.card-name {
    font-weight: 600;
    font-size: 15px;
}

.card-detail {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 2px;
}

.card-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    background: #eef2ff;
    color: var(--primary);
    margin-right: 6px;
}

.card-badge.once {
    background: #fef3c7;
    color: #d97706;
}

.card-badge.done {
    background: #f1f5f9;
    color: var(--text-muted);
}

.card-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
}

/* ──── Empty State ──── */

.empty-state {
    text-align: center;
    padding: 48px 16px;
    color: var(--text-muted);
}

.empty-state p:first-child {
    font-size: 16px;
    margin-bottom: 4px;
}

.hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
}

/* ──── Toast ──── */

.toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: var(--text);
    color: white;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 1000;
}

.toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

/* ──── Confirm Dialog ──── */

.confirm-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 2000;
    justify-content: center;
    align-items: center;
}

.confirm-overlay.visible {
    display: flex;
}

.confirm-dialog {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 28px 24px 20px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
    min-width: 300px;
    max-width: 400px;
    text-align: center;
    animation: confirmIn 0.15s ease;
}

@keyframes confirmIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
}

.confirm-dialog p {
    font-size: 15px;
    color: var(--text);
    line-height: 1.6;
    margin-bottom: 20px;
}

.confirm-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.confirm-actions .btn {
    min-width: 80px;
}
