import fs from 'fs';
const dirs = ['src/components/ui', 'src/contexts', 'src/pages', 'src/components'];
dirs.forEach(d => fs.mkdirSync(d, {recursive: true}));

const stubs = {
  'src/components/ui/toaster.tsx': 'export const Toaster = () => null;',
  'src/components/ui/sonner.tsx': 'export const Toaster = () => null;',
  'src/components/ui/tooltip.tsx': 'export const TooltipProvider = ({children}: any) => <>{children}</>;',
  'src/contexts/AuthContext.tsx': 'export const AuthProvider = ({children}: any) => <>{children}</>;',
  'src/components/ProtectedRoute.tsx': 'import { Navigate } from "react-router-dom"; export const ProtectedRoute = ({children}: any) => { const token = localStorage.getItem("token"); return token ? children : <Navigate to="/login" replace />; };',
  'src/pages/Index.tsx': 'import { Navigate } from "react-router-dom"; export default function Index() { return <Navigate to="/login" replace />; }',
  'src/pages/WarehouseAccess.tsx': 'import Login from "./Login"; export default function WarehouseAccess() { return <Login />; }',
  'src/pages/ForgotPassword.tsx': 'export default function ForgotPassword() { return <div>Forgot Password</div>; }',
  'src/pages/Dashboard.tsx': 'import SelectOrder from "./SelectOrder"; export default function Dashboard() { return <SelectOrder />; }',
  'src/pages/CreateOrder.tsx': 'export default function CreateOrder() { return <div>Create Order</div>; }',
  'src/pages/EnrollNfc.tsx': 'import ScanNFC from "./ScanNFC"; export default function EnrollNfc() { return <ScanNFC />; }',
  'src/pages/Settings.tsx': 'export default function Settings() { return <div>Settings</div>; }',
  'src/pages/Shipments.tsx': 'export default function Shipments() { return <div>Shipments</div>; }',
  'src/pages/Help.tsx': 'export default function Help() { return <div>Help</div>; }',
  'src/pages/NotFound.tsx': 'export default function NotFound() { return <div>Not Found</div>; }'
};

for (const [file, content] of Object.entries(stubs)) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content);
  }
}
