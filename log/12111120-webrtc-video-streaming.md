# WebRTC映像伝送実装ガイド

## 実施日時
2025年12月11日 11:20

## 目的
WailsアプリケーションでのWebRTC映像伝送実装方法の検討

## WebRTC映像伝送の基本概念

### テキストチャットとの違い
- **テキストチャット**: DataChannel → イベント → UI更新
- **映像伝送**: MediaStream Track → PeerConnection → 直接レンダリング

### 主要なコンポーネント
1. **MediaStream**: 映像と音声のストリーム
2. **MediaStreamTrack**: 映像または音声の個別トラック
3. **RTCPeerConnection**: WebRTC接続管理
4. **RTP**: Real-time Transport Protocol for media packets

## 実装アプローチ

### アプローチA: React側でWebRTCを完全管理（推奨）

```tsx
// React側でRTCPeerConnectionを直接制御
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

peerConnection.ontrack = (event) => {
  remoteVideoRef.current.srcObject = event.streams[0];
};

const stream = await navigator.mediaDevices.getUserMedia({
  video: true, audio: true
});

stream.getTracks().forEach(track => {
  peerConnection.addTrack(track, stream);
});
```

**メリット**:
- ブラウザのMediaStream APIをフル活用
- 実装が比較的簡単
- デバッグが容易

**デメリット**:
- Go側のPeerConnectionと二重管理になる可能性

### アプローチB: Go側でシグナリングのみ担当

```go
// Go側はシグナリングサーバーとして機能
func (a *App) HandleNegotiation() {
    // オファー/アンサーの交換
    // ICE candidateの処理
    // React側からWebRTC操作リクエストを受信
}
```

**メリット**:
- アーキテクチャの一貫性
- Go側でのロジック集中

**デメリット**:
- 実装が複雑
- ブラウザAPIとの連携が難しい

### アプローチC: ハイブリッド方式

```go
// Go側で映像キャプチャと符号化
func (a *App) StartVideoCapture() error {
    videoTrackGenerator, _ := webrtc.NewTrackLocalStaticSample(
        webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
        "video", "pion-camera")

    // PeerConnectionに追加
    a.pc.AddTrack(videoTrackGenerator)

    // カメラからフレームをキャプチャ
    // VP8エンコードしてRTPパケット生成
}
```

**メリット**:
- Go側での完全な制御
- デスクトップキャプチャなども可能

**デメリット**:
- pion/mediadevicesの習得が必要
- 実装が最も複雑

## 推奨実装手順

### ステップ1: React側で基本的な映表示機能

```tsx
const VideoChat: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const startLocalVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true, audio: true
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play();
    }
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay playsInline muted />
      <video ref={remoteVideoRef} autoPlay playsInline />
      <button onClick={startLocalVideo}>カメラ開始</button>
    </div>
  );
};
```

### ステップ2: WebRTCシグナリングの実装

```tsx
// 既存のチャット機能と連携
const handleNegotiation = async () => {
  await JoinRoom(roomName);

  // PeerConnectionの設定
  pc.ontrack = (event) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
  };

  // オファー作成と送信
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  // Go側にオファー送信
};
```

### ステップ3: Go側でのシグナリング調整

```go
// 現在の実装をベースに映像用の調整
func (a *App) HandleVideoNegotiation(offer webrtc.SessionDescription) error {
    // 受信したオファーを処理
    // アンサーを作成して返送
    // ICE candidateの交換
    return nil
}
```

## 技術的な課題

### 1. PeerConnectionの所有権
- Go側とReact側どちらで管理するか
- 状態同期の方法

### 2. MediaStreamのライフサイクル
- いつ開始・停止するか
- リソースの解放タイミング

### 3. シグナリングの調整
- 映像と音声の個別制御
- 複数参加者の管理

## 次のステップ

1. ✅ 基本アーキテクチャの検討
2. 🔄 React側での簡単な映表示機能実装
3. 🔄 WebRTCシグナリングの統合
4. 🔄 複数参加者対応
5. 🔄 画面共有機能
6. 🔄 録画機能

## 結論

WebRTC映像伝送では、**イベントでデータを渡すのではなく、PeerConnection経由の直接ストリーミング**が基本です。

推奨は**アプローチA（React側でのWebRTC管理）**で、以下のように実装します：

1. React側でMediaStream APIを使用してカメラにアクセス
2. PeerConnectionをReact側で管理
3. Go側はシグナリングサーバーとして機能
4. オファー/アンサーの交換とICE candidateの処理を担当

これにより、ブラウザのWebRTC機能を最大限活用しつつ、既存のWailsアーキテクチャと統合できます。