import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Course } from '../core/model';
import { gradeDelta } from '../core/grades';
import { percent } from '../core/presentation';
import { levelLabel, levelBandLabel } from '../core/levels';
import { calculatedAverage } from '../core/model';
import { Heading } from './components';
import { Badge, GradeBar, GradeDelta } from './grade-visuals';
import { useTheme } from './theme';
import { useApp } from '../state/AppProvider';
import { GradeReveal } from './grade-reveal';

export function CourseCard({ course, previousAverage }: { course: Course; previousAverage?: number | null }) {
  const { colors } = useTheme();
  const { isGradeVisible, levelOverrides } = useApp();
  const visible = isGradeVisible(course.id);
  const estimated = calculatedAverage(course, levelOverrides[course.id]);
  const gradeLabel = course.reportedLevel ? levelLabel(course.reportedLevel) : percent(course.reportedAverage);
  const missing = course.assessments.filter(a => a.status === 'missing').length;
  const location = `P${course.period ?? '—'} - ${course.room ? 'Rm. ' + course.room : 'Room unavailable'}`;
  return <View style={[styles.course, { borderColor: colors.border, backgroundColor: colors.card }]}>
    <Link href={{ pathname: '/course/[id]', params: { id: course.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${course.code}, ${course.name}. ${course.teacher ?? 'Teacher unavailable'}. ${location}. ${visible ? 'Reported grade ' + gradeLabel : 'Grades hidden'}. Open assessments.`}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, gap: 12 })}>
        <View style={[styles.stripe, { backgroundColor: colors.accent }]} />
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>{course.code} - {course.teacher ?? 'Teacher unavailable'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{location}</Text>
        </View>
        <View style={[styles.row, { alignItems: 'flex-start', flexWrap: 'wrap' }]}>
          <View style={{ flex: 1, minWidth: 130 }}><Heading>{course.name}</Heading></View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}><Text style={[styles.grade, { color: colors.accent }]}>{!visible ? 'Hidden' : course.reportedLevel ? levelLabel(course.reportedLevel) : course.reportedAverage === null ? '—' : percent(course.reportedAverage)}</Text>
            {visible && course.reportedLevel ? <Text style={{ color: colors.muted, fontSize: 11 }}>
              {levelBandLabel(course.reportedLevel)} · official range
            </Text> : null}
            {visible && !course.reportedLevel ? <GradeDelta value={gradeDelta(course.reportedAverage, previousAverage)} /> : null}
          </View>
        </View>
        {visible && !course.reportedLevel ? <GradeBar value={course.reportedAverage} label={`${course.name} reported grade`} /> : null}
        {visible && course.reportedLevel && estimated !== null ?
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            ~{percent(estimated)} estimated from available assessments
          </Text> : null}
        {visible && missing > 0 ? <Badge label={`${missing} missing`} alert /> : null}
      </Pressable>
    </Link>
    <GradeReveal id={course.id} label="Show course grades" />
  </View>;
}
export function LunchBar() {
  const { colors } = useTheme();
  return <View accessibilityLabel="Lunch" style={[styles.lunch, { borderColor: colors.border, backgroundColor: colors.card }]}>
    <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>Lunch</Text>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  course: { borderWidth: 1, borderRadius: 20, padding: 18, paddingLeft: 22, gap: 12 },
  lunch: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, borderWidth: 1, borderRadius: 16 },
  stripe: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 4, borderRadius: 3 },
  grade: { fontSize: 27, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
