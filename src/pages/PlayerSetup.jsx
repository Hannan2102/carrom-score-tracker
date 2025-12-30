import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PlayerSetup({ matchConfig, setMatchConfig }) {
  const navigate = useNavigate();

  const modeLabel = useMemo(() => {
    if (matchConfig.mode === "EIGHT_BOARDS") return "8 Boards (ends at 8 OR at 25)";
    if (matchConfig.mode === "FIRST_TO_25") return "First to 25 (no board limit)";
    return "None";
  }, [matchConfig.mode]);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [p4, setP4] = useState("");

  function startGame() {
    if (!matchConfig.mode) {
      navigate("/");
      return;
    }

    setMatchConfig((prev) => ({
        ...prev,
        matchId: crypto.randomUUID(), // ✅ unique id for each new match
        teams: {
          teamA: { name: "Team A", players: [p1.trim(), p2.trim()] },
          teamB: { name: "Team B", players: [p3.trim(), p4.trim()] },
        },
      }));
      
    
    try {
        localStorage.removeItem("carrom_score_tracker_v1");
      } catch {}
      
    navigate("/game");
  }

  return (
    <div className="page">
      <h1 className="title">Players & Teams</h1>
      <p className="subtitle">
        Mode: <b>{modeLabel}</b>
      </p>

      <div className="card">
        <div className="grid2">
          <div>
            <h2 className="sectionTitle">Team A</h2>
            <input className="input" placeholder="Player 1" value={p1} onChange={(e) => setP1(e.target.value)} />
            <input className="input" placeholder="Player 2" value={p2} onChange={(e) => setP2(e.target.value)} />
          </div>

          <div>
            <h2 className="sectionTitle">Team B</h2>
            <input className="input" placeholder="Player 3" value={p3} onChange={(e) => setP3(e.target.value)} />
            <input className="input" placeholder="Player 4" value={p4} onChange={(e) => setP4(e.target.value)} />
          </div>
        </div>

        <button className="btn" onClick={startGame}>
          Start Game →
        </button>

        <button className="linkBtn" onClick={() => navigate("/")}>
          ← Back to mode selection
        </button>
      </div>
    </div>
  );
}
