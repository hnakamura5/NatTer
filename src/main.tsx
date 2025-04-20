import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.tsx";
import "@/index.css";
import { Box } from "@mui/material";

ReactDOM.createRoot(document.getElementById("root")!).render(
  //<React.StrictMode>
  // TODO: strict mode causes unstable behavior of xterm. Detecting something to fix?
  <App />
  // </React.StrictMode>,
);
