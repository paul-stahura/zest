import { createRoot } from "react-dom/client";

import { App } from "@/app/App";

import "@/index.css";

const mount = document.getElementById("root");
if (mount === null) {
  throw new Error("Missing #root mount node");
}

createRoot(mount).render(<App />);
