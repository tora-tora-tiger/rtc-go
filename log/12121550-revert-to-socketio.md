# Socket.io実装に戻す修正ログ

## 実行日時
2025年12月12日 15:50

## 背景
- Socket.ioサーバーに切り替えたため
- WebSocketからSocket.ioクライアント実装に戻す必要あり

## 修正内容

### 1. インポートの変更
```typescript
// WebSocket実装からSocket.ioに変更
import io from "socket.io-client";
```

### 2. Socket.ioクライアントの初期化
```typescript
const socket = io("http://localhost:3001");
```

### 3. イベントハンドリングの変更

#### 接続イベント
```typescript
socket.on("connect", () => {
  console.log("Socket.io接続が確立されました");
  setIsConnected(true);
});

socket.on("disconnect", () => {
  console.log("Socket.io接続が切断されました");
  setIsConnected(false);
});

socket.on("connect_error", (error) => {
  console.error("Socket.io接続エラー:", error);
});
```

#### WebRTCシグナリングイベント
```typescript
socket.on("offer", async (desc) => {
  console.log("offerを受信:", desc);
  // ... WebRTC処理 ...
  socket.emit("answer", answerDesc);
  console.log("answerを送信:", answerDesc);
});

socket.on("answer", async (desc) => {
  console.log("answerを受信:", desc);
  await pc.setRemoteDescription(desc);
});

socket.on("ice", async (candidate) => {
  console.log("ICE candidateを受信:", candidate);
  await pc.addIceCandidate(candidate);
});
```

#### メッセージ送信
```typescript
socket.emit("offer", desc);
socket.emit("answer", answerDesc);
socket.emit("ice", candidate);
```

### 4. クリーンアップ処理
```typescript
return () => {
  socket.disconnect();
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach(track => track.stop());
  }
};
```

## 主な変更点の比較

| 項目 | WebSocket実装 | Socket.io実装 |
|------|---------------|---------------|
| 接続オブジェクト | `new WebSocket()` | `io()` |
| イベントリスナー | `onmessage` | `on("offer")`, `on("answer")` |
| メッセージ送信 | `send(JSON.stringify())` | `emit()` |
| 接続状態 | `readyState` | `connect`, `disconnect` |
| 自動再接続 | 手動実装 | 組み込み機能 |
| ロギング | 基本的 | 詳細なログを追加 |

## 追加された機能

### 1. 詳細なログ
```typescript
console.log("Socket.io接続が確立されました");
console.log("offerを受信:", desc);
console.log("answerを送信:", answerDesc);
console.log("ICE candidateを受信:", candidate);
```

### 2. エラーハンドリング
```typescript
socket.on("connect_error", (error) => {
  console.error("Socket.io接続エラー:", error);
});
```

### 3. クリーンな状態管理
- Socket.ioの組み込み再接続機能を活用
- 明確な接続/切断イベント

## 削除された要素

### WebSocket特有の実装
- `WebSocketMessage` インターフェース
- `connectWebSocket` 関数
- 再接続ロジック（Socket.ioに組み込み）
- 手動JSONパース処理
- `readyState` チェック

## 期待される動作

1. **自動接続**: Socket.ioの自動再接続が機能
2. **イベントベース**: クリーンなイベント駆動型アーキテクチャ
3. **エラーハンドリング**: Socket.io組み込みのエラー処理
4. **互換性**: Socket.ioサーバーとの完全互換

## 確認事項

1. **Socket.ioサーバーの起動**
   ```bash
   node server.js  # Socket.ioサーバー
   ```

2. **バージョン互換性**
   - クライアント: socket.io-client v4.8.1
   - サーバー: 対応するSocket.io v4.x

3. **CORS設定**
   - サーバー側で適切なCORS設定が必要

## 結果
WebSocketからSocket.ioへの完全な移行が完了し、Socket.ioサーバーとの互換性が確保されました。Socket.ioの組み込み機能により、再接続やエラーハンドリングがより堅牢になりました。