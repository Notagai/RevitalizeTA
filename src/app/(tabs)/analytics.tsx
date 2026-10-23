import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../state/AppProvider';
import { gradeBands, gradeSummary } from '../../core/grades';
import { percent, timestamp } from '../../core/presentation';
import { Body, Card, Heading, Page } from '../../ui/components';
import { Badge, Eyebrow, GradeBar, Metric } from '../../ui/grade-visuals';
import { useTheme } from '../../ui/theme';

export default function Analytics() {
  const { sync } = useApp();
  const { colors } = useTheme();
  const courses = sync.snapshot?.courses ?? [];
  const summary = gradeSummary(courses);
  const bands = gradeBands(courses);
  return <Page>
    <View style={styles.row}><View style={{ gap: 4 }}><Eyebrow>The bigger picture</Eyebrow><Heading>Understand your grades.</Heading></View></View>
    <Body muted>A snapshot of your current demo grades. Charts show available reported marks, not historical trends.</Body>
    {!courses.length ? <Card><Heading>No grades to chart yet</Heading><Body muted>Load demo grades from Dashboard to see course comparisons and grade distribution.</Body><Link href="/" style={[styles.link, { color: colors.accent }]}>Go to Dashboard →</Link></Card> : <>
      <View style={styles.metrics}><Metric value={summary.average === null ? '—' : percent(summary.average)} label="Reported mean" /><Metric value={summary.pending} label="Awaiting marks" /></View>
      <Card><Heading>Course comparison</Heading><Body muted>Reported course averages on the same 0–100% scale.</Body>
        {courses.map(course => <Link key={course.id} href={{ pathname: '/course/[id]', params: { id: course.id } }} asChild><Pressable style={styles.chartLink} accessibilityRole="link" accessibilityLabel={`${course.name}: ${percent(course.reportedAverage)}. Open course breakdown.`}>
          <View style={{ gap: 10, width: '100%' }}><View style={styles.row}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{course.code}</Text><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 17, fontVariant: ['tabular-nums'] }}>{course.reportedAverage === null ? 'No grade' : percent(course.reportedAverage)}</Text></View><GradeBar value={course.reportedAverage} label={course.name} /></View>
        </Pressable></Link>)}
        <View style={styles.row}><Text style={{ color: colors.muted, fontSize: 11 }}>0%</Text><Text style={{ color: colors.muted, fontSize: 11 }}>50%</Text><Text style={{ color: colors.muted, fontSize: 11 }}>100%</Text></View>
      </Card>
      <Card><Heading>Grade distribution</Heading><Body muted>{summary.reportedCount} courses with reported grades · {courses.length - summary.reportedCount} without a grade</Body>
        {bands.map(band => <View key={band.label} accessible accessibilityLabel={`${band.label}: ${band.count} courses`} style={styles.bandRow}>
          <Text style={{ color: colors.muted, fontSize: 12, width: 78 }}>{band.label}</Text>
          <View style={{ flex: 1, height: 22, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.track }}>
            <View style={{ height: '100%', width: `${summary.reportedCount ? band.count / summary.reportedCount * 100 : 0}%`, backgroundColor: colors.bar, borderRadius: 6 }} />
          </View><Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'right' }}>{band.count}</Text>
        </View>)}
      </Card>
      {summary.strongest ? <Card><Eyebrow>Highest reported grade</Eyebrow><Heading>{summary.strongest.name}</Heading><View style={styles.row}><Badge label={summary.strongest.code} /><Text style={{ color: colors.accent, fontSize: 30, fontWeight: '700' }}>{percent(summary.strongest.reportedAverage)}</Text></View><Body muted>{summary.reportedCount === 1 ? 'This is the only course with a reported grade so far.' : 'Based on currently available reported course averages.'}</Body></Card> : null}
    </>}
    <Card><Heading>Observed changes</Heading><Body muted>Last verified demo check: {timestamp(sync.snapshot?.checkedAt ?? null)}</Body>
      {sync.status === 'changed' && sync.changes.length ? sync.changes.map((change, i) => <View key={`${change.courseId}-${i}`} style={[styles.change, { borderLeftColor: colors.accent }]}><Eyebrow>{sync.snapshot?.courses.find(c => c.id === change.courseId)?.code ?? 'Removed course'}</Eyebrow><Body>{change.description}</Body></View>) : <Body>No changes to show for this check. Run a successful demo check to compare saved grades.</Body>}
      <Body muted>These are changes observed by the app, not teacher entry times. Change details reset on restart; long-term history is not available yet.</Body>
    </Card>
  </Page>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metrics: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 30 },
  chartLink: { paddingVertical: 10, width: '100%' },
  link: { paddingVertical: 14, fontSize: 15, fontWeight: '600' },
  change: { borderLeftWidth: 3, paddingLeft: 12, gap: 3, paddingVertical: 4 },
});
