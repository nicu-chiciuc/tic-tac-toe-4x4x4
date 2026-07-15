import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { Check, Copy, Eye, RotateCcw, Share2, Swords } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search.room === "string" ? search.room.toUpperCase().slice(0, 6) : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <AutomaticGuestSession />
      </Unauthenticated>
      <Authenticated>
        <GameApp />
      </Authenticated>
    </>
  );
}

function AutomaticGuestSession() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState("");
  useEffect(() => {
    void signIn("anonymous").catch(() =>
      setError("Could not start a guest session. Refresh to try again."),
    );
  }, [signIn]);
  return error ? (
    <main className="center-screen">
      <p role="alert">{error}</p>
    </main>
  ) : (
    <LoadingScreen />
  );
}

function LoadingScreen() {
  return (
    <main className="center-screen">
      <div className="loading-cube" aria-hidden="true" />
      <p>Building the board…</p>
    </main>
  );
}

function GameApp() {
  const { room } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const ensureName = useMutation(api.guests.ensureName);
  const viewer = useQuery(api.guests.viewer, {});
  const createGame = useMutation(api.games.create);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (viewer && !viewer.name) void ensureName({});
  }, [ensureName, viewer]);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await createGame({});
      await navigate({ search: { room: result.code } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a room");
    } finally {
      setBusy(false);
    }
  };

  if (room) return <Room code={room} onLeave={() => navigate({ search: { room: undefined } })} />;

  return (
    <main className="lobby-shell">
      <section className="lobby-copy">
        <div className="brand-mark" aria-hidden="true">
          <span>X</span>
          <i />
          <span>O</span>
        </div>
        <p className="eyebrow">Four planes. Sixty-four spaces.</p>
        <h1>
          Tic-tac-toe
          <br />
          <em>with depth.</em>
        </h1>
        <p className="intro">
          Make a line of four in any direction—even straight through the cube. No accounts. Just
          send the room link.
        </p>
        <div className="lobby-actions">
          <button className="primary-action" onClick={create} disabled={busy}>
            <Swords size={19} />
            {busy ? "Opening room…" : "Create a room"}
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length === 6) void navigate({ search: { room: code } });
            }}
          >
            <input
              aria-label="Room code"
              placeholder="ROOM CODE"
              value={code}
              maxLength={6}
              onChange={(event) =>
                setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))
              }
            />
            <button type="submit" disabled={code.length !== 6}>
              Enter
            </button>
          </form>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="guest-note">
          <span /> Playing as {viewer?.name ?? "Guest"}
        </p>
      </section>
      <DemoCube />
    </main>
  );
}

