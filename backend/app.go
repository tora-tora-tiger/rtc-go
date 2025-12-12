package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
	pc *webrtc.PeerConnection
	ws *websocket.Conn
	wsHandler *WebSocketHandler
	dc *webrtc.DataChannel
	dataChannelReady chan struct{}
	logger logger.Logger
}

// NewApp creates a new App application struct
func NewApp(logger logger.Logger) *App {
	return &App{
		logger: logger,
		dataChannelReady: make(chan struct{}),
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

func (a *App) initializeDataChannel() error {
	// Check if data channel already exists
	if a.dc != nil {
		a.logger.Debug("Data channel already exists, skipping initialization")
		return nil
	}

	// Ensure PeerConnection is ready
	if a.pc == nil {
		return fmt.Errorf("PeerConnection is not initialized")
	}

	// Check connection state
	connectionState := a.pc.ConnectionState()
	a.logger.Debug(fmt.Sprintf("Creating data channel with connection state: %s", connectionState.String()))

	ordered := true
	maxRetransmits := uint16(0)

	dc, err := a.pc.CreateDataChannel("chat", &webrtc.DataChannelInit{
		Ordered:        &ordered,
		MaxRetransmits: &maxRetransmits,
	})
	if err != nil {
		a.logger.Error(fmt.Sprintf("Failed to create data channel: %s", err.Error()))
		return err
	}

	a.dc = dc
	a.logger.Debug("Data channel created successfully")

	// Set up data channel event handlers
	dc.OnOpen(func() {
		a.logger.Debug("Data channel opened and ready for messaging")
		// Use select to prevent closing an already closed channel
		select {
		case <-a.dataChannelReady:
			// Channel already closed, create new one
			a.dataChannelReady = make(chan struct{})
		default:
			close(a.dataChannelReady)
		}
	})

	dc.OnMessage(func(msg webrtc.DataChannelMessage) {
		a.logger.Debug(fmt.Sprintf("Received message: %s", string(msg.Data)))
		// Echo message back to WebSocket for debugging
		if a.wsHandler != nil {
			a.wsHandler.Emit("chat-message", map[string]string{
				"message": string(msg.Data),
				"sender":  "remote",
			})
		}
	})

	dc.OnClose(func() {
		a.logger.Debug("Data channel closed")
		a.dc = nil
		// Reset the ready channel for future use
		a.dataChannelReady = make(chan struct{})
	})

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
		a.logger.Trace("WebSocket initialization failed, panicking")
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
		a.logger.Trace("PeerConnection creation failed, panicking")
		panic(err)
	}
	a.pc = pc

	// websocket の初期化
	a.initializeWebSocketHandler()

	// WebRTC接続が確立されたときにデータチャネルを初期化
	a.pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		a.logger.Debug(fmt.Sprintf("WebRTC connection state changed to: %s", state.String()))
		if state == webrtc.PeerConnectionStateConnected {
			a.logger.Debug("WebRTC connection established, creating data channel")
			// Create data channel after connection is established
			err := a.initializeDataChannel()
			if err != nil {
				a.logger.Error(fmt.Sprintf("Failed to initialize data channel: %s", err.Error()))
			}
		}
	})

	// シグナリングが完了したときにもデータチャネルを初期化
	a.pc.OnSignalingStateChange(func(state webrtc.SignalingState) {
		a.logger.Debug(fmt.Sprintf("Signaling state changed to: %s", state.String()))
		if state == webrtc.SignalingStateStable && a.dc == nil {
			a.logger.Debug("Signaling complete, creating data channel")
			err := a.initializeDataChannel()
			if err != nil {
				a.logger.Error(fmt.Sprintf("Failed to initialize data channel: %s", err.Error()))
			}
		}
	})

	// Handle incoming data channels
	a.pc.OnDataChannel(func(dc *webrtc.DataChannel) {
		a.logger.Debug("Received external data channel")

		// Close existing data channel if any
		if a.dc != nil && a.dc != dc {
			a.dc.Close()
		}

		a.dc = dc

		dc.OnOpen(func() {
			a.logger.Debug("External data channel opened")
			// Use select to prevent closing an already closed channel
			select {
			case <-a.dataChannelReady:
				// Channel already closed
			default:
				close(a.dataChannelReady)
			}
		})

		dc.OnMessage(func(msg webrtc.DataChannelMessage) {
			a.logger.Debug(fmt.Sprintf("Received message on external data channel: %s", string(msg.Data)))
			runtime.EventsEmit(a.ctx, "chat-message", msg)
		
			// Echo message back to WebSocket for debugging
			a.wsHandler.Emit("chat-message", map[string]string{
				"message": string(msg.Data),
				"sender":  "remote",
			})
		})

		dc.OnClose(func() {
			a.logger.Debug("External data channel closed")
			if a.dc == dc {
				a.dc = nil
			}
		})
	})

	a.pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil {
			err := a.wsHandler.Emit("ice", candidate)
			if err != nil {
				a.logger.Error(fmt.Sprintf("Error sending ICE candidate: %s", err.Error()))
			} else {
				a.logger.Debug("Sent ICE candidate")
			}
		}
	})
}

