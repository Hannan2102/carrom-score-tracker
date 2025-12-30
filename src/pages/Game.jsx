import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function Confetti({ runKey }) {
  const pieces = Array.from({ length: 40 });

  return (
    <div key={runKey} className="confetti" aria-hidden="true">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.8 + Math.random() * 1.2;
        const rotate = Math.random() * 360;
        const size = 6 + Math.random() * 8;

        return (
          <span
            key={i}
            className="confettiPiece"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rotate}deg)`,
              width: `${size}px`,
              height: `${size * 1.6}px`,
            }}
          />
        );
      })}
    </div>
  );
}

const STORAGE_PREFIX = "carrom_score_tracker_";

function makeDots({ queenCounted, coins }) {
  return { queenCounted, coins: Math.max(0, coins) };
}

function clampInt(value, min, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function computeWinnerFromTotals(a, b) {
  if (a > b) return "A";
  if (b > a) return "B";
  return "DRAW";
}

export default function Game({ matchConfig }) {
  const navigate = useNavigate();

  if (!matchConfig?.mode) {
    return (
      <div className="page">
        <h1 className="title">No match selected</h1>
        <button className="btn" onClick={() => navigate("/")}>
          Go to start
        </button>
      </div>
    );
  }

  // ✅ Per-match storage key
  const storageKey = `${STORAGE_PREFIX}${matchConfig.matchId || "v1"}`;

  const teamAPlayers =
    matchConfig.teams.teamA.players.filter(Boolean).join(" & ") || "Team A";
  const teamBPlayers =
    matchConfig.teams.teamB.players.filter(Boolean).join(" & ") || "Team B";

  const modeLabel = useMemo(() => {
    if (matchConfig.mode === "EIGHT_BOARDS") return "8 Boards (ends at 8 OR at 25)";
    return "First to 25 (no board limit)";
  }, [matchConfig.mode]);

  // ---- Core state ----
  const [boardNo, setBoardNo] = useState(1);
  const [totalA, setTotalA] = useState(0);
  const [totalB, setTotalB] = useState(0);
  const [history, setHistory] = useState([]);

  const [gameOver, setGameOver] = useState({
    isOver: false,
    winner: null, // "A" | "B" | "DRAW"
    reason: "",
  });

  const [showWinPopup, setShowWinPopup] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  // Form state
  const [winner, setWinner] = useState("A"); // "A" or "B"
  const [redSelected, setRedSelected] = useState(false);
  const [coinsLeft, setCoinsLeft] = useState("");

  // Resume modal
  const [showResume, setShowResume] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  // Queen rule: allowed when current score is <= 21, disabled from 22+
  const winnerTotalNow = winner === "A" ? totalA : totalB;
  const queenAllowed = winnerTotalNow <= 21;
  const queenCounted = redSelected && queenAllowed;

  const coins = clampInt(coinsLeft, 0, 9);
  const previewPoints = (queenCounted ? 3 : 0) + coins;
  const previewDots = makeDots({ queenCounted, coins });

  // ---- Load saved state on mount (for THIS matchId only) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      const hasProgress =
        (parsed?.history?.length ?? 0) > 0 ||
        (parsed?.boardNo ?? 1) > 1 ||
        (parsed?.totalA ?? 0) > 0 ||
        (parsed?.totalB ?? 0) > 0 ||
        (parsed?.gameOver?.isOver ?? false) === true;

      if (hasProgress) {
        setSavedSnapshot(parsed);
        setShowResume(true);
      }
    } catch {
      // ignore corrupted storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function applySnapshot(parsed) {
    setBoardNo(parsed.boardNo ?? 1);
    setTotalA(parsed.totalA ?? 0);
    setTotalB(parsed.totalB ?? 0);
    setHistory(parsed.history ?? []);
    setGameOver(parsed.gameOver ?? { isOver: false, winner: null, reason: "" });

    // Keep form usable
    setWinner("A");
    setRedSelected(false);
    setCoinsLeft("");
  }

  // ---- Save state whenever it changes ----
  useEffect(() => {
    const payload = {
      matchConfig,
      boardNo,
      totalA,
      totalB,
      history,
      gameOver,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [storageKey, matchConfig, boardNo, totalA, totalB, history, gameOver]);

  // Confetti + popup when match ends
  useEffect(() => {
    if (gameOver.isOver) {
      setShowWinPopup(true);
      setConfettiKey((k) => k + 1);
    }
  }, [gameOver.isOver]);

  function checkAndSetGameOver(newA, newB, currentBoardNo) {
    if (newA >= 25 || newB >= 25) {
      const win = newA >= 25 ? "A" : "B";
      setGameOver({ isOver: true, winner: win, reason: "Reached 25 points" });
      return true;
    }

    if (matchConfig.mode === "EIGHT_BOARDS" && currentBoardNo === 8) {
      const win = computeWinnerFromTotals(newA, newB);
      setGameOver({ isOver: true, winner: win, reason: "Completed 8 boards" });
      return true;
    }

    return false;
  }

  function submitBoard() {
    if (gameOver.isOver) return;

    let newA = totalA;
    let newB = totalB;

    if (winner === "A") newA += previewPoints;
    else newB += previewPoints;

    const entry = {
      boardNo,
      winner,
      points: previewPoints,
      redSelected,
      queenCounted,
      queenAllowed,
      coinsLeft: coins,
      dots: previewDots,
      totalAfter: { a: newA, b: newB },
    };

    setTotalA(newA);
    setTotalB(newB);
    setHistory((prev) => [...prev, entry]);

    const ended = checkAndSetGameOver(newA, newB, boardNo);
    if (ended) return;

    setBoardNo((b) => b + 1);
    setRedSelected(false);
    setCoinsLeft("");
  }

  function undoLastBoard() {
    if (history.length === 0) return;

    const last = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    let a = 0;
    let b = 0;
    for (const h of newHistory) {
      if (h.winner === "A") a += h.points;
      else b += h.points;
    }

    setHistory(newHistory);
    setTotalA(a);
    setTotalB(b);

    const nextBoard =
      newHistory.length === 0 ? 1 : newHistory[newHistory.length - 1].boardNo + 1;
    setBoardNo(nextBoard);

    setGameOver({ isOver: false, winner: null, reason: "" });

    setWinner(last.winner);
    setRedSelected(false);
    setCoinsLeft("");
  }

  function resetMatch(alsoClearStorage = false) {
    setBoardNo(1);
    setTotalA(0);
    setTotalB(0);
    setHistory([]);
    setWinner("A");
    setRedSelected(false);
    setCoinsLeft(0);
    setGameOver({ isOver: false, winner: null, reason: "" });

    if (alsoClearStorage) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }

  const winnerName =
    gameOver.winner === "A" ? "Team A" : gameOver.winner === "B" ? "Team B" : "Draw";

  const teamAList = matchConfig.teams.teamA.players.filter(Boolean);
  const teamBList = matchConfig.teams.teamB.players.filter(Boolean);

  const winnerPlayers =
    gameOver.winner === "A"
      ? teamAList
      : gameOver.winner === "B"
      ? teamBList
      : [];

  const winnerPlayersText = winnerPlayers.length > 0 ? winnerPlayers.join(" & ") : "";

  return (
    <div className="page">
      <div className="topBar">
        <div>
        <h1 className="title">
  <span className="carromMark" aria-hidden="true">
    <span className="cmPocket" />
    <span className="cmPocket" />
    <span className="cmPocket" />
    <span className="cmPocket" />
    <span className="cmCenter" />
  </span>
  Game
</h1>

          <div className="subtitle">
            Mode: <b>{modeLabel}</b>
          </div>
        </div>

        <button className="linkBtn small" onClick={() => navigate("/setup")}>
          Edit players
        </button>
      </div>

      {/* Confetti runs when match ends */}
      {gameOver.isOver && <Confetti runKey={confettiKey} />}

      {/* Winner popup */}
      {gameOver.isOver && showWinPopup && (
        <div className="overlay">
          <div className="modal card winModal">
            <div className="winModalHeader">
              <div className="trophy">🏆</div>
              <div>
                <h2 className="sectionTitle" style={{ margin: 0 }}>
                  {gameOver.winner === "DRAW" ? "Match Draw!" : `${winnerName} Wins!`}
                </h2>
                <div className="hint" style={{ marginTop: 6 }}>
                  {gameOver.winner === "DRAW"
                    ? "What a close match — well played both teams!"
                    : `Congratulations ${winnerPlayersText || winnerName}! 🎉`}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="hint">
              <b>Final Score:</b> {totalA} — {totalB}
              <br />
              <b>Reason:</b> {gameOver.reason}
            </div>

            <div className="row" style={{ gap: 10, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowWinPopup(false)}>
                Continue viewing
              </button>

              <button
                className="linkBtn"
                onClick={() => {
                  resetMatch(true);
                  setShowWinPopup(false);
                  navigate("/");
                }}
              >
                Start New Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume overlay */}
      {showResume && savedSnapshot && (
        <div className="overlay">
          <div className="modal card">
            <h2 className="sectionTitle">Resume previous match?</h2>
            <div className="hint">
              We found a saved match for this match session.
              <br />
              Current saved score: <b>{savedSnapshot.totalA} — {savedSnapshot.totalB}</b> • Board{" "}
              <b>{savedSnapshot.boardNo}</b>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button
                className="btn"
                onClick={() => {
                  applySnapshot(savedSnapshot);
                  setShowResume(false);
                }}
              >
                Resume
              </button>

              <button
                className="linkBtn"
                onClick={() => {
                  resetMatch(true);
                  setShowResume(false);
                }}
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over banner */}
      {gameOver.isOver && (
        <div className="card gameOverBanner">
          <div className="row" style={{ alignItems: "center" }}>
            <div>
              <div className="label">Game Over</div>
              <div className="big winTitle" style={{ marginTop: 2 }}>
                <span className="trophy">🏆</span>
                <span>
                  {winnerName} {gameOver.winner === "DRAW" ? "" : "wins"} 🎉
                </span>
              </div>
              <div className="hint" style={{ marginTop: 6 }}>
                Reason: <b>{gameOver.reason}</b> • Final score: <b>{totalA} — {totalB}</b>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
              <button
                className="btn"
                onClick={() => {
                  resetMatch(true);
                  navigate("/");
                }}
              >
                Start New Match
              </button>
              <button className="linkBtn" onClick={() => resetMatch(false)}>
                Reset (same mode & teams)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        {/* MAIN */}
        <div className="card">
          <div className="row">
            <div>
              <div className="label">Board</div>
              <div className="big">{boardNo}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="label">Totals</div>
              <div className="big">
                {totalA} — {totalB}
              </div>
            </div>
          </div>

          <div className="row">
            <div className="teamBox">
              <div className="label">Team A</div>
              <div className="team">{teamAPlayers}</div>
            </div>
            <div className="teamBox">
              <div className="label">Team B</div>
              <div className="team">{teamBPlayers}</div>
            </div>
          </div>

          <div className="divider" />

          <h2 className="sectionTitle">End of Board — Enter result</h2>

          <div className={gameOver.isOver ? "disabledBlock" : ""}>
            <div className="formGrid">
              <div>
                <div className="label">Who won this board?</div>
                <div className="segmented">
                  <button
                    className={`segBtn ${winner === "A" ? "active" : ""}`}
                    onClick={() => setWinner("A")}
                    disabled={gameOver.isOver}
                  >
                    Team A
                  </button>
                  <button
                    className={`segBtn ${winner === "B" ? "active" : ""}`}
                    onClick={() => setWinner("B")}
                    disabled={gameOver.isOver}
                  >
                    Team B
                  </button>
                </div>
              </div>

              <div>
                <div className="label">Did the winning team pot the red (queen)?</div>
                <div className="segmented">
                  <button
                    className={`segBtn ${redSelected ? "active" : ""}`}
                    onClick={() => setRedSelected(true)}
                    disabled={gameOver.isOver}
                    title={queenAllowed ? "" : "Queen bonus is disabled from 22+"}
                  >
                    Yes (+3)
                  </button>
                  <button
                    className={`segBtn ${!redSelected ? "active" : ""}`}
                    onClick={() => setRedSelected(false)}
                    disabled={gameOver.isOver}
                  >
                    No
                  </button>
                </div>

                {!queenAllowed && (
                  <div className="hint" style={{ marginTop: 8 }}>
                    ⚠️ Queen bonus is <b>disabled</b> because the winning team is already at{" "}
                    <b>{winnerTotalNow}</b>. From 22→25, score only from remaining opponent coins.
                  </div>
                )}
                {redSelected && !queenCounted && queenAllowed === false && (
                  <div className="hint" style={{ marginTop: 6 }}>
                    You selected queen, but +3 will NOT be added due to the 22+ rule.
                  </div>
                )}
              </div>

              <div>
                <div className="label">Opponent coins left on board</div>
                <input
                  className="input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={coinsLeft}
                  onChange={(e) => setCoinsLeft(e.target.value)}
                  placeholder="0 to 9"
                  disabled={gameOver.isOver}
                />

                <div className="hint" style={{ marginTop: 8 }}>
                  This board points will be: <b>{previewPoints}</b>{" "}
                  (
                  <span className="dots" aria-label="Points breakdown">
                    {previewDots.queenCounted && (
                      <span className="queenCoin" title="Queen bonus" />
                    )}
                    {Array.from({ length: previewDots.coins }).map((_, i) => (
                      <span key={i} className="coinDot" title="Opponent coin" />
                    ))}
                    {previewDots.coins === 0 && !previewDots.queenCounted ? (
                      <span className="hint">—</span>
                    ) : null}
                  </span>
                  )
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button className="btn" onClick={submitBoard} disabled={gameOver.isOver}>
                Save Board Result →
              </button>
              <button className="linkBtn" onClick={undoLastBoard}>
                Undo last board
              </button>
            </div>

            <button className="linkBtn" onClick={() => resetMatch(false)}>
              Reset match
            </button>
          </div>
        </div>

        {/* HISTORY */}
        <div className="card historyCard">
          <h2 className="sectionTitle">Board history</h2>

          {history.length === 0 ? (
            <div className="hint">No boards saved yet. Finish Board 1 and save the result.</div>
          ) : (
            <div className="historyList">
              {history.map((h) => (
                <div key={h.boardNo} className="historyItem">
                  <div className="historyLeft">
                    <div className="historyBoard">Board {h.boardNo}</div>
                    <div className="hint">
                      Winner: <b>{h.winner === "A" ? "Team A" : "Team B"}</b>
                    </div>
                    {!h.queenAllowed && h.redSelected && (
                      <div className="hint">Queen selected, but bonus blocked (22+ rule)</div>
                    )}
                  </div>

                  <div className="historyRight">
                    <div className="historyPoints">+{h.points}</div>
                    <div className="dots" aria-label="Points breakdown">
                      {h.dots.queenCounted && (
                        <span className="queenCoin" title="Queen bonus" />
                      )}
                      {Array.from({ length: h.dots.coins }).map((_, i) => (
                        <span key={i} className="coinDot" title="Opponent coin" />
                      ))}
                      {h.dots.coins === 0 && !h.dots.queenCounted ? (
                        <span className="hint">—</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="divider" />
          <div className="row" style={{ alignItems: "center" }}>
            <div className="label">Running Totals</div>
            <div className="big" style={{ fontSize: 20 }}>
              {totalA} — {totalB}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
