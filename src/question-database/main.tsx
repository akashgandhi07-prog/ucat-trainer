import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AccessGate } from "../exam-simulator/AccessGate";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccessGate mode="staff" appName="TheUKCATPeople Question Database">
      <App />
    </AccessGate>
  </StrictMode>,
);
