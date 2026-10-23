import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../state/AppProvider';
import { gradeBands, gradeSummary } from '../../core/grades';
import { percent, timestamp } from '../../core/presentation';
import { Body, Card, Heading, Page } from '../../ui/components';
import { Badge, GradeBar, Metric } from '../../ui/grade-visuals';
import { GradeReveal } from '../../ui/grade-reveal';
import { useTheme } from '../../ui/theme';

export default function Analytics() {
  const { sync, privacyMode, isGradeVisible } = useApp();
  const { colors } = useTheme();
  const courses = sync.snapshot?.courses ?? [];
  const summary = gradeSummary(courses);
  const bands = gradeBands(courses);
  const allVisible = courses.every(course => isGradeVisible(course.id));
  const overallVisible = isGradeVisible('overall');
  return <Page><Heading>Analytics</Heading>
    {!courses.length ? <Card><Body muted>No grades available yet.</Body><Link href="/" style={[styles.link, { color: colors.accent }]}>Dashboard</Link></Card> : <>
      <View style={styles.metrics}>
        <Metric value={!overallVisible ? 'Hidden' : summary.average === null ? '—' : percent(summary.average)} label="Overall average" />
        <Metric value={!allVisible ? 'Hidden' : summary.pending} label="Awaiting marks" />
      </View>
      <GradeReveal id="overall" label="Show overall grades" />
      <Card><Heading>Course comparison</Heading>
        {courses.map(course => <View key={course.id} style={{ gap: 5 }}>
          <Link href={{ pathname: '/course/[id]', params: { id: course.id } }} asChild>
            <Pressable style={styles.chartLink} accessibilityRole="link"
              accessibilityLabel={`${course.name}: ${isGradeVisible(course.id) ? percent(course.reportedAverage) : 'grades hidden'}. Open course.`}>
              <View style={{ gap: 10, width: '100%' }}>
                <View style={styles.row}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{course.code}</Text>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 17 }}>
                    {isGradeVisible(course.id) ? percent(course.reportedAverage) : 'Hidden'}
                  </Text>
                </View>
                {isGradeVisible(course.id) ? <GradeBar value={course.reportedAverage} label={course.name} /> : null}
              </View>
            </Pressable>
          </Link>
          <GradeReveal id={course.id} label="Show course grades" />
        </View>)}
      </Card>
      {allVisible ? <>
        <Card><Heading>Grade distribution</Heading>
          {bands.map(band => <View key={band.label} accessible accessibilityLabel={`${band.label}: ${band.count} courses`} style={styles.bandRow}>
            <Text style={{ color: colors.muted, fontSize: 12, width: 78 }}>{band.label}</Text>
            <View style={{ flex: 1, height: 22, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.track }}>
              <View style={{ height: '100%', width: `${summary.reportedCount ? band.count / summary.reportedCount * 100 : 0}%`, backgroundColor: colors.bar, borderRadius: 6 }} />
            </View>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'right' }}>{band.count}</Text>
          </View>)}
        </Card>
        {([{ title: 'Highest grade', course: summary.strongest }, { title: 'Lowest grade', course: summary.lowest }]).map(item => item.course ? <Card key={item.title}>
          <Heading>{item.title}</Heading><Body>{item.course.name}</Body>
          <View style={styles.row}><Badge label={item.course.code} /><Text style={{ color: colors.accent, fontSize: 30, fontWeight: '700' }}>{percent(item.course.reportedAverage)}</Text></View>
        </Card> : null)}
      </> : <Card><Body muted>Distribution and rankings stay hidden until all courses are revealed.</Body></Card>}
    </>}
    <Card><Heading>Recent changes</Heading><Body muted>Last refreshed: {timestamp(sync.snapshot?.checkedAt ?? null)}</Body>
      {(!privacyMode || allVisible) && sync.changes.length ? sync.changes.map((change, i) =>
        <View key={`${change.courseId}-${i}`} style={[styles.change, { borderLeftColor: colors.accent }]}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{courses.find(c => c.id === change.courseId)?.code ?? 'Removed course'}</Text>
          <Body>{change.description}</Body>
        </View>) : <Body muted>{privacyMode && !allVisible ? 'Changes hidden in Privacy Mode.' : 'No changes from the latest refresh.'}</Body>}
    </Card>
  </Page>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  metrics: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 30 },
  chartLink: { paddingVertical: 12, width: '100%', minHeight: 48 },
  link: { paddingVertical: 14, fontSize: 15, fontWeight: '600', minHeight: 48 },
  change: { borderLeftWidth: 3, paddingLeft: 12, gap: 3, paddingVertical: 4 },
});
