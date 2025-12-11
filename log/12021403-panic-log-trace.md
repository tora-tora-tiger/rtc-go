# Goプログラムのpanic前にlog.traceを追加

## 実行内容
Goプログラムでpanicが記述されている箇所を検索し、その前に`log.trace`を出力するように修正しました。

## 作業手順

### 1. panic箇所の検索
- `grep`コマンドを使用してGoファイル内のpanic箇所を検索
- 検索結果: `backend/app.go`の148行目と160行目にpanicを発見

### 2. 修正内容
以下の2箇所のpanic前にlog.traceを追加：

#### 修正1: WebSocket初期化エラー (148行目)
**修正前:**
```go
err := a.initializeWebSocket()
if err != nil {
    panic(err)
}
```

**修正後:**
```go
err := a.initializeWebSocket()
if err != nil {
    a.logger.Trace("WebSocket initialization failed, panicking")
    panic(err)
}
```

#### 修正2: PeerConnection作成エラー (160行目)
**修正前:**
```go
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
```

**修正後:**
```go
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
```

## 変更ファイル
- `backend/app.go`: 148行目と161行目にlog.traceを追加

## 効果
- panicが発生する前にtraceログが出力されるため、デバッグ時にエラーの原因特定が容易になる
- 各panicの発生箇所が特定しやすくなる
- アプリケーションの初期化フェーズでの障害調査が改善される