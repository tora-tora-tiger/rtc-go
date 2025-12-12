# Socket.ioからWebSocketへの修正ログ

## 実行日時
2025年12月12日 15:44

## 問題発生
フロントエンドでSocket.io接続時に「426 upgrade required」エラーが発生。

## 原因調査
1. フロントエンドがSocket.io v4.8.1を使用
2. バックエンドはNode.js WebSocketサーバー（wsライブラリ）
3. プロトコルが異なるため通信できない

## 提供されたバックエンド実装
```javascript
"use strict";

let WebSocketServer = require('ws').Server;
let port = 3001;
let wsServer = new WebSocketServer({ port: port });
console.log('websocket server start. port=' + port);

wsServer.on('connection', function(ws) {
  console.log('-- websocket connected --');
  ws.on('message', function(message) {
    console.log('received: %s', message);
    wsServer.clients.forEach(function each(client) {
      if (isSame(ws, client)) {
        console.log('- skip sender -');
      }
      else {
        client.send(message);
      }
    });
  });
});

function isSame(ws1, ws2) {
  return (ws1 === ws2);
}
```

## 解決策
Socket.ioをネイティブWebSocketに変更

## 修正内容

### 1. インポート変更
```typescript
// 修正前
import io from "socket.io-client";

// 修正後
// Socket.ioインポートを削除
```

### 2. WebSocketインターフェース追加
```typescript
interface WebSocketMessage {
  type: string;
  data: any;
}
```

### 3. WebSocket接続の初期化
```typescript
// 修正前
const socket = io("http://localhost:3001");

// 修正後
const wsRef = useRef<WebSocket | null>(null);
// useEffect内で初期化
wsRef.current = new WebSocket("ws://localhost:3001");
```

### 4. メッセージ送信関数
```typescript
const sendMessage = (type: string, data: any) => {
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({ type, data }));
  }
};
```

### 5. イベントハンドリングの変更

#### 接続イベント
```typescript
// 修正前
socket.on("connect", () => setIsConnected(true));
socket.on("disconnect", () => setIsConnected(false));

// 修正後
wsRef.current.onopen = () => setIsConnected(true);
wsRef.current.onclose = () => setIsConnected(false);
```

#### メッセージ受信
```typescript
// 修正前
socket.on("offer", async (desc) => { ... });
socket.on("answer", async (desc) => { ... });
socket.on("ice", async (candidate) => { ... });

// 修正後
wsRef.current.onmessage = async (event) => {
  const message: WebSocketMessage = JSON.parse(event.data);
  switch (message.type) {
    case "offer": await handleOffer(message.data); break;
    case "answer": await handleAnswer(message.data); break;
    case "ice": await handleIceCandidate(message.data); break;
  }
};
```

#### メッセージ送信
```typescript
// 修正前
socket.emit("offer", desc);
socket.emit("answer", answerDesc);
socket.emit("ice", candidate);

// 修正後
sendMessage("offer", desc);
sendMessage("answer", answerDesc);
sendMessage("ice", candidate);
```

### 6. クリーンアップ処理
```typescript
// 修正前
socket.disconnect();

// 修正後
if (wsRef.current) {
  wsRef.current.close();
}
```

## 技術的改善点

1. **プロトコル互換性**: WebSocketネイティブ実装に変更
2. **エラーハンドリング**: WebSocket固有のエラー処理を追加
3. **接続状態管理**: readyStateチェックを追加
4. **型安全性**: TypeScriptインターフェースを定義
5. **メッセージ形式**: JSON形式の統一

## 確認事項
- WebSocketサーバーがポート3001で実行中であること
- CORS設定が適切であること（必要に応じて）
- ファイアウォールでポート3001が開放されていること

## 結果
Socket.ioとWebSocketのプロトコル不一致による426エラーが解決され、正常にWebSocket通信が確立されるようになりました。