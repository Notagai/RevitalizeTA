import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, parseLevelMark, levelRange, levelBandLabel, validLevelOverride } from '../src/core/levels.ts';
import { assessmentPercent, calculatedAverage, estimatedCourseAverage, parseSnapshot } from '../src/core/model.ts';
import { categoryAverage, estimatedOverallAverage, sortedAssignments, weightedAverage } from '../src/core/grades.ts';
import { parseSchoolCourses, parseSchoolReport, schoolSnapshot } from '../src/core/school-parser.ts';
import { courseHTML, reportHTML, compactCourseHTML, loginHTML, credentials } from './fixtures/school-html.mjs';
import { fetchSchoolGrades } from '../src/core/direct-school.ts';

const checked = '2026-10-24T20:00:00.000Z';

test('Ministry level ranges are preserved, never mapped to a purported exact percentage', () => {
  assert.deepEqual(levelRange('4'), { min: 80, max: 100, midpoint: 90 });
  assert.deepEqual(levelRange('3'), { min: 70, max: 79, midpoint: 74.5 });
  assert.deepEqual(levelRange('2'), { min: 60, max: 69, midpoint: 64.5 });
  assert.deepEqual(levelRange('1'), { min: 50, max: 59, midpoint: 54.5 });
  assert.equal(levelBandLabel('4+'), '80–100%');
  assert.equal(parseLevel('Level: 4+'), '4+');
  assert.equal(parseLevel('Level 3-'), '3-');
  assert.equal(parseLevel('  4  '), '4');
  assert.equal(parseLevel('4/10'), null);
  assert.equal(parseLevel('85%'), null);
  assert.equal(parseLevelMark('current mark = 4+'), '4+');
  assert.equal(parseLevelMark('FINAL MARK: Level 3-'), '3-');
  assert.equal(validLevelOverride('4', 98), true);
  assert.equal(validLevelOverride('4', 79), false);
  assert.equal(validLevelOverride('3', 80), false);
  assert.equal(validLevelOverride('4', 100), true);
  assert.equal(validLevelOverride('4', Number.NaN), false);
});

test('overall Level 4 course grade is never mistaken for 4 percent', () => {
  for (const text of ['current mark = 4', 'current mark = 4+', 'Level: 4-', '4']) {
    const html = compactCourseHTML().replace('current mark = 94.5%', text);
    const course = parseSchoolCourses(html)[0];
    assert.equal(course.overall_mark, 'N/A');
    assert.equal(course.overall_level, text.includes('4+') ? '4+' : text.includes('4-') ? '4-' : '4');
    const snapshot = schoolSnapshot([{ ...course, assignments: [], weight_table: {} }], checked);
    assert.equal(snapshot.courses[0].reportedAverage, null);
    assert.equal(snapshot.courses[0].reportedLevel, course.overall_level);
    assert.equal(estimatedCourseAverage(snapshot.courses[0]), 90);
  }
  assert.equal(parseSchoolCourses(courseHTML(4))[0].overall_mark, 4); // explicitly published 4%
  assert.equal(parseSchoolCourses(courseHTML(4))[0].overall_level, undefined);
});

test('category-level assignments preserve Level labels and permit editable estimated percentages', () => {
  const levelReport = reportHTML
    .replace('16 / 20 = 80% weight=2', 'Level 4 weight=2')
    .replace('9 / 10 = 90% weight=1', 'Level 3+ weight=1');
  const parsed = parseSchoolReport(levelReport);
  assert.equal(parsed.assignments[0].KU[0].level, '4');
  assert.equal(parsed.assignments[0].T[0].level, '3+');
  const course = parseSchoolCourses(courseHTML(85))[0];
  const snapshot = schoolSnapshot([{ ...course, ...parsed }], checked);
  const c = snapshot.courses[0];
  const quiz = c.assessments.filter(a => a.name === 'Functions test');
  assert.equal(quiz.length, 2);
  assert.ok(quiz.every(a => a.status === 'graded' && a.possible === 0 && a.earned === null));
  assert.equal(assessmentPercent(quiz[0]), 90);
  assert.equal(assessmentPercent(quiz[1]), 74.5);
  assert.equal(calculatedAverage(c), (90 + 74.5) / 2);
  const manual = { [quiz[0].id]: 95, [quiz[1].id]: 76 };
  assert.equal(categoryAverage(c, 'KU', manual), 95);
  assert.equal(categoryAverage(c, 'T', manual), 76);
  assert.equal(calculatedAverage(c, manual), 85.5);
  assert.ok(Math.abs(sortedAssignments(c.assessments, 'Name', manual)[0].grade - ((95 * 2 + 76) / 3)) < 0.001);
  assert.equal(quiz[0].level, '4');
  assert.equal(quiz[0].earned, null);
  assert.equal(assessmentPercent(quiz[0], { [quiz[0].id]: 72 }), 90); // out-of-range ignored
  assert.throws(() => parseSnapshot({ ...snapshot, courses: [{ ...c, assessments: [{ ...quiz[0], level: '8' }] }] }));
});

test('assessment estimates override Level midpoint while course report stays unchanged', () => {
  const levelReport = reportHTML.replace('16 / 20 = 80% weight=2', '4 weight=2');
  const parsed = parseSchoolReport(levelReport);
  assert.equal(parsed.assignments[0].KU[0].level, '4');
  const course = parseSchoolCourses(courseHTML(85))[0];
  const c = schoolSnapshot([{ ...course, ...parsed }], checked).courses[0];
  const id = c.assessments.find(a => a.level)?.id;
  assert.ok(id);
  const original = estimatedCourseAverage(c);
  const overrides = { [id]: 99 };
  assert.notEqual(estimatedCourseAverage(c, overrides), original);
  assert.equal(c.reportedAverage, 85);
  assert.equal(weightedAverage([c], {}, { [c.id]: overrides }), estimatedCourseAverage(c, overrides));
  assert.equal(estimatedOverallAverage([c], { [c.id]: overrides }), estimatedCourseAverage(c, overrides));
});

test('a full native school flow handles a Level 4 overall mark and assessment levels', async () => {
  const levelCourses = compactCourseHTML().replace('current mark = 94.5%', 'current mark = 4');
  const levelReport = reportHTML.replace('16 / 20 = 80% weight=2', 'Level 4 weight=2');
  const mock = async (url, options) => {
    const html = String(url).includes('viewReport.php') ? levelReport :
      options.method === 'POST' ? levelCourses : loginHTML;
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  };
  const snapshot = await fetchSchoolGrades(credentials, new AbortController().signal, mock);
  const c = snapshot.courses[0];
  assert.equal(c.reportedLevel, '4');
  assert.equal(c.reportedAverage, null);
  assert.equal(c.assessments.find(a => a.level)?.level, '4');
  assert.equal(c.reportProblem, undefined);
});
