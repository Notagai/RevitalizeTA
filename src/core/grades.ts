import { assessmentPercent, estimatedCourseAverage, type Assessment, type Comparison, type Course, type LevelOverrides } from './model.ts';

export function gradeDelta(current: number | null, previous: number | null | undefined): number | null {
  return current === null || previous === null || previous === undefined ? null : current - previous;
}

/** Compare the same set of courses; additions/removals are not grade changes. */
export function averageDelta(courses: Course[], comparison?: Comparison): number | null {
  const reported = courses.filter(c => c.reportedAverage !== null);
  if (!comparison || !reported.length) return null;
  const old = new Map(comparison.courses.map(c => [c.id, c.reportedAverage]));
  if (old.size !== courses.length) return null;
  if (courses.some(c => !old.has(c.id) || (old.get(c.id) === null) !== (c.reportedAverage === null))) return null;
  return gradeSummary(courses).average! - reported.reduce((sum, c) => sum + old.get(c.id)!, 0) / reported.length;
}

/** Category-weighted estimates, combined using course credit weights. */
export function weightedAverage(courses: Course[], overrides: Readonly<Record<string, number>> = {},
  levelOverrides: Readonly<Record<string, LevelOverrides>> = {}): number | null {
  let total = 0, weights = 0;
  for (const course of courses) {
    const grade = estimatedCourseAverage(course, levelOverrides[course.id]);
    const weight = overrides[course.id] ?? course.credit ?? 1;
    if (grade !== null && Number.isFinite(weight) && weight > 0) { total += grade * weight; weights += weight; }
  }
  return weights ? total / weights : null;
}

export const assessmentSorts = ['Newest', 'Oldest', 'Highest grade', 'Lowest grade', 'Name', 'Weight'] as const;
export type AssessmentSort = typeof assessmentSorts[number];
export type Assignment = { id: string; name: string; date?: string; parts: Assessment[]; grade: number | null; weight: number };
export function sortedAssignments(assessments: Assessment[], sort: AssessmentSort, overrides: LevelOverrides = {}): Assignment[] {
  const groups = new Map<string, Assignment>();
  for (const assessment of assessments) {
    const id = assessment.assignmentId ?? assessment.id;
    let group = groups.get(id);
    if (!group) { group = { id, name: assessment.name, date: assessment.date, parts: [], grade: null, weight: 0 }; groups.set(id, group); }
    group.parts.push(assessment); group.weight += assessment.weight;
  }
  const assignments = [...groups.values()];
  for (const group of assignments) {
    const graded = group.parts.map(a => ({ a, score: assessmentPercent(a, overrides) }))
      .filter((p): p is { a: Assessment; score: number } => p.score !== null);
    const weights = graded.reduce((sum, p) => sum + (p.a.weight > 0 ? p.a.weight : 1), 0);
    group.grade = weights ? graded.reduce((sum, p) => sum + p.score * (p.a.weight > 0 ? p.a.weight : 1), 0) / weights : null;
  }
  return assignments.sort((a, b) => {
    let order = 0;
    if (sort === 'Highest grade' || sort === 'Lowest grade') {
      if ((a.grade === null) !== (b.grade === null)) return a.grade === null ? 1 : -1;
      order = ((a.grade ?? 0) - (b.grade ?? 0)) * (sort === 'Highest grade' ? -1 : 1);
    } else if (sort === 'Newest' || sort === 'Oldest') {
      if (!!a.date !== !!b.date) return a.date ? -1 : 1;
      order = (a.date ?? '').localeCompare(b.date ?? '') * (sort === 'Newest' ? -1 : 1);
    } else if (sort === 'Weight') order = b.weight - a.weight;
    return order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

export function categoryAverage(course: Course, categoryId: string, overrides: LevelOverrides = {}): number | null {
  const entries = course.assessments.filter(a => a.category === categoryId && a.weight > 0)
    .map(a => ({ a, score: assessmentPercent(a, overrides) }))
    .filter((entry): entry is { a: Assessment; score: number } => entry.score !== null);
  const weight = entries.reduce((sum, entry) => sum + (entry.a.weight > 0 ? entry.a.weight : 1), 0);
  return weight ? entries.reduce((sum, entry) => sum + entry.score * (entry.a.weight > 0 ? entry.a.weight : 1), 0) / weight : null;
}

export function gradeSummary(courses: Course[]) {
  const reported = courses.filter((c): c is Course & { reportedAverage: number } => c.reportedAverage !== null);
  const assessments = courses.flatMap(c => c.assessments);
  return {
    average: reported.length ? reported.reduce((sum, c) => sum + c.reportedAverage, 0) / reported.length : null,
    reportedCount: reported.length,
    graded: assessments.filter(a => a.status === 'graded').length,
    missing: assessments.filter(a => a.status === 'missing').length,
    pending: assessments.filter(a => a.status === 'ungraded').length,
    strongest: reported.reduce<(Course & { reportedAverage: number }) | null>((best, c) => !best || c.reportedAverage > best.reportedAverage ? c : best, null),
    lowest: reported.reduce<(Course & { reportedAverage: number }) | null>((lowest, c) => !lowest || c.reportedAverage < lowest.reportedAverage ? c : lowest, null),
  };
}

export function gradeBands(courses: Course[]) {
  return [
    { label: '80–100%', min: 80, max: 101 },
    { label: '70–79%', min: 70, max: 80 },
    { label: '60–69%', min: 60, max: 70 },
    { label: '50–59%', min: 50, max: 60 },
    { label: 'Below 50%', min: 0, max: 50 },
  ].map(band => ({ ...band, count: courses.filter(c => c.reportedAverage !== null && c.reportedAverage >= band.min && c.reportedAverage < band.max).length }));
}

/** A mixed percentage-and-level average is necessarily an estimate. */
export function estimatedOverallAverage(courses: Course[],
  overrides: Readonly<Record<string, LevelOverrides>> = {}): number | null {
  const grades = courses.map(course => estimatedCourseAverage(course, overrides[course.id]))
    .filter((grade): grade is number => grade !== null);
  return grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
}
export function estimatedCourseCount(courses: Course[], overrides: Readonly<Record<string, LevelOverrides>> = {}) {
  return courses.filter(course => estimatedCourseAverage(course, overrides[course.id]) !== null).length;
}
