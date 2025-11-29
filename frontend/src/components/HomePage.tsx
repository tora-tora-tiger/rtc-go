import type React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

export const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="home-content">
        <div className="welcome-section">
          <h1>Wails + React RTCアプリ</h1>
          <p>リアルタイム通信アプリケーションのデモ</p>
        </div>

        <div className="demo-section">
          <div className="demo-card">
            <div className="demo-card-header">
              <h2>📹 画面共有</h2>
            </div>
            <div className="demo-card-content">
              <p>
                WebRTCを使用した画面共有機能です。
                DiscordライクなUIで、参加者の管理やメディア制御が可能です。
              </p>
              <Link to="/screen-share" className="demo-button primary">
                画面共有を開始する
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
