export type TeamIndex = 0 | 1;

export type SetScore = { a: number; b: number };

export type ScoreState = {
  pointA: number;
  pointB: number;
  gameA: number;
  gameB: number;
  setA: number;
  setB: number;
  isTieBreak: boolean;
  tieA: number;
  tieB: number;
  servingTeam: TeamIndex;
  aceA: number;
  aceB: number;
  winnersA: number;
  winnersB: number;
  errorsA: number;
  errorsB: number;
  winnerTeam: TeamIndex | null;
  sets: SetScore[];
};

export type ScoreKind = 'POINT' | 'ACE' | 'WINNER' | 'ERROR';

const POINT_LABEL = ['0', '15', '30', '40'];

export function emptyScore(): ScoreState {
  return {
    pointA: 0,
    pointB: 0,
    gameA: 0,
    gameB: 0,
    setA: 0,
    setB: 0,
    isTieBreak: false,
    tieA: 0,
    tieB: 0,
    servingTeam: 0,
    aceA: 0,
    aceB: 0,
    winnersA: 0,
    winnersB: 0,
    errorsA: 0,
    errorsB: 0,
    winnerTeam: null,
    sets: [],
  };
}

export function parseScore(json?: string | null): ScoreState {
  const base = emptyScore();
  if (!json) return base;
  try {
    const raw = JSON.parse(json) as Partial<ScoreState>;
    return {
      ...base,
      ...raw,
      servingTeam: raw.servingTeam === 1 ? 1 : 0,
      winnerTeam: raw.winnerTeam === 0 || raw.winnerTeam === 1 ? raw.winnerTeam : null,
      sets: Array.isArray(raw.sets)
        ? raw.sets.map((s) => ({ a: Number(s.a) || 0, b: Number(s.b) || 0 }))
        : [],
    };
  } catch {
    return base;
  }
}

export function parseScoreLog(json?: string | null): ScoreState[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => parseScore(JSON.stringify(item)));
  } catch {
    return [];
  }
}

function clone(state: ScoreState): ScoreState {
  return { ...state, sets: state.sets.map((s) => ({ ...s })) };
}

function otherTeam(team: TeamIndex): TeamIndex {
  return team === 0 ? 1 : 0;
}

function wouldWinTieBreak(state: ScoreState, team: TeamIndex) {
  const t = team === 0 ? state.tieA + 1 : state.tieB + 1;
  const o = team === 0 ? state.tieB : state.tieA;
  return t >= 7 && t - o >= 2;
}

function wouldWinGame(state: ScoreState, team: TeamIndex) {
  if (state.isTieBreak) return wouldWinTieBreak(state, team);
  const p = team === 0 ? state.pointA : state.pointB;
  const o = team === 0 ? state.pointB : state.pointA;
  if (p >= 3 && o >= 3) return true;
  return p >= 3 && o < 3;
}

function wouldWinSetFromGame(state: ScoreState, team: TeamIndex) {
  const g = (team === 0 ? state.gameA : state.gameB) + 1;
  const o = team === 0 ? state.gameB : state.gameA;
  if (g >= 6 && o >= 6) return false;
  return (g >= 6 && g - o >= 2) || (g === 7 && o === 5);
}

export function applyPoint(input: ScoreState, team: TeamIndex): ScoreState {
  const state = clone(input);
  if (state.winnerTeam != null) return state;

  if (state.isTieBreak) {
    if (team === 0) state.tieA += 1;
    else state.tieB += 1;
    const t = team === 0 ? state.tieA : state.tieB;
    const o = team === 0 ? state.tieB : state.tieA;
    if (t >= 7 && t - o >= 2) {
      state.gameA = team === 0 ? 7 : 6;
      state.gameB = team === 0 ? 6 : 7;
      return winSet(state, team);
    }
    return state;
  }

  const pKey = team === 0 ? 'pointA' : 'pointB';
  const oKey = team === 0 ? 'pointB' : 'pointA';
  if (
    (state[pKey] >= 3 && state[oKey] >= 3) ||
    (state[pKey] >= 3 && state[oKey] < 3)
  ) {
    return winGame(state, team);
  }
  state[pKey] += 1;
  return state;
}

function winGame(state: ScoreState, team: TeamIndex): ScoreState {
  if (team === 0) state.gameA += 1;
  else state.gameB += 1;
  state.pointA = 0;
  state.pointB = 0;
  state.servingTeam = otherTeam(state.servingTeam);

  const lead = team === 0 ? state.gameA : state.gameB;
  const trail = team === 0 ? state.gameB : state.gameA;
  if (state.gameA >= 6 && state.gameB >= 6 && state.gameA === state.gameB) {
    state.isTieBreak = true;
    state.tieA = 0;
    state.tieB = 0;
    return state;
  }
  if ((lead >= 6 && lead - trail >= 2) || (lead === 7 && trail === 5)) {
    return winSet(state, team);
  }
  return state;
}

