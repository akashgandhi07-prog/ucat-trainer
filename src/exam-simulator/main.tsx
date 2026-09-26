import { createRoot } from "react-dom/client";
import App from "./App";
import { AccessGate } from "./AccessGate";
createRoot(document.getElementById("root")!).render(
  <AccessGate mode="signed-in" appName="TheUKCATPeople Mock Exam">
    <App />
  </AccessGate>,
);
