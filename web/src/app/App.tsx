import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { VisualizationPage } from "@/app/VisualizationPage";
import { visualizationDefinitions } from "@/registry/visualizationRegistry";

/**
 * Root router wiring for the Zest web SPA.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {visualizationDefinitions.map((definition) => (
            <Route
              key={definition.id}
              path={definition.routePath}
              element={<VisualizationPage definition={definition} />}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
