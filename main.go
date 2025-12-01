package main

import (
	"embed"

	"rtc/backend"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS
var appLogger logger.Logger

func main() {
	// Create logger instance
	appLogger = logger.NewDefaultLogger()

	// Create an instance of the app structure
	app := backend.NewApp(appLogger)

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "rtc",
		Width:  1024,
		Height: 768,
		// StartHidden: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Logger: appLogger,
		LogLevel: logger.DEBUG,
		LogLevelProduction: logger.ERROR,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.Startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
