import type React from "react";
import type { MediaControlsState } from "../types";

interface ControlPanelProps {
  mediaControls: MediaControlsState;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleDeafen: () => void;
  connectionStatus: "connected" | "connecting" | "disconnected" | "poor";
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mediaControls,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  connectionStatus,
}) => {
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "green";
      case "connecting":
        return "yellow";
      case "disconnected":
        return "red";
      case "poor":
        return "orange";
      default:
        return "gray";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "接続済み";
      case "connecting":
        return "接続中...";
      case "disconnected":
        return "切断";
      case "poor":
        return "接続不良";
      default:
        return "不明";
    }
  };

  return (
    <div className="control-panel">
      <div className="connection-status">
        <div
          className={`status-dot ${getConnectionStatusColor()}`}
          title={getConnectionStatusText()}
        ></div>
        <span className="status-text">{getConnectionStatusText()}</span>
      </div>

      <div className="controls">
        <button
          type="button"
          className={`control-button ${
            mediaControls.isDeafened ? "deafened" : ""
          }`}
          onClick={onToggleDeafen}
          title={
            mediaControls.isDeafened
              ? "スピーカーミュート解除"
              : "スピーカーミュート"
          }
        >
          {mediaControls.isDeafened ? "🔇" : "🔊"}
        </button>

        <button
          type="button"
          className={`control-button ${mediaControls.isMuted ? "muted" : ""}`}
          onClick={onToggleMute}
          title={mediaControls.isMuted ? "ミュート解除" : "ミュート"}
        >
          {mediaControls.isMuted ? "🎙️" : "🎤"}
        </button>

        <button
          type="button"
          className={`control-button ${
            mediaControls.isVideoOn ? "" : "video-off"
          }`}
          onClick={onToggleVideo}
          title={mediaControls.isVideoOn ? "ビデオオフ" : "ビデオオン"}
        >
          {mediaControls.isVideoOn ? "📹" : "📷"}
        </button>

        <button
          type="button"
          className={`control-button ${
            mediaControls.isScreenSharing ? "sharing" : ""
          }`}
          onClick={onToggleScreenShare}
          title={
            mediaControls.isScreenSharing ? "画面共有停止" : "画面共有開始"
          }
        >
          {mediaControls.isScreenSharing ? "🖥️" : "🖥️"}
        </button>
      </div>

      <div className="additional-controls">
        <button type="button" className="control-button" title="設定">
          ⚙️
        </button>
        <button type="button" className="control-button" title="通話終了">
          📞
        </button>
      </div>
    </div>
  );
};
