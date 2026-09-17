import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context";
import AppRoutes from "./routes/AppRoutes";
import GraphQLTest from "./api/GraphQLTest";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <GraphQLTest />
      </AppProvider>
    </BrowserRouter>
  );
}