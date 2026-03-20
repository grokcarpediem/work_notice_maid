// ──────────────────── State ────────────────────
let reminders = [];
let quietPeriods = [];

// ──────────────────── Init ────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    initTabs();
    try {
        await loadAll();
    } catch (e) {
        toast(e.message || "初始化加载失败");
    }
});

function initTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
        });
    });
}

async function loadAll() {
    await Promise.all([loadReminders(), loadQuietPeriods()]);
}

// ──────────────────── API helpers ────────────────────
async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const ct = (res.headers.get("content-type") || "").toLowerCase();

    // 后端异常或路由错误时，可能返回 HTML/空内容；这里做健壮解析，避免 WebKit JSON 解析报错
    if (ct.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data && data.error ? data.error : `请求失败(${res.status})`);
        }
        return data;
    }

    const text = await res.text();
    if (!res.ok) {
        throw new Error(text || `请求失败(${res.status})`);
    }
    // 兼容极少数非 JSON 的成功响应
    return text;
}

function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2500);
}

// ──────────────────── Reminders ────────────────────
async function loadReminders() {
    reminders = await api("GET", "/api/reminders");
    renderRecurring();
    renderOnce();
}

function renderRecurring() {
    const items = reminders.filter(r => r.type === "interval" || r.type === "daily");
    const list = document.getElementById("recurring-list");
    const empty = document.getElementById("recurring-empty");
    const clearBtn = document.getElementById("btn-clear-recurring");

    items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    clearBtn.style.display = items.length > 0 ? "inline-block" : "none";
    if (items.length === 0) {
        list.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";
    list.innerHTML = items.map(r => cardHTML(r, formatRecurringDetail(r))).join("");
}

function renderOnce() {
    const items = reminders.filter(r => r.type === "once");
    const list = document.getElementById("once-list");
    const empty = document.getElementById("once-empty");
    const clearBtn = document.getElementById("btn-clear-once");

    items.sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return parseOnceTime(a.once_at) - parseOnceTime(b.once_at);
    });

    clearBtn.style.display = items.length > 0 ? "inline-block" : "none";
    if (items.length === 0) {
        list.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";
    list.innerHTML = items.map(r => cardHTML(r, formatOnceDetail(r))).join("");
}

function parseOnceTime(str) {
    if (!str) return Infinity;
    const d = new Date(str.replace(" ", "T"));
    return isNaN(d) ? Infinity : d.getTime();
}

function formatRecurringDetail(r) {
    if (r.type === "interval") {
        const h = Math.floor(r.interval / 60);
        const m = r.interval % 60;
        let text = "每隔 ";
        if (h > 0) text += h + " 小时 ";
        if (m > 0) text += m + " 分钟";
        return `<span class="card-badge">间隔</span>${text}`;
    }
    return `<span class="card-badge">每天</span>${r.fixed_time || ""}`;
}

function formatOnceDetail(r) {
    const badge = r.enabled
        ? `<span class="card-badge once">待触发</span>`
        : `<span class="card-badge done">已完成</span>`;
    const dt = r.once_at ? formatDateTime(r.once_at) : "";
    return badge + dt;
}

function formatDateTime(str) {
    try {
        const d = new Date(str);
        if (isNaN(d)) return str;
        return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return str; }
}

function cardHTML(r, detail) {
    const disabledClass = r.enabled ? "" : " disabled";
    return `
    <div class="card${disabledClass}">
        <label class="card-toggle">
            <input type="checkbox" ${r.enabled ? "checked" : ""} onchange="toggleReminder('${r.id}', this.checked)">
            <span class="slider"></span>
        </label>
        <div class="card-info">
            <div class="card-name">${esc(r.name)}</div>
            <div class="card-detail">${detail}</div>
        </div>
        <div class="card-actions">
            <button class="btn btn-edit btn-sm" onclick="editReminder('${r.id}')">编辑</button>
            <button class="btn btn-danger btn-sm" onclick="deleteReminder('${r.id}')">删除</button>
        </div>
    </div>`;
}

