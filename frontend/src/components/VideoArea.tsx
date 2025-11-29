import React from "react";
import { Participant } from "../types";

interface VideoAreaProps {
  participants: Participant[];
  currentUserScreenSharing: boolean;
}

export const VideoArea: React.FC<VideoAreaProps> = ({
  participants,
  currentUserScreenSharing,
}) => {
  const screenSharer = participants.find(p => p.isScreenSharing);
  const otherParticipants = participants.filter(p => !p.isScreenSharing);

  return (
    <div className="video-area">
      {screenSharer ? (
        <div className="screen-share-main">
          <div className="screen-share-header">
            <span className="screen-share-label">
              {screenSharer.name}が画面を共有しています
            </span>
          </div>
          <div className="screen-share-content">
            <div className="mock-screen">
              <div className="mock-desktop">
                <div className="mock-desktop-header">
                  <div className="mock-desktop-controls">
                    <span className="mock-dot red"></span>
                    <span className="mock-dot yellow"></span>
                    <span className="mock-dot green"></span>
                  </div>
                </div>
                <div className="mock-desktop-content">
                  <div className="shared-app">
                    <h3>画面共有中</h3>
                    <div className="shared-text">
                      {screenSharer.name}が画面を共有しています。
                      <br />
                      WebRTC実装で実際の画面ストリームがここに表示されます。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-screen-share">
          <div className="no-screen-share-icon">🖥️</div>
          <h3>画面共有が開始されていません</h3>
          <p>画面共有を開始して、参加者と画面を共有しましょう</p>
        </div>
      )}

      <div className="participant-videos">
        {otherParticipants.map(participant => (
          <div key={participant.id} className="participant-video">
            <div className="video-placeholder">
              {participant.isVideoOn ? (
                <div className="mock-video">
                  <div className="avatar-large">
                    {participant.avatar || participant.name.charAt(0)}
                  </div>
                </div>
              ) : (
                <div className="avatar-large">
                  {participant.avatar || participant.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="participant-info">
              <span className="participant-name">{participant.name}</span>
              <div className="participant-status">
                {!participant.isMuted && (
                  <span className="status-icon">🎤</span>
                )}
                {participant.isVideoOn && (
                  <span className="status-icon">📹</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