func (a *App) JoinRoom(roomName string) string {
	a.logger.Debug(fmt.Sprintf("Joining room: %s", roomName))

	// Check current signaling state
	signalingState := a.pc.SignalingState()
	a.logger.Debug(fmt.Sprintf("Current signaling state: %s", signalingState.String()))

	var result string

	switch signalingState {
	case webrtc.SignalingStateStable:
		a.initializeDataChannel()

		// First client - create offer
		a.logger.Debug("Creating offer as initiator")
		offer, err := a.pc.CreateOffer(nil)
		if err != nil {
			a.logger.Error(fmt.Sprintf("Error creating offer: %s", err.Error()))
			return fmt.Sprintf("Error creating offer: %s", err.Error())
		}

		err = a.pc.SetLocalDescription(offer)
		if err != nil {
			a.logger.Error(fmt.Sprintf("Error setting local description: %s", err.Error()))
			return fmt.Sprintf("Error setting local description: %s", err.Error())
		}

		// Send offer via WebSocket
		err = a.wsHandler.Emit("offer", offer)
		if err != nil {
			a.logger.Error(fmt.Sprintf("Error sending offer: %s", err.Error()))
			return fmt.Sprintf("Error sending offer: %s", err.Error())
		}

		result = fmt.Sprintf("Joined room '%s' as initiator! WebRTC offer sent.", roomName)

	case webrtc.SignalingStateHaveRemoteOffer:
		// Second client - create answer
		a.logger.Debug("Creating answer as responder")
		answer, err := a.pc.CreateAnswer(nil)
		if err != nil {
			a.logger.Error(fmt.Sprintf("Error creating answer: %s", err.Error()))
			return fmt.Sprintf("Error creating answer: %s", err.Error())
		}

		err = a.pc.SetLocalDescription(answer)
		if err != nil {
			a.logger.Error(fmt.Sprintf("Error setting local description: %s", err.Error()))
			return fmt.Sprintf("Error setting local description: %s", err.Error())
		}

		// Send answer via WebSocket
		err = a.wsHandler.Emit("answer", answer)
		if err != nil {
			a.logger.Error(fmt.Sprintf("Error sending answer: %s", err.Error()))
			return fmt.Sprintf("Error sending answer: %s", err.Error())
		}

		result = fmt.Sprintf("Joined room '%s' as responder! WebRTC answer sent.", roomName)

	default:
		// Other states - wait for transition to stable
		a.logger.Debug(fmt.Sprintf("Waiting for signaling state to become stable, current state: %s", signalingState.String()))
		result = fmt.Sprintf("Joined room '%s', waiting for proper signaling state.", roomName)
	}

	return result
}

func (a *App) SendChatMessage(message string) string {
	if a.dc == nil {
		// Try to initialize data channel if it doesn't exist
		a.logger.Debug("Data channel is nil, attempting to initialize")
		err := a.initializeDataChannel()
		if err != nil {
			a.logger.Error(fmt.Sprintf("Failed to initialize data channel: %s", err.Error()))
			return fmt.Sprintf("Data channel not available and initialization failed: %s", err.Error())
		}

		// Still nil after initialization attempt?
		if a.dc == nil {
			return "Data channel is not initialized. Please ensure WebRTC connection is established."
		}
	}

	state := a.dc.ReadyState()
	a.logger.Debug(fmt.Sprintf("Data channel state: %s", state.String()))

	// Wait for data channel to be ready
	if state != webrtc.DataChannelStateOpen {
		a.logger.Debug("Waiting for data channel to open...")

		// Check connection state too
		if a.pc != nil {
			connectionState := a.pc.ConnectionState()
			a.logger.Debug(fmt.Sprintf("WebRTC connection state: %s", connectionState.String()))
			if connectionState != webrtc.PeerConnectionStateConnected {
				return "WebRTC connection is not established. Please wait for connection or check signaling."
			}
		}

		// Create a new channel for this message if needed
		if a.dataChannelReady == nil {
			a.dataChannelReady = make(chan struct{})
		}

		// Wait for data channel to be ready with timeout
		select {
		case <-a.dataChannelReady:
			a.logger.Debug("Data channel is now open")
		case <-time.After(10 * time.Second):
			return "Timeout waiting for data channel to open. Make sure another client is connected and WebRTC negotiation is complete."
		}
	}

	err := a.dc.SendText(message)
	if err != nil {
		a.logger.Error(fmt.Sprintf("Error sending message: %s", err.Error()))
		return fmt.Sprintf("Error sending message: %s", err.Error())
	}
	a.logger.Debug(fmt.Sprintf("Sent message: %s", message))
	return fmt.Sprintf("Message sent successfully: %s", message)
}