async function toggleReminder(id, enabled) {
    try {
        const r = reminders.find(x => x.id === id);
        if (!r) return;
        r.enabled = enabled;
        await api("PUT", `/api/reminders/${id}`, r);
        await loadReminders();
        toast(enabled ? "已启用" : "已暂停");
    } catch (e) {
        toast(e.message || "操作失败");
        await loadReminders();
    }
}

async function deleteReminder(id) {
    if (!await showConfirm("确定要删除这条提醒吗？")) return;
    try {
        await api("DELETE", `/api/reminders/${id}`);
        await loadReminders();
        toast("已删除");
    } catch (e) {
        toast(e.message || "删除失败");
    }
}

// ──── Recurring Form ────
function showRecurringForm(editId) {
    document.getElementById("recurring-form").style.display = "block";
    document.getElementById("recurring-form-title").textContent = editId ? "编辑周期提醒" : "添加周期提醒";
    document.getElementById("recurring-edit-id").value = editId || "";

    if (editId) {
        const r = reminders.find(x => x.id === editId);
        if (r) {
            document.getElementById("recurring-name").value = r.name;
            document.getElementById("recurring-type").value = r.type;
            document.getElementById("recurring-interval").value = r.interval || 60;
            document.getElementById("recurring-fixedtime").value = r.fixed_time || "17:30";
        }
    } else {
        document.getElementById("recurring-name").value = "";
        document.getElementById("recurring-type").value = "interval";
        document.getElementById("recurring-interval").value = 60;
        document.getElementById("recurring-fixedtime").value = "17:30";
    }
    toggleRecurringFields();
}

function hideRecurringForm() {
    document.getElementById("recurring-form").style.display = "none";
}

function toggleRecurringFields() {
    const type = document.getElementById("recurring-type").value;
    document.getElementById("field-interval").style.display = type === "interval" ? "block" : "none";
    document.getElementById("field-fixedtime").style.display = type === "daily" ? "block" : "none";
}

async function saveRecurring() {
    const editId = document.getElementById("recurring-edit-id").value;
    const name = document.getElementById("recurring-name").value.trim();
    const type = document.getElementById("recurring-type").value;

    if (!name) { toast("请输入提醒名称"); return; }

    const data = { name, type, enabled: true };
    if (type === "interval") {
        data.interval = parseInt(document.getElementById("recurring-interval").value) || 60;
    } else {
        data.fixed_time = document.getElementById("recurring-fixedtime").value;
    }

    try {
        if (editId) {
            const existing = reminders.find(x => x.id === editId);
            if (existing) {
                data.enabled = existing.enabled;
                data.created_at = existing.created_at;
            }
            await api("PUT", `/api/reminders/${editId}`, data);
            toast("已更新");
        } else {
            await api("POST", "/api/reminders", data);
            toast("已添加");
        }
        hideRecurringForm();
        await loadReminders();
    } catch (e) {
        toast(e.message);
    }
}

// ──── Once Form ────
function showOnceForm(editId) {
    document.getElementById("once-form").style.display = "block";
    document.getElementById("once-form-title").textContent = editId ? "编辑单次提醒" : "添加单次提醒";
    document.getElementById("once-edit-id").value = editId || "";

    if (editId) {
        const r = reminders.find(x => x.id === editId);
        if (r && r.once_at) {
            document.getElementById("once-name").value = r.name;
            const dt = r.once_at.includes("T") ? r.once_at.slice(0, 16) : r.once_at.replace(" ", "T").slice(0, 16);
            document.getElementById("once-datetime").value = dt;
        }
    } else {
        document.getElementById("once-name").value = "";
        document.getElementById("once-datetime").value = "";
    }
}

function hideOnceForm() {
    document.getElementById("once-form").style.display = "none";
}

