import { parseSnapshot, type Snapshot } from './model.ts';

export function fixtureSnapshot(checkedAt: string, changed = false): Snapshot {
  return parseSnapshot({ version: 1, source: 'synthetic', checkedAt, courses: [
    { id: 'demo-math', code: 'MHF4U', name: 'Advanced Functions', term: 'Synthetic semester 1', reportedAverage: changed ? 87 : 85,
      categories: [{ id: 'K', name: 'Knowledge', weight: 30 }, { id: 'T', name: 'Thinking', weight: 25 }, { id: 'C', name: 'Communication', weight: 20 }, { id: 'A', name: 'Application', weight: 25 }],
      assessments: [
        { id: 'polynomial', name: 'Polynomial functions', category: 'K', earned: changed ? 27 : 25, possible: 30, weight: 2, status: 'graded' },
        { id: 'reasoning', name: 'Reasoning task', category: 'T', earned: 18, possible: 20, weight: 1, status: 'graded' },
        { id: 'explanation', name: 'Written explanation', category: 'C', earned: null, possible: 10, weight: 1, status: 'ungraded' },
        { id: 'model', name: 'Modelling task', category: 'A', earned: null, possible: 20, weight: 1, status: 'exempt' },
        { id: 'practice', name: 'Practice reflection', category: 'C', earned: null, possible: 10, weight: 1, status: 'missing' },
      ] },
    { id: 'demo-english', code: 'ENG4U', name: 'English', term: 'Synthetic semester 1', reportedAverage: null,
      categories: [{ id: 'coursework', name: 'Coursework', weight: 100 }], assessments: [] },
  ] });
}

/** Five synthetic courses per semester. Lunch is a UI timetable row, never a course. */
export function timetableFixtureSnapshot(checkedAt: string, changed = false): Snapshot {
  const base = fixtureSnapshot(checkedAt, changed);
  const extra = [
    { id: 'demo-physics', code: 'SPH4U', name: 'Physics', semester: 1, period: 3, grade: 82 },
    { id: 'demo-computing', code: 'ICS4U', name: 'Computer Science', semester: 1, period: 4, grade: 94 },
    { id: 'demo-art', code: 'AVI4M', name: 'Visual Arts', semester: 1, period: 5, grade: 89 },
    { id: 'demo-calculus', code: 'MCV4U', name: 'Calculus and Vectors', semester: 2, period: 1, grade: 88 },
    { id: 'demo-chemistry', code: 'SCH4U', name: 'Chemistry', semester: 2, period: 2, grade: 84 },
    { id: 'demo-biology', code: 'SBI4U', name: 'Biology', semester: 2, period: 3, grade: 91 },
    { id: 'demo-business', code: 'BBB4M', name: 'International Business', semester: 2, period: 4, grade: 86 },
    { id: 'demo-health', code: 'PPL4O', name: 'Healthy Active Living', semester: 2, period: 5, grade: 95 },
  ].map(item => ({
    id: item.id, code: item.code, name: item.name, semester: item.semester, period: item.period,
    term: `Synthetic semester ${item.semester}`, reportedAverage: item.grade,
    categories: [{ id: 'coursework', name: 'Coursework', weight: 100 }],
    assessments: [{ id: `${item.id}-task`, name: 'Coursework task', category: 'coursework', earned: item.grade, possible: 100, weight: 1, status: 'graded' }],
  }));
  return parseSnapshot({ ...base, courses: [
    { ...base.courses[0], semester: 1, period: 1 },
    { ...base.courses[1], semester: 1, period: 2 },
    ...extra,
  ] });
}
