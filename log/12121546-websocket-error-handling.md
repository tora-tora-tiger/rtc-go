# WebSocket接続エラーハンドリング修正ログ

## 実行日時
2025年12月12日 15:46

## 問題発生
WebSocket接続時にエラーが発生：
- `readyState: 3`（CLOSED状態）
- WebSocketサーバーに接続できない

## エラー詳細
```
WebSocketエラー: Event {isTrusted: true, type: 'error', target: WebSocket, ...}
readyState: 3 (CLOSED)
```

## 原因分析
1. WebSocketサーバーが起動していない
2. ポート3001でリッスンしていない
3. ファイアウォールやネットワークの問題

## 修正内容

### 1. 詳細なエラーハンドリング
```typescript
wsRef.current.onerror = (error) => {
  console.error("WebSocketエラー:", error);
  console.error("WebSocket状態:", wsRef.current?.readyState);
  console.log("WebSocketの状態コード:");
  console.log("- 0: CONNECTING");
  console.log("- 1: OPEN");
  console.log("- 2: CLOSING");
  console.log("- 3: CLOSED");
};
```

### 2. 自動再接続機能の追加
```typescript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

const connectWebSocket = () => {
  // ... 接続処理 ...

  wsRef.current.onclose = (event) => {
    console.log("WebSocket接続が切断されました:", event.code, event.reason);

    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`${reconnectAttempts}回目の再接続を試行します...`);
      setTimeout(connectWebSocket, 3000);
    }
  };
};
```

### 3. 接続試行ログの改善
```typescript
console.log("WebSocket接続を試行中...");
wsRef.current = new WebSocket("ws://localhost:3001");

wsRef.current.onopen = () => {
  console.log("WebSocket接続が確立されました");
  setIsConnected(true);
  reconnectAttempts = 0;
};
```

### 4. 切断時の詳細ログ
```typescript
wsRef.current.onclose = (event) => {
  console.log("WebSocket接続が切断されました:", event.code, event.reason);
  // ...
};
```

## 改善点

### 1. ログの強化
- 接続試行の開始を明示
- エラー発生時の状態コード説明
- 切断理由の詳細表示
- 再接続試行のログ

### 2. 自動再接続
- 最大5回まで再接続を試行
- 3秒間隔で再接続
- 接続成功時にカウンターをリセット

### 3. 状態管理
- 接続状態のリアルタイム表示
- WebSocketの状態コードを可視化

## 次のステップ

### 手動での確認が必要
1. **WebSocketサーバーの起動確認**
   ```bash
   # シグナリングサーバーディレクトリで
   node server.js
   ```

2. **ポートの確認**
   ```bash
   # ポート3001が使用中か確認
   lsof -i :3001
   ```

3. **サーバーログの確認**
   - `websocket server start. port=3001` の表示確認
   - `-- websocket connected --` の表示確認

4. **ブラウザコンソールの確認**
   - `WebSocket接続を試行中...` の表示確認
   - `WebSocket接続が確立されました` の確認

## トラブルシューティング

### 接続が失敗する場合
1. **サーバー起動**: `node server.js` を実行
2. **ポート確認**: 別のポート番号を使用
3. **ファイアウォール**: ポート3001を開放
4. **ホスト名**: `localhost` → `127.0.0.1` に変更

### 再接続が頻発する場合
1. **サーバーの安定性**: サーバーがクラッシュしていないか確認
2. **ネットワーク**: ネットワーク接続の安定性を確認
3. **負荷**: サーバーの負荷を確認

## 結果
エラーハンドリングが大幅に改善され、問題の特定と対処が容易になりました。自動再接続機能により、一時的な接続切断にも対応可能です。