#!/bin/bash
# 工作提醒服务 - maid 命令
# 用法:
#   maid          打开 GUI 窗口
#   maid start    后台启动 HTTP 服务（无窗口）
#   maid stop     停止后台服务
#   maid status   查看后台服务状态

maid() {
    local BIN="/Users/kernelmove/Documents/design_space/work_notice_maid/notice_maid"
    local LOGS="/Users/kernelmove/Documents/design_space/work_notice_maid/logs"

    case "${1:-gui}" in
        gui)
            "$BIN" &
            disown
            echo "GUI 窗口已打开"
            ;;
        start)
            local PID
            PID=$(pgrep -f "$BIN --server" 2>/dev/null)
            if [ -n "$PID" ]; then
                echo "后台服务已在运行中 (PID: $PID)"
                echo "访问: http://localhost:7788"
                return 0
            fi
            mkdir -p "$LOGS"
            nohup "$BIN" --server >> "$LOGS/nohup.log" 2>&1 &
            disown
            echo "后台服务已启动 (PID: $!)"
            echo "访问: http://localhost:7788"
            echo "日志: $LOGS/"
            ;;
        stop)
            local PID
            PID=$(pgrep -f "$BIN --server" 2>/dev/null)
            if [ -z "$PID" ]; then
                echo "后台服务未运行"
                return 0
            fi
            kill $PID && echo "后台服务已停止 (PID: $PID)"
            ;;
        status)
            local PID
            PID=$(pgrep -f "$BIN --server" 2>/dev/null)
            if [ -n "$PID" ]; then
                echo "后台服务运行中 (PID: $PID)"
            else
                echo "后台服务未运行"
            fi
            ;;
        *)
            echo "用法: maid [gui|start|stop|status]"
            echo "  gui     打开 GUI 窗口（默认）"
            echo "  start   后台启动 HTTP 服务"
            echo "  stop    停止服务"
            echo "  status  查看状态"
            ;;
    esac
}
