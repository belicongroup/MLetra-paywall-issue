import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { ProStatusProvider } from "../../src/contexts/ProStatusContext";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ProStatusProvider>
        <App />
      </ProStatusProvider>
    </AuthProvider>
  </React.StrictMode>
);
