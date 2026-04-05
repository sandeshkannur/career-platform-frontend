import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { LanguageProvider } from "./locales/LanguageProvider.jsx";
import { AdminLanguageProvider } from "./locales/AdminLanguageProvider";
import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <AdminLanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AdminLanguageProvider>
    </LanguageProvider>
  </React.StrictMode>
);
