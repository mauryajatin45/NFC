import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const selectMode = (mode: "warehouse" | "delivery") => {
    localStorage.setItem("mode", mode);
    navigate("/order/select");
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">Select Mode</h1>
        <p className="header-subtitle">Choose your operation mode</p>
      </div>
      
      <div className="form-group">
        <button 
          onClick={() => selectMode("warehouse")} 
          className="btn btn-primary"
        >
          <span>🏭</span> Warehouse (Enroll)
        </button>
        <button 
          onClick={() => selectMode("delivery")} 
          className="btn btn-secondary"
        >
          <span>🚚</span> Delivery (Verify)
        </button>
      </div>
    </div>
  );
}
