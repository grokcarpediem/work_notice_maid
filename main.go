package main

import (
	"context"
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	"work_notice_maid/internal/api"
	"work_notice_maid/internal/logger"
	"work_notice_maid/internal/notifier"
	"work_notice_maid/internal/scheduler"
	"work_notice_maid/internal/store"
)

//go:embed web/*
var webFS embed.FS

var serverMode = flag.Bool("server", false, "以 HTTP 服务模式运行（无 GUI 窗口）")

func main() {
	flag.Parse()

	baseDir := getBaseDir()
	logsDir := filepath.Join(baseDir, "logs")
	dataDir := filepath.Join(baseDir, "data")

	lg, err := logger.New(logsDir, 3*24*time.Hour)
	if err != nil {
		log.Fatalf("初始化日志失败: %v", err)
	}

	log.Printf("数据目录: %s", dataDir)
	log.Printf("日志目录: %s", logsDir)

	st, err := store.New(dataDir)
	if err != nil {
		log.Fatalf("初始化存储失败: %v", err)
	}

	ntf := notifier.New()
	sc := scheduler.New(st, ntf)
	sc.Start()

	apiMux := http.NewServeMux()
	api.NewHandler(st).RegisterRoutes(apiMux)

	if *serverMode {
		runServer(sc, lg, apiMux)
	} else {
		runGUI(sc, lg, apiMux)
	}
}

// runGUI 以 Wails 原生窗口模式运行
func runGUI(sc *scheduler.Scheduler, lg *logger.Logger, apiMux *http.ServeMux) {
	webContent, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatalf("加载前端资源失败: %v", err)
	}

	// 静态文件服务
	fileServer := http.FileServer(http.FS(webContent))

	// 包装 handler：/api/ 请求交给 apiMux，其它走静态文件
	wrappedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 如果是 /api/ 开头的请求，交给 apiMux
		if strings.HasPrefix(r.URL.Path, "/api/") {
			apiMux.ServeHTTP(w, r)
			return
		}

		// 否则交给静态文件服务器
		fileServer.ServeHTTP(w, r)
	})

	log.Println("以 GUI 模式启动")

	err = wails.Run(&options.App{
		Title:             "工作提醒助手",
		Width:             780,
		Height:            680,
		MinWidth:          500,
		MinHeight:         400,
		HideWindowOnClose: true,
		AssetServer: &assetserver.Options{
			Assets:  webContent,
			Handler: wrappedHandler,
		},
		OnShutdown: func(ctx context.Context) {
			sc.Stop()
			lg.Close()
			log.Println("应用退出，服务停止")
		},
		Mac: &mac.Options{
			TitleBar: mac.TitleBarHiddenInset(),
			About: &mac.AboutInfo{
				Title:   "工作提醒助手",
				Message: "一个简单的工作提醒管理工具",
			},
		},
	})
	if err != nil {
		log.Fatalf("GUI 启动失败: %v", err)
	}
}

// runServer 以无窗口 HTTP 服务模式运行（后台/headless）
func runServer(sc *scheduler.Scheduler, lg *logger.Logger, apiMux *http.ServeMux) {
	defer sc.Stop()
	defer lg.Close()

	webContent, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatalf("加载前端资源失败: %v", err)
	}
	apiMux.Handle("GET /", http.FileServer(http.FS(webContent)))

	addr := ":7788"
	log.Printf("以 Server 模式启动在 http://localhost%s", addr)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	srv := &http.Server{Addr: addr, Handler: apiMux}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP 服务异常: %v", err)
		}
	}()

	<-quit
	log.Println("正在关闭服务...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("HTTP 服务关闭异常: %v", err)
	}
}

func getBaseDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	exeDir := filepath.Dir(exe)

	if strings.Contains(exeDir, ".app/Contents/MacOS") {
		home, err := os.UserHomeDir()
		if err != nil {
			return exeDir
		}
		appSupport := filepath.Join(home, "Library", "Application Support", "WorkNoticeMaid")
		if err := os.MkdirAll(appSupport, 0755); err != nil {
			log.Printf("创建应用数据目录失败: %v，将使用可执行文件所在目录", err)
			return exeDir
		}
		return appSupport
	}

	return exeDir
}
