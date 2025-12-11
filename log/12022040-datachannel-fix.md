# データチャネル初期化修正ログ - 12022040

## 問題確認
- エラー内容: メッセージ送信時に「Data channel is not initialized」と表示される
- 発生条件: 両クライアントがルーム参加後、メッセージ送信を試みた際
- 原因: データチャネルがWebRTC接続確立前に作成・初期化されていた

## 修正内容

### 1. JoinRoom関数の修正
#### 問題点
- WebRTC接続確立前にデータチャネルを初期化しようとしていた
```go
// 修正前（問題）
err := a.initializeDataChannel()  // JoinRoomで早期に初期化
```

#### 修正内容
- JoinRoom関数からデータチャネル初期化を削除
- データチャネル作成を接続確立後に移動

### 2. データチャネル初期化タイミングの改善
#### 追加したイベントハンドラー
```go
// 接続状態変化時にデータチャネルを作成
a.pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
    if state == webrtc.PeerConnectionStateConnected {
        a.logger.Debug("WebRTC connection established, creating data channel")
        err := a.initializeDataChannel()
    }
})

// シグナリング完了時にもデータチャネルを作成
a.pc.OnSignalingStateChange(func(state webrtc.SignalingState) {
    if state == webrtc.SignalingStateStable && a.dc == nil {
        a.logger.Debug("Signaling complete, creating data channel")
        err := a.initializeDataChannel()
    }
})
```

### 3. initializeDataChannel関数の強化
#### 追加したチェック機能
```go
// PeerConnectionの存在確認
if a.pc == nil {
    return fmt.Errorf("PeerConnection is not initialized")
}

// 接続状態のログ出力
connectionState := a.pc.ConnectionState()
a.logger.Debug(fmt.Sprintf("Creating data channel with connection state: %s", connectionState.String()))
```

#### 改善されたイベントハンドラー
```go
dc.OnOpen(func() {
    a.logger.Debug("Data channel opened and ready for messaging")
    select {
    case <-a.dataChannelReady:
        a.dataChannelReady = make(chan struct{})
    default:
        close(a.dataChannelReady)
    }
})

dc.OnClose(func() {
    a.logger.Debug("Data channel closed")
    a.dc = nil
    a.dataChannelReady = make(chan struct{})  // 再初期化のため準備
})
```

### 4. SendChatMessage関数の堅牢化
#### データチャネルの動的初期化
```go
if a.dc == nil {
    a.logger.Debug("Data channel is nil, attempting to initialize")
    err := a.initializeDataChannel()
    if err != nil {
        return fmt.Sprintf("Data channel not available and initialization failed: %s", err.Error())
    }
}
```

#### 詳細な状態チェック
```go
// WebRTC接続状態の確認
connectionState := a.pc.ConnectionState()
if connectionState != webrtc.PeerConnectionStateConnected {
    return "WebRTC connection is not established. Please wait for connection or check signaling."
}
```

#### 改善されたエラーメッセージ
- "Data channel is not initialized" → 具体的な原因と解決策を提示
- タイムアウトメッセージの改善
- 接続状態に関する情報を追加

## 技術的背景

### WebRTCデータチャネルのライフサイクル
1. **SignalingState**: Stable → HaveLocalOffer → HaveRemoteOffer → Stable
2. **ConnectionState**: New → Connecting → Connected → Disconnected/Failed/Closed
3. **DataChannelState**: Connecting → Open → Closing → Closed

### 修正前の問題
- データチャネルをSignalingState = Stableで作成していたが、接続が確立されていなかった
- データチャネルが作成されても、相手側とのネゴシエーションが完了していなかった

### 修正後の改善
- ConnectionState = Connected または SignalingState = Stable で初期化
- SendChatMessageでの動的初期化機能
- 詳細な状態確認とエラー報告

## 期待される効果
1. **接続確立後にデータチャネルが作成される**: WebRTCネゴシエーション完了後に自動初期化
2. **堅牢なエラーハンドリング**: 詳細な状態情報と解決策の提供
3. **動的初期化**: メッセージ送信時にデータチャネルがなければ自動で作成
4. **状態の可視化**: ログによる接続状態の追跡

## 検証手順
1. **シグナリングサーバー起動**: `localhost:3001`
2. **アプリケーション起動**: `wails dev`
3. **2つのブラウザウィンドウでルーム参加**: 1人目がoffer、2人目がanswer
4. **接続確立後、メッセージ送信**: データチャネルが自動で作成されることを確認
5. **ログ確認**: データチャネルの初期化と状態変化を確認

## 関連ファイル
- `/Users/alucrex/git/bmvdsfy/rtc/backend/app.go`: 主要な修正対象
- WebRTC状態: `webrtc.PeerConnectionStateConnected`, `webrtc.SignalingStateStable`
- データチャネル状態: `webrtc.DataChannelStateOpen`