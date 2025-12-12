import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Header } from "./components/Header";
import { HomePage } from "./components/HomePage";
import { ScreenShare } from "./components/ScreenShare";
import DebugChat from "./components/DebugChat";
import "./App.css";


const AppContent: React.FC = () => {
  const location = useLocation();

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
            <ScreenShare />
          }
        />
        <Route path="/debug" element={<DebugChat />} />
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
