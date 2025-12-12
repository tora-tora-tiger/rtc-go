# Socket.io接続タイミング問題のデバッグ実装

## 実行日時
2025年12月12日 15:57

## 問題
Socket.io接続が確立されているように見えるが、emit("offer")直前でsocket.connectedがfalseになる問題

## 修正内容

### 1. Socket.io初期設定の変更
```typescript
const socket = io("http://localhost:3001", {
  autoConnect: true, // 自動接続を有効化（falseから変更）
  transports: ['websocket', 'polling'], // トランスポートを明示
});
```

### 2. 接続状態の継続的監視
```typescript
const connectionMonitor = setInterval(() => {
  console.log(`📍[${new Date().toISOString()}] 接続状態監視: connected=${socket.connected}, id=${socket.id}`);
}, 2000);
```

### 3. クリック時の接続待機ロジック
```typescript
if (!socket.connected) {
  console.log("⏳ Socket接続を待機します...");
  let attempts = 0;
  const maxAttempts = 10;

  while (!socket.connected && attempts < maxAttempts) {
    console.log(`📍 接続待機 ${attempts + 1}/${maxAttempts}: connected=${socket.connected}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  if (!socket.connected) {
    console.error("❌ Socket接続タイムアウト");
    alert("サーバーに接続できません。しばらくしてから再度お試しください。");
    return;
  }
}
```

### 4. Socket.io Engineレベルのイベント監視
```typescript
socket.io.on("open", () => {
  console.log("🔓 Socket.io Engineが開かれました");
});

socket.io.on("close", (reason) => {
  console.log("🔒 Socket.io Engineが閉じられました");
  console.log("📍 閉じられた理由:", reason);
});

socket.io.on("reconnect_attempt", (attemptNumber) => {
  console.log(`🔄 Socket.io再接続試行 ${attemptNumber}`);
});
```

### 5. 詳細な接続状態ログ
- Socket IDの追跡
- 接続状態のリアルタイム監視
- トランスポート方式の確認
- Engineレベルの状態監視

## 追加されたログの種類

### 接続プロセス関連
- `🔌 Socket.io接続とイベントの設定を開始します`
- `📍 Socket ID（初期）`
- `📍 接続状態（初期）`
- `📍 Socketオブジェクト`

### 接続状態監視
- `📍[タイムスタンプ] 接続状態監視: connected=true/false, id=xxxx`

### Engineレベルイベント
- `🔓 Socket.io Engineが開かれました`
- `🔒 Socket.io Engineが閉じられました`
- `🔄 Socket.io再接続試行`
- `🔄 Socket.io再接続成功`

### ユーザーインタラクション
- `🟢 ビデオ通話開始ボタンがクリックされました`
- `📍 Socket.ioEngine`
- `⏳ Socket接続を待機します...`
- `📍 接続待機 X/Y: connected=true/false`

### エラーハンドリング
- `❌ Socket接続タイムアウト`
- `❌ Socket.io Engineエラー`
- `❌ Socket.io再接続失敗`

## 問題解決のアプローチ

### 1. autoConnectの変更
- **理由**: 手動接続がタイミング問題を引き起こしている可能性
- **対策**: 自動接続を有効化し、接続タイミングをSocket.ioに任せる

### 2. トランスポートの明示
- **理由**: ブラウザ環境によって最適なトランスポートが異なる
- **対策**: WebSocketとPollingの両方を許可

### 3. 接続待機ロジック
- **理由**: ボタンクリック時に接続が完了していない可能性
- **対策**: 最大5秒間接続を待機し、タイムアウトを処理

### 4. 詳細な状態監視
- **理由**: 接続状態の変化をリアルタイムで把握する必要
- **対策**: 2秒間隔での状態監視とEngineレベルのイベント監視

## 期待される動作

### 正常時
1. `🔌 Socket.io接続とイベントの設定を開始します`
2. `🔓 Socket.io Engineが開かれました`
3. `✅ Socket.io接続が確立されました`
4. `📍[タイムスタンプ] 接続状態監視: connected=true`
5. `🟢 ビデオ通話開始ボタンがクリックされました` → `✅ Socket接続が確立されました`

### 異常時
1. 接続監視でconnectedがfalseのまま
2. `⏳ Socket接続を待機します...`
3. `📍 接続待機 1/10: connected=false`
4. 最大試行回数到達で`❌ Socket接続タイムアウト`

## デバッグ手順

1. **ブラウザコンソールを開く**
2. **ページをリロード**
3. **ログの観察**:
   - 初期接続プロセス
   - 2秒間隔の接続状態監視
   - ボタンクリック時の接続待機
4. **問題の特定**:
   - 接続が確立されない場合のタイミング
   - Engineレベルでのエラー
   - 再接続の試行状況

## 考えられる原因

### 1. サーバー側の問題
- Socket.ioサーバーが起動していない
- CORS設定の問題
- ポートの競合

### 2. ネットワークの問題
- ファイアウォール
- プロキシ設定
- ブラウザのセキュリティポリシー

### 3. タイミングの問題
- コンポーネントマウントと接続の競合
- 非同期処理のタイミング

### 4. トランスポートの問題
- WebSocketがブロックされている
- Pollingにフォールバックできない

## 結果
これらの詳細なログにより、Socket.io接続の問題を正確に特定できるようになりました。接続タイミング、Engineレベルの状態、再接続プロセスなど、あらゆる側面を監視できます。