async function saveOnce() {
    const editId = document.getElementById("once-edit-id").value;
    const name = document.getElementById("once-name").value.trim();
    const datetime = document.getElementById("once-datetime").value;

    if (!name) { toast("请输入提醒名称"); return; }
    if (!datetime) { toast("请选择提醒时间"); return; }

    const onceAt = datetime.replace("T", " ") + ":00";
    const data = { name, type: "once", once_at: onceAt, enabled: true };

    try {
        if (editId) {
            const existing = reminders.find(x => x.id === editId);
            if (existing) data.created_at = existing.created_at;
            await api("PUT", `/api/reminders/${editId}`, data);
            toast("已更新");
        } else {
            await api("POST", "/api/reminders", data);
            toast("已添加");
        }
        hideOnceForm();
        await loadReminders();
    } catch (e) {
        toast(e.message);
    }
}

// ──── Edit dispatcher ────
function editReminder(id) {
    const r = reminders.find(x => x.id === id);
    if (!r) return;
    if (r.type === "once") {
        document.querySelector('[data-tab="once"]').click();
        setTimeout(() => showOnceForm(id), 100);
    } else {
        document.querySelector('[data-tab="recurring"]').click();
        setTimeout(() => showRecurringForm(id), 100);
    }
}

// ──────────────────── Quiet Periods ────────────────────
async function loadQuietPeriods() {
    quietPeriods = await api("GET", "/api/quiet-periods");
    renderQuiet();
}