function DemoCube() {
  return (
    <div className="demo-wrap" aria-label="Four stacked four by four game boards">
      <div className="demo-cube">
        {[0, 1, 2, 3].map((layer) => (
          <div className="demo-layer" key={layer}>
            {Array.from({ length: 16 }, (_, cell) => (
              <span
                key={cell}
                className={
                  layer === 0 && [0, 5, 10, 15].includes(cell)
                    ? "demo-x"
                    : layer === 2 && [3, 6, 9].includes(cell)
                      ? "demo-o"
                      : ""
                }
              >
                {layer === 0 && [0, 5, 10, 15].includes(cell)
                  ? "×"
                  : layer === 2 && [3, 6, 9].includes(cell)
                    ? "○"
                    : ""}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const game = useQuery(api.games.get, { code });
  const join = useMutation(api.games.join);
  const play = useMutation(api.games.play);
  const restart = useMutation(api.games.restart);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const moves = useMemo(
    () => new Map(game?.moves.map((move) => [move.cell, move.mark]) ?? []),
    [game],
  );
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const move = async (cell: number) => {
    setError("");
    try {
      await play({ code, cell });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Move failed");
    }
  };

  if (game === undefined) return <LoadingScreen />;
  if (game === null)
    return (
      <main className="center-screen">
        <p>
          Room <strong>{code}</strong> doesn’t exist.
        </p>
        <button className="text-button" onClick={onLeave}>
          Back to lobby
        </button>
      </main>
    );

  const status =
    game.status === "waiting"
      ? "Waiting for player O"
      : game.status === "won"
        ? `${game.winner} wins the cube`
        : game.status === "draw"
          ? "The cube is full — draw"
          : game.viewerMark
            ? game.turn === game.viewerMark
              ? "Your move"
              : `${game.turn} is thinking`
            : `${game.turn} to move`;
  const canMove = game.status === "playing" && game.viewerMark === game.turn;

  return (
    <main className="game-shell">
      <header className="game-header">
        <button className="mini-brand" onClick={onLeave} aria-label="Back to lobby">
          X<i />O
        </button>
        <div className="room-code">
          <span>Room</span>
          <strong>{code}</strong>
        </div>
        <button className="share-button" onClick={copyLink}>
          {copied ? <Check size={17} /> : <Copy size={17} />}
          <span>{copied ? "Copied" : "Copy link"}</span>
        </button>
      </header>
      <section className="score-strip">
        <PlayerCard
          mark="X"
          name={game.playerXName ?? "Open seat"}
          active={game.turn === "X" && game.status === "playing"}
          you={game.viewerMark === "X"}
        />
        <div className="turn-status">
          <span className={`status-light ${game.status}`} />
          {status}
        </div>
        <PlayerCard
          mark="O"
          name={game.playerOName ?? "Open seat"}
          active={game.turn === "O" && game.status === "playing"}
          you={game.viewerMark === "O"}
        />
      </section>
      <section className="play-area">
        <div className="board-stage">
          <div className="axis axis-z">LEVEL</div>
          <div className="board-stack">
            {[3, 2, 1, 0].map((z) => (
              <BoardLayer
                key={z}
                z={z}
                moves={moves}
                winning={game.winningCells}
                disabled={!canMove}
                onMove={move}
              />
            ))}
          </div>
        </div>
        <aside className="game-panel">
          <div>
            <p className="panel-label">You are</p>
            <div className="role">
              <strong>{game.viewerMark ?? <Eye size={20} />}</strong>
              <span>{game.viewerMark ? `Player ${game.viewerMark}` : "Watching"}</span>
            </div>
          </div>
          {game.canJoin && (
            <button className="primary-action compact" onClick={() => void join({ code })}>
              <Swords size={18} />
              Join as O
            </button>
          )}
          {game.status === "waiting" && (
            <>
              <p className="panel-copy">
                Share the link. The next person can take the open seat; everyone else watches live.
              </p>
              <button className="secondary-action" onClick={copyLink}>
                <Share2 size={17} />
                Share room
              </button>
            </>
          )}
          {(game.status === "won" || game.status === "draw") && game.viewerMark && (
            <button className="primary-action compact" onClick={() => void restart({ code })}>
              <RotateCcw size={18} />
              Play again
            </button>
          )}
          <div className="rules">
            <p className="panel-label">How to win</p>
            <p>
              Connect four across a level, between levels, or corner-to-corner through the cube.
            </p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}

function PlayerCard({
  mark,
  name,
  active,
  you,
}: {
  mark: "X" | "O";
  name: string;
  active: boolean;
  you: boolean;
}) {
  return (
    <div className={`player-card player-${mark.toLowerCase()} ${active ? "active" : ""}`}>
      <strong>{mark}</strong>
      <div>
        <span>{name}</span>
        {you && <small>You</small>}
      </div>
    </div>
  );
}

function BoardLayer({
  z,
  moves,
  winning,
  disabled,
  onMove,
}: {
  z: number;
  moves: Map<number, "X" | "O">;
  winning: number[];
  disabled: boolean;
  onMove: (cell: number) => void;
}) {
  return (
    <div className="board-layer">
      <span className="level-tag">{z + 1}</span>
      {Array.from({ length: 16 }, (_, local) => {
        const cell = z * 16 + local;
        const mark = moves.get(cell);
        return (
          <button
            key={cell}
            className={`cell ${mark ? `mark-${mark.toLowerCase()}` : ""} ${winning.includes(cell) ? "winning" : ""}`}
            disabled={disabled || Boolean(mark)}
            onClick={() => onMove(cell)}
            aria-label={`Level ${z + 1}, row ${Math.floor(local / 4) + 1}, column ${(local % 4) + 1}${mark ? `, ${mark}` : ""}`}
          >
            {mark === "X" ? "×" : mark === "O" ? "○" : ""}
          </button>
        );
      })}
    </div>
  );
}
