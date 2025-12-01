package backend

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

// App struct
type App struct {
	ctx context.Context
	pc *webrtc.PeerConnection
	ws *websocket.Conn
	wsHandler *WebSocketHandler
	logger logger.Logger
}

// NewApp creates a new App application struct
func NewApp(logger logger.Logger) *App {
	return &App{
		logger: logger,
	}
}

func (a *App) initializeWebSocket() (error) {
	var dialer websocket.Dialer
	ws, _, err := dialer.Dial("ws://localhost:3001", nil)
	if err != nil {
		return err
	}
	a.ws = ws

	return nil
}

func (a *App) initializeWebSocketHandler() {
	wsHandler := NewWebSocketHandler(a.ws)
	a.wsHandler = wsHandler
	wsHandler.On("offer", func(message []byte) {
		var desc webrtc.SessionDescription
		if err := json.Unmarshal(message, &desc); err != nil {
			a.logger.Debug(fmt.Sprintf("Error unmarshaling offer: %s", err.Error()))
			return
		}

		err := a.pc.SetRemoteDescription(desc)
		if err != nil {
			a.logger.Debug(fmt.Sprintf("Error setting remote description: %s", err.Error()))
			return
		}
		a.logger.Debug("Remote description set")

		answer, err := a.pc.CreateAnswer(nil)
		if err != nil {
			a.logger.Debug(fmt.Sprintf("Error creating answer: %s", err.Error()))
			return
		}

		err = a.pc.SetLocalDescription(answer)
		if err != nil {
			a.logger.Debug(fmt.Sprintf("Error setting local description: %s", err.Error()))
			return
		}
		a.wsHandler.Emit("answer", answer)
		a.logger.Debug("Sent answer")
	})

	a.wsHandler.On("answer", func(message []byte) {
		var desc webrtc.SessionDescription
		if err := json.Unmarshal(message, &desc); err != nil {
			a.logger.Debug(fmt.Sprintf("Error unmarshaling answer: %s", err.Error()))
			return
		}

		err := a.pc.SetRemoteDescription(desc)
		if err != nil {
			a.logger.Debug(fmt.Sprintf("Error setting remote description: %s", err.Error()))
			return
		}
		a.logger.Debug("Remote description set")
	})

	a.wsHandler.On("ice", func(message []byte) {
		var candidate webrtc.ICECandidateInit
		if err := json.Unmarshal(message, &candidate); err != nil {
			a.logger.Debug(fmt.Sprintf("Error unmarshaling ICE candidate: %s", err.Error()))
			return
		}

		err := a.pc.AddICECandidate(candidate)
		if err != nil {
			a.logger.Debug(fmt.Sprintf("Error adding ICE candidate: %s", err.Error()))
			return
		}
		a.logger.Debug("Added ICE candidate")
	})

	go wsHandler.Listen()
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	err := a.initializeWebSocket()
	if err != nil {
		panic(err)
	}

	// Initialize WebRTC PeerConnection
	pc, err := webrtc.NewPeerConnection(webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302"},
			},
		},
	})
	if err != nil {
		panic(err)
	}
	a.pc = pc

	a.initializeWebSocketHandler()
	a.pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil {
			err := a.ws.WriteJSON(candidate)
			if err != nil {
				a.logger.Error(fmt.Sprintf("Error sending ICE candidate: %s", err.Error()))
			} else {
				a.logger.Debug("Sent ICE candidate")
			}
		}
	})
}

func (a *App) CreateRoom(roomName string) string {
	a.logger.Debug(fmt.Sprintf("Creating room: %s", roomName))
	return fmt.Sprintf("Room '%s' created successfully!", roomName)
}

func (a *App) JoinRoom(roomName string) string {
	a.logger.Debug(fmt.Sprintf("Joining room: %s", roomName))
	return fmt.Sprintf("Joined room '%s' successfully!", roomName)
}