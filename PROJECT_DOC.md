# 工作提醒助手（Work Notice Maid）项目文档

> 本文档记录了项目的完整设计方案、技术架构、所有源码说明、API 接口、构建部署方式，以及开发过程中遇到的问题和解决方案。旨在为后续维护和修改提供完整的上下文参考。

---

## 目录

1. [项目概述](#1-项目概述)
2. [功能清单](#2-功能清单)
3. [技术架构](#3-技术架构)
4. [目录结构](#4-目录结构)
5. [数据模型](#5-数据模型)
6. [REST API 接口](#6-rest-api-接口)
7. [核心模块详解](#7-核心模块详解)
8. [前端页面](#8-前端页面)
9. [构建与部署](#9-构建与部署)
10. [命令行工具 maid](#10-命令行工具-maid)
11. [开发过程中的问题与解决方案](#11-开发过程中的问题与解决方案)
12. [迭代历史](#12-迭代历史)
13. [后续可扩展方向](#13-后续可扩展方向)

---

## 1. 项目概述

**工作提醒助手**是一个运行在 macOS 上的本地提醒服务，基于 Go 语言开发，使用 Wails v2 框架提供原生桌面窗口，同时支持无窗口的 HTTP 服务模式。

核心特点：
- **周期提醒**：固定间隔（如每60分钟）、每天固定时间（如17:30）
- **单次提醒**：指定日期时间一次性触发（如2026-03-18 10:00:00）
- **免打扰时段**：设置不提醒的时间段，支持按星期筛选
- **macOS 原生弹窗**：通过 `osascript` 调用 AppleScript `display dialog`，支持"稍后提醒"
- **双模式运行**：GUI 窗口（Wails）或后台 HTTP 服务（headless）
- **关闭不退出**：GUI 模式下关闭窗口仅隐藏，应用在 Dock 中后台运行，点击 Dock 图标重新显示窗口，Cmd+Q 才真正退出
- **JSON 文件存储**：轻量无依赖，数据持久化到本地 JSON 文件
- **日志管理**：按日期切分日志文件，自动清理3天前的日志

---

## 2. 功能清单

### 2.1 周期提醒
| 功能 | 说明 |
|------|------|
| 固定间隔提醒 | 设置每隔 N 分钟提醒一次（如每60分钟提醒站起来走走） |
| 每天固定时间 | 设置每天某个时间提醒（如17:30下楼取东西） |
| 启用/禁用 | 通过开关切换提醒是否生效 |
| 编辑/删除 | 修改已有提醒的参数 |
| 清空全部 | 一键清空所有周期提醒 |
| 按创建时间排序 | 列表按创建时间升序排列 |
| 同 Tab 名称去重 | 同一 Tab 下不允许同名提醒，不同 Tab 可以同名 |

### 2.2 单次提醒
| 功能 | 说明 |
|------|------|
| 指定日期时间 | 设置精确到分钟的一次性提醒 |
| 自动标记完成 | 触发后自动将 `enabled` 设为 `false` |
| 7天自动清理 | 完成后超过7天的单次提醒会被自动删除 |
| 排序 | 启用的排在前面，按时间远近排序（近的在前） |

### 2.3 免打扰设置
| 功能 | 说明 |
|------|------|
| 时间段设置 | 设置免打扰的开始和结束时间（如12:00-13:30） |
| 按星期筛选 | 可指定生效的星期几，不选则每天生效 |
| 跨午夜支持 | 支持23:00-06:00这类跨午夜的时段 |

### 2.4 通知
| 功能 | 说明 |
|------|------|
| macOS 原生弹窗 | 使用 `osascript display dialog`，300秒超时 |
| 稍后提醒 | 弹窗包含"5分钟后再提醒"按钮 |

### 2.5 系统功能
| 功能 | 说明 |
|------|------|
| 日志记录 | 按日期创建日志文件，同时输出到 stdout 和文件 |
| 日志清理 | 自动清理3天前的日志文件，每10分钟检查一次 |
| 数据刷新 | 前端刷新按钮，不会切换当前 Tab |
| DMG 打包 | 一键生成 macOS .dmg 安装包 |

---

## 3. 技术架构

```
┌──────────────────────────────────────────────────┐
│                   main.go                         │
│         ┌──────────┬──────────────┐              │
│         │ GUI 模式  │ Server 模式   │              │
│         │ (Wails)  │ (net/http)   │              │
│         └────┬─────┴──────┬───────┘              │
│              │            │                       │
│         ┌────▼────────────▼────┐                  │
│         │   api/handler.go     │ ← REST API      │
│         └──────────┬──────────┘                   │
│                    │                              │
│    ┌───────────────┼───────────────┐             │
│    │               │               │             │
│    ▼               ▼               ▼             │
│ store/          scheduler/     notifier/         │
│ store.go        scheduler.go   notifier_darwin.go│
│ (JSON持久化)    (30秒轮询)     (osascript弹窗)   │
│    │                                             │
│    ▼                                             │
│ model/model.go  ← 数据结构定义                    │
│                                                   │
│ logger/logger.go ← 日志管理                       │
│                                                   │
│ web/ ← 前端资源（embed 嵌入）                      │
│   ├── index.html                                 │
│   ├── style.css                                  │
│   └── app.js                                     │
└──────────────────────────────────────────────────┘
```

### 关键技术选型

| 技术 | 选型 | 说明 |
|------|------|------|
| 语言 | Go 1.26+ | 后端主语言 |
| GUI 框架 | Wails v2 | 原生 WebKit WebView 窗口 |
| 前端 | 原生 HTML/CSS/JS | 无框架依赖，通过 `go:embed` 嵌入 |
| 存储 | JSON 文件 | `data/reminders.json`，带读写锁 |
| 通知 | osascript | macOS AppleScript `display dialog` |
| HTTP | net/http | Go 标准库，Go 1.22+ 路由模式 |
| 日志 | io.MultiWriter | 同时输出到 stdout 和日期文件 |

---

## 4. 目录结构

```
work_notice_maid/
├── main.go                     # 入口：GUI/Server 双模式
├── go.mod                      # Go 模块定义
├── go.sum                      # 依赖校验
├── Makefile                    # 构建命令
├── build_dmg.sh                # DMG 打包脚本
├── maid.sh                     # ~/.zshrc 命令脚本
├── PROJECT_DOC.md              # 项目完整文档（本文件）
├── .gitignore
│
├── images/
│   └── f1_icon.svg             # 应用图标源文件（F1 红底白字 SVG）
│
├── internal/
│   ├── model/
│   │   └── model.go            # 数据结构定义
│   ├── store/
│   │   └── store.go            # JSON 文件存储（CRUD + 批量操作）
│   ├── scheduler/
│   │   └── scheduler.go        # 调度引擎（30秒轮询 + 自动清理）
│   ├── notifier/
│   │   └── notifier_darwin.go  # macOS 原生弹窗通知
│   └── logger/
│       └── logger.go           # 日志管理（日期切分 + 自动清理）
│
├── web/
│   ├── index.html              # 前端页面
│   ├── style.css               # 样式
│   └── app.js                  # 前端逻辑
│
├── build/                      # 构建产物（gitignore）
│   ├── WorkNoticeMaid.dmg      # DMG 安装包
│   └── 工作提醒助手.app/        # macOS 应用包
│
├── data/                       # 运行时数据（gitignore）
│   └── reminders.json          # 持久化数据
│
└── logs/                       # 运行时日志（gitignore）
    ├── 2026-03-17.log
    └── nohup.log               # 后台模式日志
```

---

## 5. 数据模型

### 5.1 Reminder（提醒）

```go
type ReminderType string

const (
    ReminderTypeInterval ReminderType = "interval" // 固定时长间隔
    ReminderTypeDaily    ReminderType = "daily"    // 每天固定时间
    ReminderTypeOnce     ReminderType = "once"     // 单次提醒
)

type Reminder struct {
    ID        string       `json:"id"`                    // 16位随机十六进制
    Name      string       `json:"name"`                  // 提醒名称
    Type      ReminderType `json:"type"`                  // 提醒类型
    Interval  int          `json:"interval,omitempty"`    // 分钟（interval类型）
    FixedTime string       `json:"fixed_time,omitempty"`  // HH:MM（daily类型）
    OnceAt    string       `json:"once_at,omitempty"`     // 日期时间（once类型）
    Enabled   bool         `json:"enabled"`               // 是否启用
    CreatedAt time.Time    `json:"created_at"`            // 创建时间
}
```

### 5.2 QuietPeriod（免打扰时段）

```go
type QuietPeriod struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    StartTime string `json:"start_time"`  // HH:MM
    EndTime   string `json:"end_time"`    // HH:MM
    Weekdays  []int  `json:"weekdays"`    // 0=周日,1=周一...6=周六；空=每天
    Enabled   bool   `json:"enabled"`
}
```

### 5.3 AppData（完整持久化结构）

```go
type AppData struct {
    Reminders    []Reminder           `json:"reminders"`
    QuietPeriods []QuietPeriod        `json:"quiet_periods"`
    LastFired    map[string]time.Time `json:"last_fired"`
}
```

**存储文件示例** (`data/reminders.json`)：
```json
{
  "reminders": [
    {
      "id": "a1b2c3d4e5f67890",
      "name": "站起来走一走",
      "type": "interval",
      "interval": 60,
      "enabled": true,
      "created_at": "2026-03-17T10:00:00Z"
    }
  ],
  "quiet_periods": [
    {
      "id": "1234567890abcdef",
      "name": "午休时间",
      "start_time": "12:00",
      "end_time": "13:30",
      "weekdays": [1, 2, 3, 4, 5],
      "enabled": true
    }
  ],
  "last_fired": {
    "a1b2c3d4e5f67890": "2026-03-17T11:00:00Z"
  }
}
```

---

## 6. REST API 接口

**基础地址**：
- GUI 模式：Wails 内部代理（无需指定端口）
- Server 模式：`http://localhost:7788`

### 6.1 提醒（Reminders）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/reminders` | 获取所有提醒 |
| `POST` | `/api/reminders` | 创建提醒 |
| `PUT` | `/api/reminders/{id}` | 更新提醒 |
| `DELETE` | `/api/reminders/{id}` | 删除单条提醒 |
| `DELETE` | `/api/reminders/clear/{group}` | 批量清空（`group`=`recurring`或`once`） |

**创建提醒 (POST /api/reminders)**

请求体：
```json
{
  "name": "站起来走一走",
  "type": "interval",
  "interval": 60,
  "enabled": true
}
```

响应 (201)：
```json
{
  "id": "a1b2c3d4e5f67890",
  "name": "站起来走一走",
  "type": "interval",
  "interval": 60,
  "enabled": true,
  "created_at": "2026-03-17T10:00:00Z"
}
```

错误响应（名称重复，409）：
```json
{
  "error": "已存在相同名称的提醒"
}
```

**分组规则**：
- `recurring` 组：`interval` + `daily` 类型
- `once` 组：`once` 类型
- 同组内名称不可重复，不同组可以重复

### 6.2 免打扰时段（Quiet Periods）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/quiet-periods` | 获取所有免打扰时段 |
| `POST` | `/api/quiet-periods` | 创建免打扰时段 |
| `PUT` | `/api/quiet-periods/{id}` | 更新免打扰时段 |
| `DELETE` | `/api/quiet-periods/{id}` | 删除单条 |
| `DELETE` | `/api/quiet-periods/clear/all` | 批量清空所有 |

**创建免打扰时段 (POST /api/quiet-periods)**

请求体：
```json
{
  "name": "午休时间",
  "start_time": "12:00",
  "end_time": "13:30",
  "weekdays": [1, 2, 3, 4, 5],
  "enabled": true
}
```

---

## 7. 核心模块详解

### 7.1 main.go — 入口程序

**双模式启动**：
- 默认启动 **GUI 模式**（Wails 原生窗口）
- 传入 `--server` 参数启动 **HTTP 服务模式**（headless）

**数据目录判断** (`getBaseDir()`):
- `.app` 包运行：`~/Library/Application Support/WorkNoticeMaid/`
- 独立二进制运行：与可执行文件同目录

**Wails GUI 配置**：
- 窗口尺寸：780x680，最小500x400
- `HideWindowOnClose: true`：关闭窗口仅隐藏，不退出进程
- macOS 隐藏式标题栏 (`TitleBarHiddenInset`)，通过 CSS `--wails-draggable: drag` 在 header 区域实现窗口拖拽
- 前端资源通过 `embed.FS` 嵌入，Wails AssetServer 提供服务
- API 请求通过 AssetServer 的 Handler 转发到 `apiMux`

**Server 模式**：
- 监听端口 `:7788`
- 支持 `SIGINT` / `SIGTERM` 优雅关闭

### 7.2 store/store.go — 数据存储

- 使用 `sync.RWMutex` 保证并发安全
- 所有写操作后立即 `save()` 持久化到 JSON 文件
- 支持 CRUD + 批量操作 + 名称去重检查

**关键方法**：

| 方法 | 说明 |
|------|------|
| `New(dataDir)` | 初始化存储，自动加载已有数据 |
| `GetReminders()` / `AddReminder()` / `UpdateReminder()` / `DeleteReminder()` | 提醒 CRUD |
| `GetQuietPeriods()` / `AddQuietPeriod()` / ... | 免打扰 CRUD |
| `ClearRemindersByGroup(group)` | 按分组批量清除提醒 |
| `ClearAllQuietPeriods()` | 清除所有免打扰时段 |
| `CleanupExpiredOnce(maxAge)` | 清理已完成超过 maxAge 的单次提醒，并返回持久化错误 |
| `HasReminderName(name, group, excludeID)` | 同组内名称查重 |
| `HasQuietPeriodName(name, excludeID)` | 免打扰名称查重 |
| `GetLastFired(id)` / `SetLastFired(id, t)` | 上次触发时间管理 |

### 7.3 scheduler/scheduler.go — 调度引擎

**运行机制**：
- 每 **30秒** 轮询一次所有提醒
- 每 **1小时**（120次轮询）执行一次过期单次提醒清理
- 启动时立即执行一次清理和检查
- **所有调度仅在软件运行（含后台）时执行，软件未启动时不进行任何调度**

**启动时初始化**：
- `resetIntervalTimers()`：将所有启用的周期提醒（interval）的 `LastFired` 重置为当前时间，使关闭期间的时差不算入间隔，重启后从零开始计时

**触发逻辑**：

| 类型 | 触发条件 | 说明 |
|------|----------|------|
| `interval` | 距离上次触发超过设定间隔 | 启动时重置计时起点，关闭期间不累积 |
| `daily` | 当前时间 >= 设定时间（HH:MM），且当天未触发 | 启动时若已过今日设定时间，补发通知 |
| `once` | 当前时间已过设定时间，且未被触发过 | 启动时若已过设定时间，补发通知 |

**免打扰判断**：
- 遍历所有启用的免打扰时段
- 检查星期是否匹配（空数组=每天生效）
- 检查当前时间是否在时段内（支持跨午夜）
- 如果处于任何免打扰时段内，跳过本轮所有提醒

**触发后行为**：
- 记录 `LastFired` 时间戳
- 单次提醒：自动设置 `enabled = false`
- 实时触发：异步调用 `notifyWithSnooze()`，用户可选择"稍后提醒"，等待5分钟后再次弹窗
- 补发触发：异步调用 `NotifySimple()`，仅弹出确认弹窗（无"稍后提醒"）
- 自动清理完成后如写盘失败，会记录 scheduler 错误日志

**实时触发 vs 补发**：
- **实时触发**：在设定时间点附近（同一分钟内）触发，弹窗包含"5分钟后再提醒"选项
- **补发**：软件启动后发现设定时间已过触发，仅弹出简单确认弹窗（无"稍后提醒"）
- 判断规则：daily 类型当前分钟 > 设定分钟为补发；once 类型超过设定时间 2 分钟以上为补发
- interval 类型不存在补发（启动时已重置计时器）

### 7.4 notifier/notifier_darwin.go — macOS 通知

**实现方式**：通过 `osascript` 执行 AppleScript

**主弹窗** (`Notify`)：
```applescript
display dialog "⏰ 站起来走一走" with title "工作提醒"
  buttons {"5分钟后再提醒", "好的"} default button "好的" giving up after 300
```
- 300秒自动消失
- 返回值：`ResultOK`(好的)、`ResultSnooze`(稍后)、`ResultError`(出错)

**简单弹窗** (`NotifySimple`)：
- 仅有"好的"按钮，用于5分钟后的再次提醒

### 7.5 logger/logger.go — 日志管理

**特性**：
- `io.MultiWriter`：同时输出到 stdout 和文件
- 日志格式：日期 + 时间 + 源文件短名 (`log.Ldate | log.Ltime | log.Lshortfile`)
- 文件命名：`2026-03-17.log`
- 每10分钟检查一次是否需要轮转（日期变更）和清理
- 自动删除超过3天的日志文件
- `Close()` 会通过 `done` channel 停止后台维护 goroutine，避免关闭后继续轮转或清理
- `cleanup()` 与 `Close()` 共用互斥锁，降低关闭瞬间的文件句柄竞态风险

### 7.6 api/handler.go — HTTP 接口

**路由注册方式**：使用 Go 1.22+ 的 `http.ServeMux` 方法+路径模式

**辅助函数**：
- `genID()`：生成16位随机十六进制 ID（`crypto/rand`）
- `writeJSON()`：统一 JSON 响应
- `writeError()`：统一错误响应
- `reminderGroup()`：根据类型返回分组名（`recurring` 或 `once`）

**校验逻辑**：
- 创建/更新时检查名称非空、类型非空
- 同组内名称查重，返回 HTTP 409 Conflict

---

## 8. 前端页面

### 8.1 页面结构 (index.html)

三个 Tab 页：
1. **周期提醒** (`tab-recurring`)：管理 interval / daily 类型提醒
2. **单次提醒** (`tab-once`)：管理 once 类型提醒
3. **免打扰设置** (`tab-quiet`)：管理免打扰时段

每个 Tab 包含：
- 工具栏：标题 + 添加按钮 + 清空全部按钮
- 表单区域（默认隐藏，点击添加/编辑时显示）
- 列表区域（卡片式布局）
- 空状态提示

顶部标题旁有**刷新按钮**，点击后刷新数据但不切换 Tab。初始化加载和手动刷新都带有错误兜底，接口异常时会通过 toast 提示，并确保刷新按钮复位。

### 8.2 样式设计 (style.css)

- CSS 变量驱动的主题系统（`--primary`, `--danger`, `--bg` 等）
- 现代化卡片式 UI，带阴影和圆角
- 自定义 Toggle 开关（纯 CSS 实现）
- 星期选择器（checkbox 联动 `:has()` 选择器）
- Toast 消息动画
- 刷新按钮旋转动画

### 8.3 前端逻辑 (app.js)

**数据流**：
```
loadAll() → loadReminders() + loadQuietPeriods()
         → renderRecurring() / renderOnce() / renderQuiet()
```

**排序规则**：
- 周期提醒：按 `created_at` 升序
- 单次提醒：启用的排前面，然后按 `once_at` 升序（近的在前）
- 免打扰时段：按原始顺序

**API 错误处理**：
- `api()` 函数在 `res.ok` 为 false 时抛出异常
- 表单提交、开关切换、删除、批量清空、初始化加载与手动刷新均使用 `try-catch` 处理异常
- 失败时通过 `toast()` 显示错误消息，避免未捕获 Promise 异常

**清空按钮**：
- 有数据时显示，无数据时隐藏
- 操作前弹出自定义确认弹窗（页面内 modal，替代 `window.confirm()`）

**自定义确认弹窗**：
- Wails v2 的 macOS `WKWebView` 未实现 `WKUIDelegate.runJavaScriptConfirmPanelWithMessage`，导致原生 `window.confirm()` 始终返回 `false`
- 使用页面内 HTML/CSS modal + Promise 替代，所有删除和清空操作通过 `showConfirm()` 异步确认

**窗口拖拽**：
- 使用 `TitleBarHiddenInset` 时 macOS 原生标题栏被隐藏，无默认拖拽区域
- 通过 CSS `--wails-draggable: drag` 将 header 区域声明为拖拽区域
- header 内的交互元素（刷新按钮）设置 `--wails-draggable: no-drag` 保证可点击
- header 顶部增加 padding（52px）为 macOS 红绿灯按钮留出空间

---

## 9. 构建与部署

### 9.1 前置要求

- macOS 11.0+
- Go 1.22+（使用了路由模式特性）
- Xcode Command Line Tools（CGO 编译需要）
- Python 3（DMG 打包时生成图标用）

### 9.2 编译二进制

```bash
# 直接编译（需要 Wails 构建标签）
CGO_LDFLAGS="-framework UniformTypeIdentifiers" \
CGO_ENABLED=1 \
go build -tags "desktop,production" -ldflags="-s -w" -o notice_maid .

# 或使用 Makefile
make build
```

**关键编译参数说明**：
| 参数 | 说明 |
|------|------|
| `CGO_ENABLED=1` | Wails 需要 CGO（WebKit 绑定） |
| `CGO_LDFLAGS="-framework UniformTypeIdentifiers"` | macOS arm64 需要链接此框架 |
| `-tags "desktop,production"` | Wails 必需的构建标签 |
| `-ldflags="-s -w"` | 去除调试信息，减小二进制体积 |

### 9.3 打包 DMG

```bash
# 一键打包
bash build_dmg.sh

# 或使用 Makefile
make dmg
```

打包流程：
1. 清理旧构建产物
2. 显式以 `GOOS=darwin GOARCH=arm64` 编译 arm64 二进制到 `.app/Contents/MacOS/`
3. 生成 `Info.plist`（Bundle ID: `com.noticemaid.app`）
4. 从 `images/f1_icon.svg` 生成应用图标：
   - 优先使用 `qlmanage` 将 SVG 渲染为 1024x1024 Master PNG
   - 备选方案：`rsvg-convert`（需 Homebrew librsvg）或 Python 程序化生成等效图标
   - 通过 `sips` 缩放为 iconset 所需的各尺寸（16~512，含 @2x）
   - 通过 `iconutil` 转换为 `.icns` 格式
5. 创建 DMG 临时目录，包含 `.app` 和 `/Applications` 快捷链接
6. `hdiutil` 打包为压缩 DMG（UDZO 格式）

**应用图标**：`images/f1_icon.svg`（F1 红底白字圆角矩形，512x512 SVG）

**产物**：`build/WorkNoticeMaid.dmg`（约 4.1MB）

### 9.4 .app 包内结构

```
工作提醒助手.app/
└── Contents/
    ├── Info.plist
    ├── MacOS/
    │   └── notice_maid      # 可执行二进制
    └── Resources/
        └── AppIcon.icns     # 应用图标
```

### 9.5 数据存储位置

| 运行方式 | 数据/日志目录 |
|----------|--------------|
| `.app` 包 | `~/Library/Application Support/WorkNoticeMaid/` |
| 独立二进制 | 与可执行文件同目录 |

### 9.6 安装使用

1. 双击 `WorkNoticeMaid.dmg` 挂载
2. 将「工作提醒助手」拖入 `Applications` 文件夹
3. 从启动台或 Finder 打开应用

---

## 10. 命令行工具 maid

### 10.1 安装

在 `~/.zshrc` 末尾添加：
```bash
source /Users/kernelmove/Documents/design_space/work_notice_maid/maid.sh
```

然后执行 `source ~/.zshrc` 生效。

### 10.2 使用方式

```bash
maid          # 打开 GUI 窗口（默认，等同于 maid gui）
maid gui      # 打开 GUI 窗口
maid start    # 后台启动 HTTP 服务（无窗口，端口7788）
maid stop     # 停止后台 HTTP 服务
maid status   # 查看后台 HTTP 服务状态
```

**后台模式**：
- 使用 `nohup` + `disown` 实现脱离终端运行
- 日志输出到 `logs/nohup.log`
- `stop` / `status` 仅匹配 `--server` 进程，不会误伤 GUI 进程

---

## 11. 开发过程中的问题与解决方案

### 11.1 Wails 构建标签缺失

**错误**：
```
GUI 启动失败: Wails applications will not build without the correct build tags.
```

**原因**：Wails v2 要求编译时必须传入 `desktop` 和 `production` 构建标签。

**解决**：编译命令加入 `-tags "desktop,production"`

### 11.2 macOS arm64 链接错误

**错误**：
```
Undefined symbols for architecture arm64: "_OBJC_CLASS_$_UTType"
```

**原因**：较新版本的 macOS 需要显式链接 `UniformTypeIdentifiers` 框架。

**解决**：增加 `CGO_LDFLAGS="-framework UniformTypeIdentifiers"`

### 11.3 多包编译报错

**错误**：
```
go: cannot write multiple packages to non-directory notice_maid
```

**原因**：`go build -o notice_maid ./...` 尝试编译所有包到单一文件。

**解决**：改为 `go build -o notice_maid .`（只编译 main 包）

### 11.4 端口被占用

**错误**：
```
HTTP 服务异常: listen tcp :8080: bind: address already in use
```

**解决**：
```bash
lsof -ti:7788 | xargs kill -9
```

### 11.5 hdiutil 资源忙

**错误**：
```
hdiutil: create failed - 资源忙
```

**原因**：之前的 DMG 卷可能仍处于挂载状态。

**解决**：
```bash
hdiutil detach /Volumes/WorkNoticeMaid
```

### 11.6 Wails 依赖安装受限

**问题**：`go get github.com/wailsapp/wails/v2` 时因 Wails 源码中包含 `.vscode` 目录导致 unzip 权限问题。

**解决**：手动在项目目录执行 `go get` 安装依赖。

### 11.7 .app 包内数据目录

**问题**：`.app` 包内 `Contents/MacOS/` 目录不适合存放运行时数据，且应用更新会丢失数据。

**解决**：`getBaseDir()` 检测到 `.app` 路径时自动切换到 `~/Library/Application Support/WorkNoticeMaid/`。

### 11.8 window.confirm() 在 Wails 中不工作

**问题**：Wails v2 macOS 的 `WKWebView` 中，`window.confirm()` 始终返回 `false`，导致所有删除和清空操作在发起 API 请求前就提前退出。

**原因**：`WailsContext` 类实现了 `WKUIDelegate` 协议，但未实现 `runJavaScriptConfirmPanelWithMessage:initiatedByFrame:completionHandler:` 委托方法。WebKit 在缺失此方法时静默返回 `false`。

**解决**：使用自定义页面内确认弹窗（HTML/CSS modal + JavaScript Promise）替代 `window.confirm()`，通过 `showConfirm()` 异步函数实现。

### 11.9 TitleBarHiddenInset 窗口无法拖拽

**问题**：使用 `mac.TitleBarHiddenInset()` 后，macOS 原生标题栏被隐藏，窗口失去拖拽区域，无法移动或切换屏幕。

**原因**：`TitleBarHiddenInset` 将内容扩展到标题栏区域，macOS 红绿灯按钮仍可见但无标准拖拽区域。Wails 通过 CSS 自定义属性 `--wails-draggable` 来声明拖拽区域。

**解决**：
- 在 `.header` 元素添加 `--wails-draggable: drag` 声明为拖拽区域
- 在交互元素（如刷新按钮）添加 `--wails-draggable: no-drag` 保证可点击
- 增加 header 顶部 padding（52px）为红绿灯按钮留出空间

---

## 12. 迭代历史

按时间顺序记录所有功能迭代：

| 序号 | 变更 | 涉及文件 |
|------|------|----------|
| 1 | 初始项目搭建：Go 模块、数据模型、JSON 存储、调度引擎、macOS 通知、REST API、Web 前端 | 全部文件创建 |
| 2 | 添加"清空全部"按钮到每个 Tab 右上角 | `store.go`, `handler.go`, `index.html`, `style.css`, `app.js` |
| 3 | 单次提醒完成7天后自动删除 | `store.go` (`CleanupExpiredOnce`), `scheduler.go` (`cleanup`) |
| 4 | 所有提醒按时间排序（近的在前） | `app.js` (`renderRecurring`, `renderOnce`) |
| 5 | 同 Tab 名称去重（不同 Tab 允许重复） | `store.go` (`HasReminderName`, `HasQuietPeriodName`), `handler.go` |
| 6 | 修改默认端口从 8080 到 7788 | `main.go` |
| 7 | 添加刷新按钮（不切换 Tab） | `index.html`, `style.css`, `app.js` (`refreshData`) |
| 8 | 添加日志系统：按日期文件、3天清理 | `logger/logger.go` 新建, `main.go` 引入 |
| 9 | 生成可执行二进制 + `~/.zshrc` alias | `maid.sh`, `.gitignore` |
| 10 | 将 alias 从 `~/.zshrc` 内联改为 `source maid.sh` | `maid.sh` 重构 |
| 11 | Wails v2 GUI 替换浏览器打开方式 | `main.go` 重写, `go.mod` 添加依赖, `index.html` 路径修改 |
| 12 | 修复 Wails 构建标签 + arm64 链接问题 | `Makefile` 创建 |
| 13 | DMG 打包 + .app 包数据目录调整 | `build_dmg.sh` 新建, `main.go` (`getBaseDir` 修改), `Makefile` 更新 |
| 14 | 自定义 F1 应用图标：新增 `images/` 目录存放 SVG 源文件，修改 `build_dmg.sh` 从 SVG 生成 .icns | `images/f1_icon.svg` 新建, `build_dmg.sh` 重写图标生成逻辑 |
| 15 | 基于 CR 修复健壮性问题：前端初始化/刷新错误兜底、过期清理持久化错误、`maid` 后台进程匹配、DMG arm64 显式编译、logger 关闭竞态 | `web/app.js`, `store.go`, `scheduler.go`, `maid.sh`, `build_dmg.sh`, `logger.go` |
| 16 | GUI 关闭窗口不退出：`HideWindowOnClose: true`，关闭窗口仅隐藏到 Dock，Cmd+Q 才真正退出 | `main.go` |
| 17 | 修复删除/清空无效：Wails WKWebView 不支持 `window.confirm()`（始终返回 false），改用自定义页面内确认弹窗 | `web/index.html`, `web/style.css`, `web/app.js` |
| 18 | 修复窗口无法拖拽：为 `TitleBarHiddenInset` 添加 CSS `--wails-draggable: drag` 拖拽区域，增加顶部 padding 为红绿灯留空间 | `web/style.css` |
| 19 | 调度策略优化：周期提醒启动时重置计时器（关闭期间不累积）；每日提醒支持补发（已过时间也触发）；区分实时触发（有 snooze）和补发（无 snooze） | `scheduler.go` |

---

## 13. 后续可扩展方向

以下是尚未实现但可考虑的扩展方向：

1. ~~自定义应用图标~~（已完成：使用 `images/f1_icon.svg` 作为应用图标）
2. **菜单栏常驻**：在 macOS 菜单栏添加图标，快速查看即将到来的提醒
3. **提醒声音**：除了弹窗外增加提示音
4. **数据导入/导出**：支持 JSON 数据备份和恢复
5. **多语言支持**：目前界面为中文，可扩展为多语言
6. **重复日期模式**：支持更复杂的重复模式（如每月第一个周一）
7. **代码签名与公证**：通过 Apple Developer 证书签名，解决"未知开发者"警告
8. **自动启动**：添加到 macOS 登录项，开机自启
9. **通知中心集成**：使用 macOS UserNotifications 框架替代 `osascript`
10. **网络同步**：多设备间同步提醒数据

---

## 附录 A：完整依赖列表

```
github.com/wailsapp/wails/v2 v2.11.0
```

主要间接依赖：
- `github.com/gorilla/websocket` — Wails 前后端通信
- `github.com/labstack/echo/v4` — Wails 内部 HTTP 框架
- `github.com/leaanthony/go-ansi-parser` — 终端输出解析
- `github.com/wailsapp/go-webview2` — WebView 绑定（Windows）
- `github.com/wailsapp/mimetype` — MIME 类型检测

## 附录 B：Makefile 命令速查

```bash
make build    # 编译二进制
make dmg      # 打包 DMG 安装包
make server   # 以 Server 模式运行
make clean    # 清理所有构建产物
```

## 附录 C：关键编译命令

```bash
# 完整编译命令
CGO_LDFLAGS="-framework UniformTypeIdentifiers" \
CGO_ENABLED=1 \
go build -tags "desktop,production" -ldflags="-s -w" -o notice_maid .
```

---

*文档生成日期：2026-03-17*
*文档最后更新：2026-03-17*
*项目版本：1.0.0*
