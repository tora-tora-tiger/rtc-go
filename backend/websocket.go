package backend

import (
	"encoding/json"

	gorillaWebsocket "github.com/gorilla/websocket"
)

// 既存のWebSocketラッパーを修正して、イベントベースのハンドリングを追加

type WebSocketHandler struct {
	conn *gorillaWebsocket.Conn
	messageHandlers map[string]func([]byte)
	closeHandlers []func()
}

// メッセージ構造体
type EmitMessage struct {
    Type string      `json:"type"`
    Data interface{} `json:"data"`
}

func NewWebSocketHandler(conn *gorillaWebsocket.Conn) *WebSocketHandler { 
	return &WebSocketHandler{
		conn:            conn,
		messageHandlers: make(map[string]func([]byte)),
		closeHandlers:   []func(){},
	}
}

func (h *WebSocketHandler) On(event string, handler func([]byte)) {
	h.messageHandlers[event] = handler
}

func (h *WebSocketHandler) Off(event string) {
	delete(h.messageHandlers, event)
}

// func (h *WebSocketHandler) OnClose(handler func()) {
// 	h.closeHandlers = append(h.closeHandlers, handler)
// }

func (h *WebSocketHandler) Listen() {
	defer h.conn.Close()
	for {
		_, message, err := h.conn.ReadMessage()
		if err != nil {
			for _, handler := range h.closeHandlers {
				handler()
			}
			break
		}

		var event map[string]interface{}
		err = json.Unmarshal(message, &event)
		if err != nil {
			continue
		}

		if eventType, ok := event["type"].(string); ok {
			if handler, exists := h.messageHandlers[eventType]; exists {
				handler(message)
			}
		}
	}
}

func (ws *WebSocketHandler) Emit(event string, data interface{}) error {
    message := EmitMessage{
        Type: event,  // イベント名
        Data: data,   // イベントデータ
    }
    
    // JSONに変換して送信
    return ws.conn.WriteJSON(message)
}