import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

interface HeaderProps {
  currentPage: "home" | "screen-share";
}

export const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="header-title">RTCアプリケーション</h1>
        <nav className="header-nav">
          <Link
            to="/"
            className={`nav-link ${currentPage === "home" ? "active" : ""}`}
          >
            🏠 ホーム
          </Link>
          <Link
            to="/screen-share"
            className={`nav-link ${
              currentPage === "screen-share" ? "active" : ""
            }`}
          >
            📹 画面共有
          </Link>
        </nav>
      </div>
    </header>
  );
};
