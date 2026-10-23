import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureSnapshot, timetableFixtureSnapshot } from '../src/core/fixtures.ts';
import { parseSnapshot } from '../src/core/model.ts';
import { coursesForSemester, courseSemester } from '../src/core/timetable.ts';
import { gradeSummary } from '../src/core/grades.ts';

const time = '2026-10-23T12:00:00.000Z';
test('both demo semesters contain five distinct courses in timetable order, with no lunch grades', () => {
  const snapshot = timetableFixtureSnapshot(time);
  assert.equal(snapshot.courses.length, 10);
  for (const semester of [1, 2]) {
    const courses = coursesForSemester([...snapshot.courses].reverse(), semester);
    assert.equal(courses.length, 5);
    assert.deepEqual(courses.map(c => c.period), [1, 2, 3, 4, 5]);
    assert.ok(courses.every(c => c.semester === semester && c.name !== 'Lunch'));
  }
  const first = coursesForSemester(snapshot.courses, 1);
  assert.equal(gradeSummary(first).average, (85 + 82 + 94 + 89) / 4);
  assert.equal(gradeSummary(first).reportedCount, 4);
  assert.equal(gradeSummary(coursesForSemester(snapshot.courses, 2)).reportedCount, 5);
});

test('legacy snapshots remain readable and use their semester labels', () => {
  const snapshot = fixtureSnapshot(time);
  assert.equal(coursesForSemester(snapshot.courses, 1).length, 2);
  assert.equal(coursesForSemester(snapshot.courses, 2).length, 0);
  assert.equal(courseSemester({ ...snapshot.courses[0], term: 'Synthetic semester 2' }), 2);
  assert.equal(courseSemester({ ...snapshot.courses[0], semester: 2 }), 2);
  assert.deepEqual(coursesForSemester([], 1), []);
});

test('semester and period metadata survive storage validation and reject invalid values', () => {
  const snapshot = timetableFixtureSnapshot(time);
  assert.deepEqual(parseSnapshot(snapshot), snapshot);
  for (const semester of [0, 3, '1', null]) {
    const invalid = structuredClone(snapshot); invalid.courses[0].semester = semester;
    assert.throws(() => parseSnapshot(invalid), /INVALID_SNAPSHOT/);
  }
  for (const period of [0, 6, 1.5, '1', null]) {
    const invalid = structuredClone(snapshot); invalid.courses[0].period = period;
    assert.throws(() => parseSnapshot(invalid), /INVALID_SNAPSHOT/);
  }
});
