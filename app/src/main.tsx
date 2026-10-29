import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { KeelApp } from "./components/keel/app"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KeelApp />
  </StrictMode>,
)
