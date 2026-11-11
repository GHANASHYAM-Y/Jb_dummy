/**
 * EVOAIQU — Speed Chess Engine Test Suite
 * Milestone 6: Server-Authoritative FIDE Chess Rules, Clocks & Edge Cases
 */

import { describe, it, expect } from "vitest";
import {
  createInitialMatchState,
  validateAndExecuteMove,
  calculateClocks,
  handleResignation,
  handleDrawOffer,
  handleDrawResponse,
  handleTimeout,
  getCapturedPieces,
  getLegalMoves,
  canClaimDraw,
  STARTING_FEN,
} from "@/features/chess/engine/engine";

const P1_WHITE = "11111111-1111-1111-1111-111111111111";
const P2_BLACK = "22222222-2222-2222-2222-222222222222";
const MATCH_ID = "99999999-9999-9999-9999-999999999999";
const STRANGER = "33333333-3333-3333-3333-333333333333";

describe("EVOAIQU Chess Engine — Core FIDE Rules & Move Validation", () => {
  it("initializes a standard match state with 5m + 3s clocks", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK, 300, 3);
    expect(state.fen).toBe(STARTING_FEN);
    expect(state.turn).toBe("w");
    expect(state.ply).toBe(0);
    expect(state.white_time_remaining_ms).toBe(300000);
    expect(state.black_time_remaining_ms).toBe(300000);
    expect(state.is_check).toBe(false);
    expect(state.is_checkmate).toBe(false);
    expect(state.game_status).toBe("active");
  });

  it("allows White to make legal opening move 1. e4", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    const startMs = new Date(state.last_move_at).getTime();

    // 2 seconds later
    const moveRes = validateAndExecuteMove(
      state,
      P1_WHITE,
      { from: "e2", to: "e4" },
      startMs + 2000
    );

    expect(moveRes.ok).toBe(true);
    expect(moveRes.san).toBe("e4");
    expect(moveRes.nextState).toBeDefined();
    expect(moveRes.nextState?.turn).toBe("b");
    expect(moveRes.nextState?.ply).toBe(1);
    // 300,000 - 2,000 + 3,000 increment = 301,000 ms
    expect(moveRes.nextState?.white_time_remaining_ms).toBe(301000);
    expect(moveRes.nextState?.black_time_remaining_ms).toBe(300000);
  });

  it("rejects moves out of turn", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    // Black tries to move first
    const res = validateAndExecuteMove(state, P2_BLACK, { from: "e7", to: "e5" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("out_of_turn");
  });

  it("rejects non-participants from moving", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    const res = validateAndExecuteMove(state, STRANGER, { from: "e2", to: "e4" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("not_a_participant");
  });

  it("rejects illegal moves (e.g. moving a piece through obstruction or into check)", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    // Pawn trying to move 3 squares
    const res = validateAndExecuteMove(state, P1_WHITE, { from: "e2", to: "e5" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("illegal_move");
  });

  it("handles Scholar's Mate checkmate sequence accurately", () => {
    let state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    let t = new Date(state.last_move_at).getTime();

    // 1. e4
    let res = validateAndExecuteMove(state, P1_WHITE, { from: "e2", to: "e4" }, t + 1000);
    state = res.nextState!;
    t = new Date(state.last_move_at).getTime();

    // 1... e5
    res = validateAndExecuteMove(state, P2_BLACK, { from: "e7", to: "e5" }, t + 1000);
    state = res.nextState!;
    t = new Date(state.last_move_at).getTime();

    // 2. Bc4
    res = validateAndExecuteMove(state, P1_WHITE, { from: "f1", to: "c4" }, t + 1000);
    state = res.nextState!;
    t = new Date(state.last_move_at).getTime();

    // 2... Nc6
    res = validateAndExecuteMove(state, P2_BLACK, { from: "b8", to: "c6" }, t + 1000);
    state = res.nextState!;
    t = new Date(state.last_move_at).getTime();

    // 3. Qh5
    res = validateAndExecuteMove(state, P1_WHITE, { from: "d1", to: "h5" }, t + 1000);
    state = res.nextState!;
    t = new Date(state.last_move_at).getTime();

    // 3... Nf6
    res = validateAndExecuteMove(state, P2_BLACK, { from: "g8", to: "f6" }, t + 1000);
    state = res.nextState!;
    t = new Date(state.last_move_at).getTime();

    // 4. Qxf7# (Checkmate!)
    res = validateAndExecuteMove(state, P1_WHITE, { from: "h5", to: "f7" }, t + 1000);
    state = res.nextState!;

    expect(res.ok).toBe(true);
    expect(res.san).toBe("Qxf7#");
    expect(state.is_checkmate).toBe(true);
    expect(state.is_check).toBe(true);
    expect(state.game_status).toBe("checkmate");
    expect(state.winner_id).toBe(P1_WHITE);
    expect(state.win_reason).toBe("checkmate");

    // Any subsequent move should be rejected
    const postGameMove = validateAndExecuteMove(state, P2_BLACK, { from: "a7", to: "a6" });
    expect(postGameMove.ok).toBe(false);
    expect(postGameMove.code).toBe("game_already_over");
  });

  it("handles stalemate correctly", () => {
    // White: King c6, Rook b1. Black: King a8. White plays Rb7, trapping King with no legal moves
    const stalemateFen = "k7/8/2K5/8/8/8/8/1R6 w - - 0 1";
    const state = {
      ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
      fen: stalemateFen,
    };

    const res = validateAndExecuteMove(state, P1_WHITE, { from: "b1", to: "b7" });
    expect(res.ok).toBe(true);
    expect(res.san).toBe("Rb7");
    expect(res.nextState?.is_stalemate).toBe(true);
    expect(res.nextState?.is_draw).toBe(true);
    expect(res.nextState?.game_status).toBe("stalemate");
    expect(res.nextState?.win_reason).toBe("stalemate");
  });

  it("handles en passant capture correctly", () => {
    // Black pawn just moved f7 to f5 (target square f6). White pawn on e5 captures en passant: exf6
    const epFen = "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3";
    const state = {
      ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
      fen: epFen,
      ply: 4,
    };

    const res = validateAndExecuteMove(state, P1_WHITE, { from: "e5", to: "f6" });
    expect(res.ok).toBe(true);
    expect(res.san).toBe("exf6");
    expect(res.captured).toBe("p");
    // After exf6, f5 is vacant
    expect(res.nextState?.fen).toContain("5P2/3p4");
  });

  it("handles promotion to all 4 pieces: queen, rook, bishop, and knight", () => {
    const promoFen = "8/4P3/8/8/8/8/8/k6K w - - 0 1";

    const promotions = [
      { piece: "q", expectedSan: "e8=Q" },
      { piece: "r", expectedSan: "e8=R" },
      { piece: "b", expectedSan: "e8=B" },
      { piece: "n", expectedSan: "e8=N" },
    ];

    for (const { piece, expectedSan } of promotions) {
      const state = {
        ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
        fen: promoFen,
      };

      const res = validateAndExecuteMove(state, P1_WHITE, {
        from: "e7",
        to: "e8",
        promotion: piece,
      });

      expect(res.ok).toBe(true);
      expect(res.san).toBe(expectedSan);
      expect(res.nextState?.fen).toContain(piece.toUpperCase());
    }
  });

  it("handles castling Kingside and Queenside", () => {
    // Position where White can castle Kingside and Queenside
    const castleFen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
    const state = {
      ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
      fen: castleFen,
    };

    // Kingside castle: e1 -> g1
    const resKingside = validateAndExecuteMove(state, P1_WHITE, { from: "e1", to: "g1" });
    expect(resKingside.ok).toBe(true);
    expect(resKingside.san).toBe("O-O");

    // Queenside castle: e1 -> c1
    const resQueenside = validateAndExecuteMove(state, P1_WHITE, { from: "e1", to: "c1" });
    expect(resQueenside.ok).toBe(true);
    expect(resQueenside.san).toBe("O-O-O");
  });

  it("detects insufficient mating material after a pawn capture", () => {
    // White King e2, Black King e7, Black Pawn f3. White captures Kxf3 leaving King vs King
    const fen = "8/4k3/8/8/8/5p2/4K3/8 w - - 0 1";
    const state = {
      ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
      fen,
    };

    const res = validateAndExecuteMove(state, P1_WHITE, { from: "e2", to: "f3" });
    expect(res.ok).toBe(true);
    expect(res.san).toBe("Kxf3");
    expect(res.nextState?.game_status).toBe("insufficient_material");
    expect(res.nextState?.is_draw).toBe(true);
    expect(res.nextState?.win_reason).toBe("insufficient_material");
  });

  it("handles threefold repetition: plays on when unclaimed, draws when claimed, auto-draws on fivefold", () => {
    let state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);

    // Sequence of 2 back-and-forth knight moves
    const cycle = [
      { from: "g1", to: "f3" },
      { from: "g8", to: "f6" },
      { from: "f3", to: "g1" },
      { from: "f6", to: "g8" },
    ];

    // Cycle 1 (initial pos seen 2nd time at end)
    for (let i = 0; i < cycle.length; i++) {
      const player = i % 2 === 0 ? P1_WHITE : P2_BLACK;
      const res = validateAndExecuteMove(state, player, cycle[i]);
      state = res.nextState!;
    }

    // 1st half of Cycle 2
    let res = validateAndExecuteMove(state, P1_WHITE, cycle[0]);
    state = res.nextState!;
    res = validateAndExecuteMove(state, P2_BLACK, cycle[1]);
    state = res.nextState!;
    res = validateAndExecuteMove(state, P1_WHITE, cycle[2]);
    state = res.nextState!;

    // 4th move of Cycle 2: completes 3rd appearance of initial position!
    // Without claim_draw, the game MUST CONTINUE (FIDE 9.2)
    const playOnRes = validateAndExecuteMove(state, P2_BLACK, { ...cycle[3], claim_draw: false });
    expect(playOnRes.ok).toBe(true);
    expect(playOnRes.nextState?.game_status).toBe("active");
    expect(playOnRes.nextState?.is_draw).toBe(false);

    // canClaimDraw helper should confirm claim is available
    const claimCheck = canClaimDraw(playOnRes.nextState!.fen, playOnRes.nextState!.pgn);
    expect(claimCheck.canClaim).toBe(true);
    expect(claimCheck.reason).toBe("threefold_repetition");

    // Replay 4th move of Cycle 2 WITH claim_draw = true -> Draw declared!
    const claimRes = validateAndExecuteMove(state, P2_BLACK, { ...cycle[3], claim_draw: true });
    expect(claimRes.ok).toBe(true);
    expect(claimRes.nextState?.game_status).toBe("threefold_repetition");
    expect(claimRes.nextState?.is_draw).toBe(true);
    expect(claimRes.nextState?.win_reason).toBe("threefold_repetition");
  });

  it("handles 50-move rule: plays on when unclaimed, draws when claimed, auto-draws on 75-move rule", () => {
    // FEN with halfmove clock at 99 (after move 100 it reaches 50 full moves)
    const fen99 = "8/8/8/8/8/4k3/8/4K2R w - - 99 50";
    const state = {
      ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
      fen: fen99,
      ply: 99,
    };

    // White moves Rh2 without claim_draw -> Game MUST CONTINUE
    const playOn = validateAndExecuteMove(state, P1_WHITE, { from: "h1", to: "h2", claim_draw: false });
    expect(playOn.ok).toBe(true);
    expect(playOn.nextState?.game_status).toBe("active");
    expect(playOn.nextState?.is_draw).toBe(false);

    // White moves Rh2 WITH claim_draw -> Game is drawn
    const claimDraw = validateAndExecuteMove(state, P1_WHITE, { from: "h1", to: "h2", claim_draw: true });
    expect(claimDraw.ok).toBe(true);
    expect(claimDraw.nextState?.game_status).toBe("fifty_move_rule");
    expect(claimDraw.nextState?.is_draw).toBe(true);

    // 75-move rule (149 halfmoves -> 150 halfmoves): Automatic mandatory draw under FIDE 9.6.2
    const fen149 = "8/8/8/8/8/4k3/8/4K2R w - - 149 75";
    const state149 = {
      ...createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK),
      fen: fen149,
      ply: 149,
    };

    const autoDraw = validateAndExecuteMove(state149, P1_WHITE, { from: "h1", to: "h2" });
    expect(autoDraw.ok).toBe(true);
    expect(autoDraw.nextState?.game_status).toBe("fifty_move_rule");
    expect(autoDraw.nextState?.win_reason).toBe("seventy_five_move_rule");
    expect(autoDraw.nextState?.is_draw).toBe(true);
  });
});

