import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../state/AppProvider';
import { calculatedAverage } from '../../core/model';
import { categoryAverage } from '../../core/grades';
import { percent } from '../../core/presentation';
import { Body, Card, Heading, Page } from '../../ui/components';
import { Badge, Eyebrow, GradeBar, GradeRing } from '../../ui/grade-visuals';
import { useTheme } from '../../ui/theme';

const filters = ['All', 'Graded', 'Missing', 'Pending'] as const;
export default function CourseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sync, ready } = useApp();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  const course = sync.snapshot?.courses.find(c => c.id === id);
  const assessments = course?.assessments.filter(a => filter === 'All' || (filter === 'Graded' && a.status === 'graded') || (filter === 'Missing' && a.status === 'missing') || (filter === 'Pending' && a.status === 'ungraded')) ?? [];
  return <Page>
    {!course ? <Card><Heading>{ready ? 'Course unavailable' : 'Loading saved courses…'}</Heading><Body>This course may have been removed or local demo data may have been deleted.</Body><Link href="/" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16 }}>Back to Dashboard</Link></Card> : <>
      <View style={{ gap: 8 }}><Badge label={course.code} /><Heading>{course.name}</Heading><Body muted>{course.term} · Synthetic demo</Body></View>
      <Card>
        <View style={styles.summary}><GradeRing value={course.reportedAverage} label="reported grade" /><View style={{ flex: 1, minWidth: 125, gap: 8 }}><Eyebrow>App estimate</Eyebrow><Text style={[styles.estimate, { color: colors.accent }]}>{percent(calculatedAverage(course))}</Text><Body muted>Category-weighted, using graded assessments only.</Body></View></View>
        <Body muted>The reported grade and app estimate can differ. Missing, ungraded, and exempt marks are excluded; empty categories are omitted and remaining category weights are renormalized.</Body>
      </Card>
      <Card><Heading>Category breakdown</Heading><Body muted>Your performance in each category. Bars show grades; weight is the category’s share of the course.</Body>
        {!course.categories.length ? <Body muted>No categories available.</Body> : null}
        {course.categories.map(cat => {
          const average = categoryAverage(course, cat.id);
          return <View key={cat.id} style={{ gap: 8, paddingVertical: 5 }}><View style={styles.row}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{cat.name}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{cat.weight}% course weight</Text></View><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 18 }}>{average === null ? 'No marks' : percent(average)}</Text></View><GradeBar value={average} label={`${cat.name} grade`} /></View>;
        })}
      </Card>
      <View style={styles.row}><Heading>Assessments</Heading><Badge label={`${course.assessments.length} total`} /></View>
      <View style={styles.filters}>{filters.map(value => {
        const count = course.assessments.filter(a => value === 'All' || (value === 'Graded' && a.status === 'graded') || (value === 'Missing' && a.status === 'missing') || (value === 'Pending' && a.status === 'ungraded')).length;
        return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)}
          style={[styles.filter, { backgroundColor: filter === value ? colors.tint : colors.card, borderColor: filter === value ? colors.accent : colors.border }]}><Text style={{ color: filter === value ? colors.accent : colors.muted, fontWeight: '600', fontSize: 12 }}>{value} · {count}</Text></Pressable>;
      })}</View>
      {!assessments.length ? <Card><Body muted>{course.assessments.length ? 'No assessments match this filter.' : 'No assessments yet. Grades will appear here when available.'}</Body></Card> : null}
      {assessments.map(a => {
        const grade = a.status === 'graded' ? a.earned! / a.possible * 100 : null;
        return <Card key={a.id}><View style={[styles.row, { alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 5 }}><Text accessibilityRole="header" style={{ color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 23 }}>{a.name}</Text><Body muted>{course.categories.find(cat => cat.id === a.category)?.name} · Weight {a.weight}</Body></View>
          {grade !== null ? <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{percent(grade)}</Text> : <Badge label={a.status === 'ungraded' ? 'Pending' : a.status === 'missing' ? 'Missing' : 'Exempt'} alert={a.status === 'missing'} />}
        </View>
          {grade !== null ? <><GradeBar value={grade} label={a.name} /><Body muted>{a.earned} / {a.possible} points{a.weight === 0 ? ' · Zero weight; excluded from estimate' : ''}</Body></> : <Body muted>{a.status === 'missing' ? 'Review this assessment. Excluded from the estimate.' : a.status === 'exempt' ? 'Exempt; excluded from the estimate.' : 'Awaiting a mark; excluded from the estimate.'}</Body>}
        </Card>;
      })}
    </>}
  </Page>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 22 },
  estimate: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
});
