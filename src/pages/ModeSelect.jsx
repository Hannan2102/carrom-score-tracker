import React from "react";
import { useNavigate } from "react-router-dom";

export default function ModeSelect({ matchConfig, setMatchConfig }) {
  const navigate = useNavigate();

  function chooseMode(mode) {
    setMatchConfig((prev) => ({ ...prev, mode }));
    navigate("/setup");
  }

  return (
    
    <div className="page">
      <h1 className="title">Carrom Score Tracker</h1>
      <p className="subtitle">Choose your match mode:</p>

      <div className="hero">
  <div className="carromSpinner">
    <div className="board">
      <span className="pocket tl" />
      <span className="pocket tr" />
      <span className="pocket bl" />
      <span className="pocket br" />
      <span className="queen" />
    </div>
  </div>

  <h1 className="heroTitle">Carrom Score Tracker</h1>
  <p className="heroTagline">
    Track boards. Track Score. No arguments.
  </p>
</div>


      <div className="card">
        <button className="btn" onClick={() => chooseMode("EIGHT_BOARDS")}>
          8 Boards (ends at board 8 OR earlier at 25)
        </button>

        <button className="btn secondary" onClick={() => chooseMode("FIRST_TO_25")}>
          First to 25 (no board limit)
        </button>
      </div>

      <p className="hint">
        Selected: <b>{matchConfig.mode ?? "None"}</b>
      </p>
    </div>
  );
}