function winSet(state: ScoreState, team: TeamIndex): ScoreState {
  state.sets = [...state.sets, { a: state.gameA, b: state.gameB }];
  if (team === 0) state.setA += 1;
  else state.setB += 1;
  state.gameA = 0;
  state.gameB = 0;
  state.pointA = 0;
  state.pointB = 0;
  state.isTieBreak = false;
  state.tieA = 0;
  state.tieB = 0;
  if (state.setA >= 2 || state.setB >= 2) {
    state.winnerTeam = state.setA > state.setB ? 0 : 1;
  }
  return state;
}

export function applyScoreAction(
  input: ScoreState,
  kind: ScoreKind,
  team: TeamIndex,
): ScoreState {
  const state = clone(input);
  if (state.winnerTeam != null) return state;
  if (kind === 'ACE') {
    if (team === 0) state.aceA += 1;
    else state.aceB += 1;
    return applyPoint(state, team);
  }
  if (kind === 'WINNER') {
    if (team === 0) state.winnersA += 1;
    else state.winnersB += 1;
    return applyPoint(state, team);
  }
  if (kind === 'ERROR') {
    if (team === 0) state.errorsA += 1;
    else state.errorsB += 1;
    return applyPoint(state, otherTeam(team));
  }
  return applyPoint(state, team);
}

export function pointLabel(value: number) {
  return POINT_LABEL[Math.min(Math.max(value, 0), 3)] || '0';
}

export function formatSets(sets: SetScore[]) {
  if (!sets.length) return '';
  return sets.map((s) => `${s.a}-${s.b}`).join(', ');
}

export function formatMatchScore(state: ScoreState) {
  const parts = (state.sets || []).map((s) => `${s.a}-${s.b}`);
  if ((state.gameA || state.gameB) && state.winnerTeam == null) {
    parts.push(`${state.gameA}-${state.gameB}`);
  }
  return parts.join(', ');
}

export function eventBanner(
  state: ScoreState,
  teamNames: [string, string],
): string | null {
  if (state.winnerTeam != null) {
    return `Match over • ${teamNames[state.winnerTeam]}`;
  }
  const check = (team: TeamIndex) => {
    const names = teamNames[team];
    const winsMatch =
      wouldWinGame(state, team) &&
      (state.isTieBreak
        ? wouldWinTieBreak(state, team)
        : wouldWinSetFromGame(state, team)) &&
      (team === 0 ? state.setA : state.setB) >= 1;
    if (winsMatch && wouldWinGame(state, team)) {
      const setWin = state.isTieBreak
        ? wouldWinTieBreak(state, team)
        : wouldWinSetFromGame(state, team);
      if (setWin && (team === 0 ? state.setA : state.setB) >= 1) {
        return `Match Point • ${names}`;
      }
    }
    if (wouldWinGame(state, team)) {
      const setWin = state.isTieBreak
        ? wouldWinTieBreak(state, team)
        : wouldWinSetFromGame(state, team);
      if (setWin) return `Set Point • ${names}`;
      if (team !== state.servingTeam) return `Break Point • ${names}`;
      return `Game Point • ${names}`;
    }
    return null;
  };
  return check(0) || check(1);
}

export function publicScoreView(
  state: ScoreState,
  teamNames: [string, string] = ['Team A', 'Team B'],
) {
  return {
    ...state,
    pointsLabelA: state.isTieBreak ? String(state.tieA) : pointLabel(state.pointA),
    pointsLabelB: state.isTieBreak ? String(state.tieB) : pointLabel(state.pointB),
    setsLabel: formatMatchScore(state),
    event: eventBanner(state, teamNames),
    finished: state.winnerTeam != null,
  };
}

export function rankFromPoints(points: number) {
  return Math.floor(Math.max(0, points) / 100);
}

/** Official winner, or the team ahead when the slot ends. */
export function winnerFromScore(
  state: ScoreState,
  allowLead = false,
): TeamIndex | null {
  if (state.winnerTeam === 0 || state.winnerTeam === 1) return state.winnerTeam;
  if (!allowLead) return null;
  if (state.setA !== state.setB) return state.setA > state.setB ? 0 : 1;
  if (state.gameA !== state.gameB) return state.gameA > state.gameB ? 0 : 1;
  const ptsA = state.isTieBreak ? state.tieA : state.pointA;
  const ptsB = state.isTieBreak ? state.tieB : state.pointB;
  if (ptsA !== ptsB) return ptsA > ptsB ? 0 : 1;
  return null;
}
