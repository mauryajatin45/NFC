import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import SelectOrder from "./pages/SelectOrder";
import ScanNFC from "./pages/ScanNFC";
import Confirm from "./pages/Confirm";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Home />} />
            <Route path="/order/select" element={<SelectOrder />} />
            <Route path="/scan" element={<ScanNFC />} />
            <Route path="/confirm" element={<Confirm />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
