import type React from "react";
import type { MediaControlsState, Participant } from "../types";
import { ControlPanel } from "./ControlPanel";
import { ParticipantList } from "./ParticipantList";
import { VideoArea } from "./VideoArea";
import "./ScreenShare.css";

interface ScreenShareProps {
  mediaControls: MediaControlsState;
  connectionStatus: "connected" | "connecting" | "disconnected" | "poor";
  participants: Participant[];
  currentUser: Participant;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleDeafen: () => void;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
}

export const ScreenShare: React.FC<ScreenShareProps> = ({
  mediaControls,
  connectionStatus,
  participants,
  currentUser,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  setParticipants,
}) => {
  const handleToggleScreenShare = () => {
    onToggleScreenShare();

    // 画面共有が停止されたら、現在共有している参加者をリセット
    if (mediaControls.isScreenSharing) {
      setParticipants(prev =>
        prev.map(p => ({ ...p, isScreenSharing: false })),
      );
    }
  };

  // 画面共有している参加者
  const screenSharingParticipant = participants.find(p => p.isScreenSharing);
  const allParticipants = screenSharingParticipant
    ? participants
    : mediaControls.isScreenSharing
      ? [{ ...currentUser, isScreenSharing: true }, ...participants]
      : participants;

  return (
    <div className="screen-share">
      <div className="main-content">
        <div className="video-section">
          <VideoArea
            participants={allParticipants}
            currentUserScreenSharing={mediaControls.isScreenSharing}
          />
        </div>

        <div className="sidebar">
          <ParticipantList
            participants={participants}
            currentUser={currentUser}
          />
        </div>
      </div>

      <div className="bottom-controls">
        <ControlPanel
          mediaControls={mediaControls}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleDeafen={onToggleDeafen}
          connectionStatus={connectionStatus}
        />
      </div>
    </div>
  );
};
