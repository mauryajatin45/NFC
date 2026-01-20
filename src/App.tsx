import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SelectOrder from "./pages/SelectOrder";
import ScanNFC from "./pages/ScanNFC";
import CapturePhotos from "./pages/CapturePhotos";
import WriteNFC from "./pages/WriteNFC";
import Success from "./pages/Success";
import TestConnection from "./pages/TestConnection";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/order/select" element={<SelectOrder />} />
            <Route path="/scan" element={<ScanNFC />} />
            <Route path="/photos" element={<CapturePhotos />} />
            <Route path="/write" element={<WriteNFC />} />
            <Route path="/success" element={<Success />} />
            <Route path="/test" element={<TestConnection />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
