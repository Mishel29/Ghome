import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context";
import AppRoutes from "./routes/AppRoutes";
import LoginModal from "./views/Login";
import { useApp } from "./context";
function AuthModal() { const { showLogin } = useApp(); return showLogin ? <LoginModal /> : null; }

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <AuthModal />
      </AppProvider>
    </BrowserRouter>
  );
}