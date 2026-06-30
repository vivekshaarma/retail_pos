import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// React 18: createRoot replaces the old ReactDOM.render()
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode runs effects twice in development to catch bugs early.
  // It has no effect in production builds.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
