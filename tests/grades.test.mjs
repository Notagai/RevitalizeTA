import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryAverage, gradeBands, gradeSummary } from '../src/core/grades.ts';
import { fixtureSnapshot } from '../src/core/fixtures.ts';

const courses = () => fixtureSnapshot('2026-10-23T12:00:00.000Z').courses;

test('overview averages available reported grades equally, preserving zero and excluding unavailable marks', () => {
  const data = courses();
  assert.equal(gradeSummary(data).average, 85);
  assert.equal(gradeSummary(data).reportedCount, 1);
  data[1].reportedAverage = 0;
  assert.equal(gradeSummary(data).average, 42.5);
  assert.equal(gradeSummary(data).lowest.id, data[1].id);
  assert.equal(gradeSummary([]).average, null);
  assert.equal(gradeSummary([courses()[1]]).average, null);
});

test('assessment counts distinguish missing, pending, graded, and exempt', () => {
  const result = gradeSummary(courses());
  assert.equal(result.graded, 2);
  assert.equal(result.missing, 1);
  assert.equal(result.pending, 1);
});

test('category charts use assessment weights and never substitute zero for missing or ungraded marks', () => {
  const course = courses()[0];
  assert.equal(categoryAverage(course, 'K'), 25 / 30 * 100);
  assert.equal(categoryAverage(course, 'C'), null);
  assert.equal(categoryAverage(course, 'A'), null);
  course.assessments[0].earned = 0;
  assert.equal(categoryAverage(course, 'K'), 0);
  course.assessments[0].weight = 0;
  assert.equal(categoryAverage(course, 'K'), null);
  course.assessments.push({ ...course.assessments[1], id: 'another', earned: 10, weight: 3 });
  assert.equal(categoryAverage(course, 'T'), (90 + 50 * 3) / 4);
});

test('distribution assigns every grade to one band, including exact boundaries', () => {
  const data = [0, 49.9, 50, 59.9, 60, 69.9, 70, 79.9, 80, 100, null].map((grade, index) => ({ ...courses()[0], id: String(index), reportedAverage: grade }));
  assert.deepEqual(gradeBands(data).map(b => b.count), [2, 2, 2, 2, 2]);
  assert.deepEqual(gradeBands([]).map(b => b.count), [0, 0, 0, 0, 0]);
});
