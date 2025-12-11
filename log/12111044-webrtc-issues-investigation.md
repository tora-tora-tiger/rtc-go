# WebRTCチャットアプリ問題調査報告

## 実施日時
2025年12月11日 10:44

## 調査対象
Wails + Reactで開発されたWebRTCチャットアプリケーション

## ファイル構成
- `backend/app.go` - メインのWebRTCロジック
- `backend/websocket.go` - WebSocketハンドラー
- `signaling-server.js` - Node.jsシグナリングサーバー
- `frontend/src/components/DebugChat.tsx` - デバッグチャットUI

## 特定された主要な問題点

### 1. WebSocketプロトコルの不一致 **【重大】**

**問題箇所**:
- `backend/websocket.go:73-81` - Emitメソッドが構造化メッセージを送信
- `signaling-server.js:72-89` - 生のWebRTCオブジェクトを転送

**詳細**:
```go
// バックエンドの期待形式
message := EmitMessage{
    Type: event,  // "offer"
    Data: data,   // WebRTC SessionDescription
}
```

```javascript
// シグナリングサーバーの実際の処理
if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice') {
    client.send(JSON.stringify(data)); // 生オブジェクト転送
}
```

### 2. WebSocket接続先の混乱 **【重大】**

**問題箇所**: `backend/app.go:35`
- Goコードが直接 `ws://localhost:3001` に接続
- Node.jsシグナリングサーバーが必要だが連携不完全

### 3. メッセージ処理の不整合 **【重大】**

**問題箇所**:
- `backend/websocket.go:60-70` - `{type, data}` 構造を想定
- `signaling-server.js` - 生メッセージと構造化メッセージが混在

### 4. データチャネル初期化の競合 **【中程度】**

**問題箇所**: `backend/app.go:205-227`
- 接続確立時とシグナリング完了時の両方で初期化
- 重複初期化による競合発生の可能性

### 5. ICE Candidate送信フォーマット問題 **【中程度】**

**問題箇所**: `backend/app.go:270`
```go
err := a.ws.WriteJSON(candidate)  // 生candidateを送信
```
WebSocketHandlerは構造化メッセージを期待しているが、生のcandidateを送信

### 6. アーキテクチャの根本的な矛盾 **【設計レベル】**

**参照JSコードの想定**:
- Socket.ioを使用したブラウザ間直接通信
- クライアント同士がシグナリングサーバー経由で直接WebRTC

**現在の実装**:
- WailsデスクトップアプリとしてのWebRTC
- バックエンドを介した間接的シグナリング

## 考えられる解決策

### 解決策A: シグナリングサーバーを修正
```javascript
// signifying-server.js の修正
if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice') {
    clients.forEach((client, id) => {
        if (id !== clientId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: data.type,
                data: data.data || data
            }));
        }
    });
}
```

### 解決策B: バックエンドのWebSocketHandlerを修正
```go
// 生メッセージも処理できるように修正
func (h *WebSocketHandler) Listen() {
    // 構造化メッセージと生メッセージの両方を処理
}
```

### 解決策C: アーキテクチャの統一
- Wailsアプリをブラウザベースの実装に変更
- または、デスクトップアプリ向けの完全なWebRTC実装に変更

## 推奨対応順序

1. **緊急**: WebSocketメッセージフォーマットの統一（解決策AまたはB）
2. **重要**: データチャネル初期化ロジックの見直し
3. **検討**: アーキテクチャの根本的な見直し

## 検証方法

1. シグナリングサーバーを起動: `node signaling-server.js`
2. Wailsアプリを起動: `wails dev`
3. デバッグページにアクセスしてルーム参加
4. WebSocketメッセージのやり取りを確認
5. WebRTC接続の確立を確認

## まとめ

現在の実装ではWebSocketレベルでのプロトコル不一致が根本的な原因となっています。参照JSコードとはアーキテクチャが異なるため、単純な移植ではなく、WailsデスクトップアプリとしてのWebRTC実装として再設計する必要があります。