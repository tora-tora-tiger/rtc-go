# GoからReactへのWebRTCデータ表示実装ガイド

## 実施日時
2025年12月11日 10:50

## 目的
WailsアプリケーションでGoバックエンドが受け取ったWebRTCメッセージをReactフロントエンドにリアルタイム表示する方法

## 使用技術
- Wails v2 イベントシステム
- React hooks (useEffect, useState)
- WebRTC DataChannel

## 実装方法

### 1. Go側の実装

#### App structの準備
```go
type App struct {
    ctx context.Context
    pc *webrtc.PeerConnection
    ws *websocket.Conn
    wsHandler *WebSocketHandler
    dc *webrtc.DataChannel
    dataChannelReady chan struct{}
    logger logger.Logger
}
```

#### イベント送信の実装
```go
dc.OnMessage(func(msg webrtc.DataChannelMessage) {
    a.logger.Debug(fmt.Sprintf("Received message: %s", string(msg.Data)))

    // WailsイベントシステムでReactに通知
    if a.ctx != nil {
        messageData := map[string]interface{}{
            "message": string(msg.Data),
            "sender":  "remote",
            "timestamp": time.Now().Unix(),
        }

        // イベントを送信
        runtime.EventsEmit(a.ctx, "webrtc-message", messageData)
    }
})
```

### 2. React側の実装

#### イベントリスナーの設定
```tsx
import { useState, useEffect, useRef } from "react";
import { JoinRoom, SendChatMessage } from "../../wailsjs/go/backend/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";

const DebugChat: React.FC<DebugChatProps> = () => {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        // WebRTCメッセージ受信イベント
        EventsOn("webrtc-message", (data) => {
            console.log("WebRTC message received:", data);
            addMessage(data.message, "chat", data.sender || "リモート");
        });

        // WebSocketメッセージ受信イベント（必要に応じて）
        EventsOn("chat-message", (data) => {
            console.log("WebSocket message received:", data);
            addMessage(data.message, "chat", data.sender || "システム");
        });

        // デバッグ用：接続状態変化イベント
        EventsOn("connection-state-change", (data) => {
            console.log("Connection state changed:", data);
            addMessage(`接続状態: ${data.state}`, "system");
        });

    }, []); // 空の依存配列で初回のみ実行

    const addMessage = (content: string, type: "chat" | "system" = "system", sender: string = "システム") => {
        const newMessage: Message = {
            id: `${Date.now()}-${Math.random()}`,
            sender,
            content,
            timestamp: new Date(),
            type,
        };
        setMessages((prev) => [...prev, newMessage]);
    };

    // ... 既存のUI実装
};
```

### 3. エラーハンドリング

#### Go側でのエラー送信
```go
if err := a.dc.SendText(message); err != nil {
    runtime.EventsEmit(a.ctx, "send-error", map[string]string{
        "error": err.Error(),
        "message": message,
    })
}
```

#### React側でのエラー受信
```tsx
EventsOn("send-error", (data) => {
    addMessage(`送信エラー: ${data.error}`, "system");
});
```

## イベントタイプの設計

### 主要なイベント
- `webrtc-message`: WebRTC DataChannelメッセージ受信
- `chat-message`: WebSocket経由のメッセージ受信
- `connection-state-change`: WebRTC接続状態変化
- `send-error`: メッセージ送信エラー
- `data-channel-open`: データチャネル接続確立
- `data-channel-close`: データチャネル切断

### イベントデータ構造
```typescript
interface WebRTCMessageData {
    message: string;
    sender: string;
    timestamp: number;
}

interface ConnectionStateData {
    state: string;
    previousState?: string;
}

interface ErrorData {
    error: string;
    message?: string;
    type?: string;
}
```

## デバッグ方法

### 1. ブラウザデベロッパーツール
```javascript
// コンソールでイベントを確認
console.log("イベントリスナー登録中");

// イベントの監視
window.addEventListener('message', (event) => {
    if (event.data.type?.startsWith('wails://')) {
        console.log('Wailsイベント:', event.data);
    }
});
```

### 2. Wailsログ
```go
// Go側で詳細ログ
a.logger.Debug(fmt.Sprintf("Sending event: webrtc-message with data: %v", messageData))
```

### 3. Reactコンソール
```tsx
useEffect(() => {
    EventsOn("webrtc-message", (data) => {
        console.log("📨 WebRTCメッセージ受信:", {
            timestamp: new Date().toISOString(),
            data: data
        });
        addMessage(data.message, "chat", data.sender || "リモート");
    });
}, []);
```

## パフォーマンス考慮

### 1. メッセージ履歴の管理
```tsx
// メッセージ数の制限
const MAX_MESSAGES = 100;

const addMessage = (content: string, type: "chat" | "system" = "system", sender: string = "システム") => {
    const newMessage: Message = {
        id: `${Date.now()}-${Math.random()}`,
        sender,
        content,
        timestamp: new Date(),
        type,
    };

    setMessages((prev) => {
        const updated = [...prev, newMessage];
        return updated.length > MAX_MESSAGES
            ? updated.slice(-MAX_MESSAGES)
            : updated;
    });
};
```

### 2. イベントリスナーのクリーンアップ
```tsx
useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // イベントリスナーを登録
    const unsub1 = EventsOn("webrtc-message", handleMessage);
    unsubscribers.push(unsub1);

    return () => {
        // コンポーネントアンマウント時にすべてのリスナーを解除
        unsubscribers.forEach(unsub => unsub?.());
    };
}, []);
```

## 次のステップ

1. ✅ イベントシステムの実装
2. ✅ リアルタイムメッセージ表示
3. 🔄 エラーハンドリングの強化
4. 🔄 UI/UXの改善（通知、サウンドなど）
5. 🔄 メッセージ履歴の永続化
6. 🔄 複数ルーム対応

## まとめ

Wailsのイベントシステムを使用することで、GoバックエンドとReactフロントエンド間のリアルタイム通信が簡単に実現できます。このアプローチにより：

- WebSocketよりも低レイテンシな通信
- 型安全なイベントハンドリング
- 簡潔な実装
- スケーラブルなアーキテクチャ

が実現可能です。