import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../state/AppProvider';
import { gradeSummary } from '../../core/grades';
import { coursesForSemester, type Semester } from '../../core/timetable';
import { Body, Card, Heading, Page } from '../../ui/components';
import { CourseCard, LunchBar } from '../../ui/course-card';
import { Badge, Eyebrow, GradeRing, Metric } from '../../ui/grade-visuals';
import { useTheme } from '../../ui/theme';

export default function Dashboard() {
  const { sync, ready } = useApp();
  const { colors } = useTheme();
  const [semester, setSemester] = useState<Semester>(1);
  const courses = coursesForSemester(sync.snapshot?.courses ?? [], semester);
  const summary = gradeSummary(courses);
  return <Page>
    <View style={styles.row}><View style={{ flex: 1, gap: 4 }}><Eyebrow>Your academic snapshot</Eyebrow><Heading>Grades at a glance.</Heading></View><Badge label="DEMO" /></View>
    <View accessibilityRole="tablist" accessibilityLabel="Semester" style={[styles.semesters, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {([1, 2] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={`Semester ${value}`} accessibilityState={{ selected: semester === value }} aria-selected={semester === value}
        onPress={() => setSemester(value)} style={({ pressed }) => [styles.semester, { backgroundColor: semester === value ? colors.tint : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: semester === value ? colors.accent : colors.muted, fontSize: 14, fontWeight: semester === value ? '700' : '500' }}>Semester {value}</Text>
      </Pressable>)}
    </View>
    <View style={[styles.hero, { backgroundColor: colors.hero }]}>
      <View style={styles.heroRow}>
        <View style={{ flex: 1, minWidth: 120, gap: 9 }}><Eyebrow inverse>Semester {semester} average</Eyebrow>
          <Text style={[styles.heroTitle, { color: colors.onHero }]}>{summary.average === null ? 'A clearer view\nof your progress.' : 'Your progress,\nin focus.'}</Text>
          <Text style={{ color: colors.heroMuted, fontSize: 12, lineHeight: 18 }}>{courses.length ? `${summary.reportedCount} of ${courses.length} courses with a reported grade` : 'Load demo grades using the notice above.'}</Text>
        </View><GradeRing value={summary.average} inverse />
      </View>
      <View style={[styles.heroFooter, { borderTopColor: colors.heroMuted + '40' }]}>
        <Text style={{ color: colors.heroMuted, fontSize: 11, lineHeight: 17 }}>Equal-weight mean of reported grades · Lunch excluded</Text>
      </View>
    </View>
    <View style={styles.metrics}><Metric value={courses.length} label="Courses" /><Metric value={summary.graded} label="Graded" /><Metric value={summary.missing} label="Missing" alert={summary.missing > 0} /></View>
    <View style={styles.row}><Heading>Your timetable</Heading><Eyebrow>Semester {semester}</Eyebrow></View>
    {!sync.snapshot ? <Body muted>{ready ? 'Tap Load in the notice above to explore five demo courses per semester.' : 'Reading saved grades…'}</Body> : !courses.length ? <Card><Heading>No courses for this semester</Heading><Body muted>{sync.snapshot.courses.length ? 'Switch semesters to see your available courses.' : 'Choose a different demo scenario in Settings, then tap Refresh above.'}</Body></Card> : courses.map((course, index) => <Fragment key={course.id}>
      <CourseCard course={course} period={course.period ?? index + 1} />
      {index === 1 ? <LunchBar /> : null}
    </Fragment>)}
    {courses.length === 1 ? <LunchBar /> : null}
    {summary.missing > 0 ? <View style={[styles.notice, { backgroundColor: colors.tint, borderColor: colors.border }]}><Body>{summary.missing} missing assessment{summary.missing === 1 ? '' : 's'} to review. Open a course to see details.</Body><Body muted>Missing marks are excluded from estimates.</Body></View> : null}
  </Page>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  semesters: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 4, gap: 4 },
  semester: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10 },
  hero: { borderRadius: 24, padding: 20, gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  heroTitle: { fontSize: 25, lineHeight: 31, fontWeight: '700', letterSpacing: -0.8 },
  heroFooter: { borderTopWidth: 1, paddingTop: 13 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  notice: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 3 },
});