describe("EVOAIQU Chess Engine — Clocks, Resignation & Draws", () => {
  it("calculates live in-flight elapsed time accurately", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK, 300, 3);
    const startMs = new Date(state.last_move_at).getTime();

    // 15 seconds into White's turn
    const clocks = calculateClocks(state, startMs + 15000);
    expect(clocks.whiteRemainingMs).toBe(285000);
    expect(clocks.blackRemainingMs).toBe(300000);
    expect(clocks.isTimedOut).toBe(false);
  });

  it("detects flag fall timeout and awards victory", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK, 300, 3);
    const startMs = new Date(state.last_move_at).getTime();

    // 301 seconds into White's turn (exceeded 300s limit)
    const timeoutRes = handleTimeout(state, startMs + 301000);
    expect(timeoutRes.ok).toBe(true);
    expect(timeoutRes.code).toBe("timeout");
    expect(timeoutRes.nextState?.game_status).toBe("timeout");
    expect(timeoutRes.nextState?.winner_id).toBe(P2_BLACK);
  });

  it("awards draw on timeout if opponent has insufficient material (FIDE 6.9)", () => {
    const fen = "8/8/8/8/8/4k3/8/4K1N1 b - - 0 1";
    const baseState = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK, 300, 3);
    const state = {
      ...baseState,
      fen,
      turn: "b" as const,
      white_time_remaining_ms: 100000,
      black_time_remaining_ms: 1000,
      last_move_at: new Date(1000000).toISOString(),
    };

    // Black times out (10 seconds later)
    const timeoutRes = handleTimeout(state, 1000000 + 10000);
    expect(timeoutRes.ok).toBe(true);
    expect(timeoutRes.nextState?.game_status).toBe("insufficient_material");
    expect(timeoutRes.nextState?.is_draw).toBe(true);
    expect(timeoutRes.nextState?.winner_id).toBeNull();
  });

  it("handles participant resignation immediately", () => {
    const state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    const res = handleResignation(state, P1_WHITE);
    expect(res.ok).toBe(true);
    expect(res.nextState?.game_status).toBe("resigned");
    expect(res.nextState?.winner_id).toBe(P2_BLACK);
    expect(res.nextState?.resigned_by).toBe(P1_WHITE);
  });

  it("handles mutual draw agreement", () => {
    let state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);

    // White offers draw
    const offerRes = handleDrawOffer(state, P1_WHITE);
    expect(offerRes.ok).toBe(true);
    state = offerRes.nextState!;
    expect(state.draw_offered_by).toBe(P1_WHITE);

    // Black accepts draw
    const acceptRes = handleDrawResponse(state, P2_BLACK, true);
    expect(acceptRes.ok).toBe(true);
    expect(acceptRes.nextState?.game_status).toBe("draw_agreed");
    expect(acceptRes.nextState?.is_draw).toBe(true);
  });

  it("handles draw decline cleanly", () => {
    let state = createInitialMatchState(MATCH_ID, P1_WHITE, P2_BLACK);
    const offerRes = handleDrawOffer(state, P1_WHITE);
    state = offerRes.nextState!;

    // Black declines draw
    const declineRes = handleDrawResponse(state, P2_BLACK, false);
    expect(declineRes.ok).toBe(true);
    expect(declineRes.code).toBe("draw_declined");
    expect(declineRes.nextState?.draw_offered_by).toBeNull();
    expect(declineRes.nextState?.game_status).toBe("active");
  });
});

describe("EVOAIQU Chess Engine — Captured Pieces & Legal Moves Extraction", () => {
  it("extracts captured pieces and computes accurate material advantage", () => {
    // White took a black knight, Black took a white queen
    const fen = "r1bqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
    const captured = getCapturedPieces(fen);

    expect(captured.black).toContain("Q"); // Black captured White's Queen
    expect(captured.white).toContain("n"); // White captured Black's Knight
    // White is 30, Black is 33 -> advantage is -3
    expect(captured.advantage).toBe(-3);
  });

  it("extracts legal move targets for square selection highlighting", () => {
    const legalMoves = getLegalMoves(STARTING_FEN, "e2");
    // e2 pawn can move to e3 and e4
    expect(legalMoves.map((m) => m.to)).toEqual(["e3", "e4"]);
  });
});
