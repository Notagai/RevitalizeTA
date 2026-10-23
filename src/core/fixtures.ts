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
