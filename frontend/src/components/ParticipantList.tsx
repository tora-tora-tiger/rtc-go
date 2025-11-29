import React from "react";
import { Participant } from "../types";

interface ParticipantListProps {
  participants: Participant[];
  currentUser: Participant;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUser,
}) => {
  return (
    <div className="participant-list">
      <div className="participant-list-header">
        <h3>参加者 ({participants.length + 1})</h3>
      </div>

      <div className="participant-item current-user">
        <div className="participant-avatar">
          {currentUser.avatar || currentUser.name.charAt(0)}
        </div>
        <div className="participant-details">
          <div className="participant-name">
            {currentUser.name}
            <span className="current-user-badge">あなた</span>
          </div>
          <div className="participant-status">
            {!currentUser.isMuted && <span className="status-icon">🎤</span>}
            {currentUser.isVideoOn && <span className="status-icon">📹</span>}
            {currentUser.isScreenSharing && (
              <span className="status-icon">🖥️</span>
            )}
          </div>
        </div>
      </div>

      {participants.map(participant => (
        <div key={participant.id} className="participant-item">
          <div className="participant-avatar">
            {participant.avatar || participant.name.charAt(0)}
          </div>
          <div className="participant-details">
            <div className="participant-name">{participant.name}</div>
            <div className="participant-status">
              {participant.isMuted && (
                <span className="status-icon muted">🔇</span>
              )}
              {!participant.isMuted && <span className="status-icon">🎤</span>}
              {participant.isVideoOn && <span className="status-icon">📹</span>}
              {participant.isScreenSharing && (
                <span className="status-icon">🖥️</span>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="participant-actions">
        <button className="action-button" title="参加者を招待">
          ➕ 招待
        </button>
      </div>
    </div>
  );
};
