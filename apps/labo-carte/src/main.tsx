import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "maplibre-gl/dist/maplibre-gl.css";
import "./labo.css";

createRoot(document.getElementById("root")!).render(<App />);
