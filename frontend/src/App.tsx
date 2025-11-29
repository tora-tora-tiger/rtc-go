import type { Participant, MediaControlsState } from "./types";
import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Header } from "./components/Header";
import { HomePage } from "./components/HomePage";
import { ScreenShare } from "./components/ScreenShare";
import "./App.css";

const AppContent: React.FC = () => {
  const location = useLocation();
  const [mediaControls, setMediaControls] = useState<MediaControlsState>({
    isMuted: false,
    isVideoOn: true,
    isScreenSharing: false,
    isDeafened: false,
  });

  
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "1",
      name: "田中太郎",
      avatar: "👨",
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false,
    },
    {
      id: "2",
      name: "佐藤花子",
      avatar: "👩",
      isMuted: true,
      isVideoOn: false,
      isScreenSharing: false,
    },
    {
      id: "3",
      name: "鈴木一郎",
      avatar: "👨‍💼",
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false,
    },
  ]);

  const currentUser: Participant = {
    id: "current-user",
    name: "あなた",
    isMuted: mediaControls.isMuted,
    isVideoOn: mediaControls.isVideoOn,
    isScreenSharing: mediaControls.isScreenSharing,
  };

  
  // イベントハンドラー
  const handleToggleMute = () => {
    setMediaControls(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleToggleVideo = () => {
    setMediaControls(prev => ({ ...prev, isVideoOn: !prev.isVideoOn }));
  };

  const handleToggleScreenShare = () => {
    setMediaControls(prev => ({
      ...prev,
      isScreenSharing: !prev.isScreenSharing,
    }));

    // 画面共有が停止されたら、共有中の参加者をリセット
    if (mediaControls.isScreenSharing) {
      setParticipants(prev =>
        prev.map(p => ({ ...p, isScreenSharing: false })),
      );
    }
  };

  const handleToggleDeafen = () => {
    setMediaControls(prev => ({ ...prev, isDeafened: !prev.isDeafened }));
  };

  // 現在のページを判定
  const getCurrentPage = (): "home" | "screen-share" => {
    if (location.pathname === "/screen-share") {
      return "screen-share";
    }
    return "home";
  };

  const currentPage = getCurrentPage();

  return (
    <div className="app-container">
      <Header currentPage={currentPage} />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/screen-share"
          element={
            <ScreenShare
              mediaControls={mediaControls}
              connectionStatus="connected"
              participants={participants}
              currentUser={currentUser}
              onToggleMute={handleToggleMute}
              onToggleVideo={handleToggleVideo}
              onToggleScreenShare={handleToggleScreenShare}
              onToggleDeafen={handleToggleDeafen}
              setParticipants={setParticipants}
            />
          }
        />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
