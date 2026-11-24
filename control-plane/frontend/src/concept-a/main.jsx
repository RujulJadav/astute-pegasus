import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme.css";
import App from "./App.jsx";
import { LiveProvider } from "../api/live.jsx";
import { MotionGlobalConfig } from "motion/react";

// ?static renders every animation at its end state (for screenshot comparisons only).
// Theme: ?theme=day|night, else the page's own default (the night build ships data-theme="night"), else day.
// Light is the default since the 5 Nov review; the night theme is kept behind the sun/moon button.
const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.theme = params.get("theme") || document.documentElement.dataset.theme || "day";

if (params.has("static")) {
  MotionGlobalConfig.skipAnimations = true;
  document.documentElement.classList.add("static");
}

document.body.classList.add("bg-ink", "text-body");

createRoot(document.getElementById("root")).render(<StrictMode><LiveProvider><App /></LiveProvider></StrictMode>);
