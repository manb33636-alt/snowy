import React from "react";
import { createRoot } from "react-dom/client";
import SnowyTracks from "./SnowyTracks.jsx";

const rootEl = document.getElementById("root");
document.body.style.margin = "0";
createRoot(rootEl).render(
  <React.StrictMode>
    <SnowyTracks />
  </React.StrictMode>
);
