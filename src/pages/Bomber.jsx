import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Bomber.css';

const INITIAL_PLAYERS = [
  { name: 'SERGIO',  color: '#ff2e9a' },
  { name: 'JOEL',    color: '#00f0ff' },
  { name: 'GONZALO', color: '#39ff14' },
  { name: 'GALLO',   color: '#ffd400' },
  { name: 'PARCE',   color: '#ff6b1a' },
];

const STORAGE_KEY = 'bomber_battle_scores_v2';

function loadScores() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return INITIAL_PLAYERS.map((p, i) => ({ ...p, score: data[i] != null ? data[i] : 0 }));
    }
  } catch (e) { /* ignore */ }
  return INITIAL_PLAYERS.map((p) => ({ ...p, score: 0 }));
}

export default function Bomber() {
  const [players, setPlayers] = useState(loadScores);
  const [explosions, setExplosions] = useState([]);
  const [poppingIdx, setPoppingIdx] = useState(null);
  const [showMinus, setShowMinus] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(players.map((p) => p.score)));
    } catch (e) { /* ignore */ }
  }, [players]);

  const addPoint = (i, event) => {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, score: p.score + 1 } : p)));
    setPoppingIdx(i);
    setTimeout(() => setPoppingIdx(null), 400);
    if (event) {
      const id = Date.now() + Math.random();
      const x = event.clientX - 30;
      const y = event.clientY - 30;
      setExplosions((prev) => [...prev, { id, x, y }]);
      setTimeout(() => setExplosions((prev) => prev.filter((e) => e.id !== id)), 600);
    }
  };

  const subPoint = (i) => {
    setPlayers((prev) => prev.map((p, idx) => (idx === i && p.score > 0 ? { ...p, score: p.score - 1 } : p)));
    setShowMinus(false);
  };

  const resetAll = () => {
    if (window.confirm('¿RESETEAR TODOS LOS PUNTAJES?')) {
      setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    }
  };

  const maxScore = Math.max(...players.map((p) => p.score));
  const hasLeader = maxScore > 0;
  const medals = ['🥇', '🥈', '🥉', '4°', '5°'];
  const sorted = players
    .map((p, originalIdx) => ({ ...p, originalIdx }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="bomber-page">
      <div className="bomber-container">
        <header className="bomber-header">
          <div className="bomber-bomb-decor left">💣</div>
          <div className="bomber-bomb-decor right">💥</div>
          <h1 className="bomber-title">BOMBER BATTLE</h1>
          <div className="bomber-subtitle">★ MARCADOR DE PARTIDAS ★</div>
        </header>

        <div className="bomber-hint">▼ TOCA UN NOMBRE PARA SUMAR ▼</div>

        <section className="bomber-podium-section">
          <div className="bomber-podium-title">🏆 RANKING 🏆</div>
          <ul className="bomber-ranking-list">
            {sorted.map((p, i) => {
              const isLeader = hasLeader && p.score === maxScore;
              const classes = ['bomber-ranking-item'];
              if (isLeader) classes.push('leader');
              if (poppingIdx === p.originalIdx) classes.push('popping');
              return (
                <li
                  key={p.originalIdx}
                  className={classes.join(' ')}
                  style={{ '--player-color': p.color }}
                  onClick={(e) => addPoint(p.originalIdx, e)}
                >
                  <span className="bomber-ranking-position">{medals[i]}</span>
                  <span className="bomber-ranking-name">{p.name}</span>
                  <span className="bomber-ranking-score">{String(p.score).padStart(2, '0')} PTS</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="bomber-actions">
          <button className="bomber-btn-action bomber-btn-minus" onClick={() => setShowMinus(true)}>− QUITAR PUNTO</button>
          <button className="bomber-btn-action bomber-btn-reset" onClick={resetAll}>⟲ RESET</button>
        </div>

        <div className="bomber-footer">
          <Link to="/" className="bomber-back">← VOLVER AL INICIO</Link>
          <div>INSERT COIN • PRESS NAME TO SCORE</div>
        </div>
      </div>

      {showMinus && (
        <div
          className="bomber-modal-overlay active"
          onClick={(e) => { if (e.target.classList.contains('bomber-modal-overlay')) setShowMinus(false); }}
        >
          <div className="bomber-modal">
            <div className="bomber-modal-title">¿A QUIÉN QUITAR?</div>
            <ul className="bomber-modal-list">
              {players.map((p, i) => (
                <li key={i}>
                  <button style={{ '--player-color': p.color }} onClick={() => subPoint(i)}>
                    {p.name} ({String(p.score).padStart(2, '0')})
                  </button>
                </li>
              ))}
            </ul>
            <button className="bomber-modal-close" onClick={() => setShowMinus(false)}>CANCELAR</button>
          </div>
        </div>
      )}

      {explosions.map((e) => (
        <div key={e.id} className="bomber-explosion" style={{ left: `${e.x}px`, top: `${e.y}px` }}>💥</div>
      ))}
    </div>
  );
}
