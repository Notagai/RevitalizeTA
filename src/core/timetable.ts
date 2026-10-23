import type { Course } from './model.ts';

export type Semester = 1 | 2;
/** Legacy snapshots store the semester in the term label. */
export function courseSemester(course: Course): Semester {
  return course.semester ?? (/semester\s*2\b/i.test(course.term) ? 2 : 1);
}
export function coursesForSemester(courses: Course[], semester: Semester) {
  return courses.filter(course => courseSemester(course) === semester)
    .sort((a, b) => (a.period ?? 6) - (b.period ?? 6));
}