function renderQuiet() {
    const list = document.getElementById("quiet-list");
    const empty = document.getElementById("quiet-empty");
    const clearBtn = document.getElementById("btn-clear-quiet");

    clearBtn.style.display = quietPeriods.length > 0 ? "inline-block" : "none";
    if (quietPeriods.length === 0) {
        list.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";
    list.innerHTML = quietPeriods.map(qp => quietCardHTML(qp)).join("");
}

const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function quietCardHTML(qp) {
    const days = qp.weekdays && qp.weekdays.length > 0
        ? qp.weekdays.map(d => weekdayNames[d]).join("、")
        : "每天";
    const disabledClass = qp.enabled ? "" : " disabled";

    return `
    <div class="card${disabledClass}">
        <label class="card-toggle">
            <input type="checkbox" ${qp.enabled ? "checked" : ""} onchange="toggleQuiet('${qp.id}', this.checked)">
            <span class="slider"></span>
        </label>
        <div class="card-info">
            <div class="card-name">${esc(qp.name)}</div>
            <div class="card-detail">${qp.start_time} ~ ${qp.end_time} · ${days}</div>
        </div>
        <div class="card-actions">
            <button class="btn btn-edit btn-sm" onclick="editQuiet('${qp.id}')">编辑</button>
            <button class="btn btn-danger btn-sm" onclick="deleteQuiet('${qp.id}')">删除</button>
        </div>
    </div>`;
}

async function toggleQuiet(id, enabled) {
    try {
        const qp = quietPeriods.find(x => x.id === id);
        if (!qp) return;
        qp.enabled = enabled;
        await api("PUT", `/api/quiet-periods/${id}`, qp);
        await loadQuietPeriods();
        toast(enabled ? "已启用" : "已暂停");
    } catch (e) {
        toast(e.message || "操作失败");
        await loadQuietPeriods();
    }
}

async function deleteQuiet(id) {
    if (!await showConfirm("确定要删除这个免打扰时段吗？")) return;
    try {
        await api("DELETE", `/api/quiet-periods/${id}`);
        await loadQuietPeriods();
        toast("已删除");
    } catch (e) {
        toast(e.message || "删除失败");
    }
}

function showQuietForm(editId) {
    document.getElementById("quiet-form").style.display = "block";
    document.getElementById("quiet-form-title").textContent = editId ? "编辑免打扰时段" : "添加免打扰时段";
    document.getElementById("quiet-edit-id").value = editId || "";

    // reset weekday checkboxes
    document.querySelectorAll(".weekday-picker input").forEach(cb => cb.checked = false);

    if (editId) {
        const qp = quietPeriods.find(x => x.id === editId);
        if (qp) {
            document.getElementById("quiet-name").value = qp.name;
            document.getElementById("quiet-start").value = qp.start_time;
            document.getElementById("quiet-end").value = qp.end_time;
            if (qp.weekdays) {
                qp.weekdays.forEach(d => {
                    const cb = document.querySelector(`.weekday-picker input[value="${d}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
    } else {
        document.getElementById("quiet-name").value = "";
        document.getElementById("quiet-start").value = "12:00";
        document.getElementById("quiet-end").value = "13:30";
    }
}

function hideQuietForm() {
    document.getElementById("quiet-form").style.display = "none";
}

async function saveQuiet() {
    const editId = document.getElementById("quiet-edit-id").value;
    const name = document.getElementById("quiet-name").value.trim();
    const startTime = document.getElementById("quiet-start").value;
    const endTime = document.getElementById("quiet-end").value;

    if (!name) { toast("请输入名称"); return; }
    if (!startTime || !endTime) { toast("请设置时间范围"); return; }

    const weekdays = [];
    document.querySelectorAll(".weekday-picker input:checked").forEach(cb => {
        weekdays.push(parseInt(cb.value));
    });

    const data = { name, start_time: startTime, end_time: endTime, weekdays, enabled: true };

    try {
        if (editId) {
            const existing = quietPeriods.find(x => x.id === editId);
            if (existing) data.enabled = existing.enabled;
            await api("PUT", `/api/quiet-periods/${editId}`, data);
            toast("已更新");
        } else {
            await api("POST", "/api/quiet-periods", data);
            toast("已添加");
        }
        hideQuietForm();
        await loadQuietPeriods();
    } catch (e) {
        toast(e.message);
    }
}

function editQuiet(id) {
    showQuietForm(id);
}

// ──────────────────── Clear All ────────────────────
async function clearRecurring() {
    const items = reminders.filter(r => r.type === "interval" || r.type === "daily");
    if (items.length === 0) return;
    if (!await showConfirm(`确定要清空全部 ${items.length} 条周期提醒吗？`)) return;
    try {
        await api("DELETE", "/api/reminders/clear/recurring");
        await loadReminders();
        toast("已清空全部周期提醒");
    } catch (e) { toast(e.message || "清空失败"); }
}

async function clearOnce() {
    const items = reminders.filter(r => r.type === "once");
    if (items.length === 0) return;
    if (!await showConfirm(`确定要清空全部 ${items.length} 条单次提醒吗？`)) return;
    try {
        await api("DELETE", "/api/reminders/clear/once");
        await loadReminders();
        toast("已清空全部单次提醒");
    } catch (e) { toast(e.message || "清空失败"); }
}

async function clearQuiet() {
    if (quietPeriods.length === 0) return;
    if (!await showConfirm(`确定要清空全部 ${quietPeriods.length} 条免打扰时段吗？`)) return;
    try {
        await api("DELETE", "/api/quiet-periods/clear/all");
        await loadQuietPeriods();
        toast("已清空全部免打扰时段");
    } catch (e) { toast(e.message || "清空失败"); }
}

// ──────────────────── Refresh ────────────────────
async function refreshData() {
    const btn = document.querySelector(".btn-refresh");
    btn.classList.add("spinning");
    try {
        await loadAll();
        toast("已刷新");
    } catch (e) {
        toast(e.message || "刷新失败");
    } finally {
        setTimeout(() => btn.classList.remove("spinning"), 600);
    }
}

// ──────────────────── Confirm Dialog ────────────────────
// Wails v2 的 WKWebView 未实现 WKUIDelegate.runJavaScriptConfirmPanel，
// 导致原生 window.confirm() 始终返回 false，因此使用自定义页面内弹窗替代。
function showConfirm(message) {
    return new Promise(resolve => {
        const overlay = document.getElementById("confirm-overlay");
        document.getElementById("confirm-message").textContent = message;
        overlay.classList.add("visible");

        const ok = document.getElementById("confirm-ok");
        const cancel = document.getElementById("confirm-cancel");

        function cleanup(result) {
            overlay.classList.remove("visible");
            ok.removeEventListener("click", onOk);
            cancel.removeEventListener("click", onCancel);
            resolve(result);
        }
        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }

        ok.addEventListener("click", onOk);
        cancel.addEventListener("click", onCancel);
    });
}

// ──────────────────── Util ────────────────────
function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}
