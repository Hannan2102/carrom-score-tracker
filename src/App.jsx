import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ModeSelect from "./pages/ModeSelect";
import PlayerSetup from "./pages/PlayerSetup";
import Game from "./pages/Game";

export default function App() {
  const [matchConfig, setMatchConfig] = useState({
    mode: null,
    teams: {
      teamA: { name: "Team A", players: ["", ""] },
      teamB: { name: "Team B", players: ["", ""] },
    },
  });

  return (
    <Routes>
      <Route
        path="/"
        element={<ModeSelect matchConfig={matchConfig} setMatchConfig={setMatchConfig} />}
      />
      <Route
        path="/setup"
        element={<PlayerSetup matchConfig={matchConfig} setMatchConfig={setMatchConfig} />}
      />
      <Route path="/game" element={<Game matchConfig={matchConfig} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
