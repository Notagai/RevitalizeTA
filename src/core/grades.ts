import type { Course } from './model.ts';

export function categoryAverage(course: Course, categoryId: string): number | null {
  const entries = course.assessments.filter(a => a.category === categoryId && a.status === 'graded' && a.weight > 0);
  const weight = entries.reduce((sum, a) => sum + a.weight, 0);
  return weight ? entries.reduce((sum, a) => sum + a.earned! / a.possible * 100 * a.weight, 0) / weight : null;
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
