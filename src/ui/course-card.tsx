import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Course } from '../core/model';
import { percent } from '../core/presentation';
import { Body, Heading } from './components';
import { Badge, GradeBar } from './grade-visuals';
import { GlassSurface } from './glass-surface';
import { useTheme } from './theme';

export function CourseCard({ course, period }: { course: Course; period: number }) {
  const { colors } = useTheme();
  const missing = course.assessments.filter(a => a.status === 'missing').length;
  const graded = course.assessments.filter(a => a.status === 'graded').length;
  return <Link href={{ pathname: '/course/[id]', params: { id: course.id } }} asChild>
    <Pressable accessibilityRole="link" accessibilityLabel={`Period ${period}. ${course.code}, ${course.name}. Reported demo average ${percent(course.reportedAverage)}. ${missing} missing assessments. View assessments.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
      <GlassSurface style={[styles.course, { borderColor: colors.border }]}>
        <View style={[styles.stripe, { backgroundColor: colors.accent }]} />
        <View style={styles.row}><Badge label={course.code} /><Text style={{ color: colors.muted, fontSize: 12 }}>Period {period} ↗</Text></View>
        <View style={[styles.row, { alignItems: 'flex-start', flexWrap: 'wrap' }]}>
          <View style={{ flex: 1, minWidth: 140, gap: 3 }}><Heading>{course.name}</Heading><Body muted>{graded} graded · {course.assessments.length} assessments</Body></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={[styles.grade, { color: colors.accent }]}>{course.reportedAverage === null ? '—' : percent(course.reportedAverage)}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{course.reportedAverage === null ? 'No grade yet' : 'Reported grade'}</Text></View>
        </View>
        <GradeBar value={course.reportedAverage} label={`${course.name} reported grade`} />
        <View style={[styles.row, { flexWrap: 'wrap' }]}>{missing ? <Badge label={`${missing} missing`} alert /> : <Body muted>{course.reportedAverage === null ? 'Waiting for marks' : course.term}</Body>}<Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>View breakdown →</Text></View>
      </GlassSurface>
    </Pressable>
  </Link>;
}

export function LunchBar() {
  const { colors } = useTheme();
  return <GlassSurface accessibilityLabel="Lunch" style={[styles.lunch, { borderColor: colors.border }]}>
    <View style={[styles.stripe, { backgroundColor: colors.accent, top: 12, bottom: 12 }]} />
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Lunch</Text>
  </GlassSurface>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  course: { borderWidth: 1, borderRadius: 20, padding: 18, paddingLeft: 22, gap: 12 },
  lunch: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 22, borderWidth: 1, borderRadius: 16 },
  stripe: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 4, borderRadius: 3 },
  grade: { fontSize: 27, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
