import {
  applyPoint,
  emptyScore,
  pointsLabels,
  publicScoreView,
} from './padel-score';

describe('padel-score deuce / advantage', () => {
  it('progresses 0 → 15 → 30 → 40', () => {
    let s = emptyScore();
    s = applyPoint(s, 0);
    expect(pointsLabels(s)).toEqual(['15', '0']);
    s = applyPoint(s, 0);
    expect(pointsLabels(s)).toEqual(['30', '0']);
    s = applyPoint(s, 0);
    expect(pointsLabels(s)).toEqual(['40', '0']);
  });

  it('wins from 40 when opponent is below 40', () => {
    let s = emptyScore();
    s.pointA = 3;
    s.pointB = 2;
    s = applyPoint(s, 0);
    expect(s.gameA).toBe(1);
    expect(s.pointA).toBe(0);
    expect(s.pointB).toBe(0);
  });

  it('goes to Deuce at 40–40', () => {
    let s = emptyScore();
    s.pointA = 3;
    s.pointB = 2;
    s = applyPoint(s, 1);
    expect(s.pointA).toBe(3);
    expect(s.pointB).toBe(3);
    expect(pointsLabels(s)).toEqual(['Deuce', 'Deuce']);
    expect(publicScoreView(s).event).toBe('Deuce');
  });

  it('gives Advantage from deuce, then game', () => {
    let s = emptyScore();
    s.pointA = 3;
    s.pointB = 3;
    s = applyPoint(s, 0);
    expect(pointsLabels(s)).toEqual(['Ad', '40']);
    expect(publicScoreView(s).event).toContain('Advantage');
    s = applyPoint(s, 0);
    expect(s.gameA).toBe(1);
    expect(s.pointA).toBe(0);
    expect(s.pointB).toBe(0);
  });

  it('returns to Deuce when advantage is lost', () => {
    let s = emptyScore();
    s.pointA = 4;
    s.pointB = 3;
    s = applyPoint(s, 1);
    expect(s.pointA).toBe(3);
    expect(s.pointB).toBe(3);
    expect(pointsLabels(s)).toEqual(['Deuce', 'Deuce']);
  });
});
