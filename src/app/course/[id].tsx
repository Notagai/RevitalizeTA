import { Link, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../state/AppProvider';
import { calculatedAverage } from '../../core/model';
import { percent } from '../../core/presentation';
import { Body, Card, Heading, Page, SyncCard } from '../../ui/components';
import { useTheme } from '../../ui/theme';

export default function CourseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sync, ready } = useApp();
  const { colors } = useTheme();
  const course = sync.snapshot?.courses.find(c => c.id === id);
  return <Page>
    <SyncCard />
    {!course ? <Card><Heading>{ready ? 'Course unavailable' : 'Loading saved courses…'}</Heading><Body>This course may have been removed or local demo data may have been deleted.</Body><Link href="/" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16 }}>Back to Dashboard</Link></Card> : <>
      <Heading>{course.name}</Heading><Body muted>{course.code} · {course.term}</Body>
      <Card><Heading>Grade summary</Heading><Body>Reported in fixture: {percent(course.reportedAverage)}</Body><Body>App-calculated estimate: {percent(calculatedAverage(course))}</Body>
        <Body muted>Only graded entries with positive assessment weights count. Empty categories are omitted and remaining category weights are renormalized. Missing and exempt entries are not zeros. Teacher calculations may differ.</Body>
      </Card>
      <Card><Heading>Category weights</Heading>{course.categories.map(cat => <Body key={cat.id}>{cat.name}: {cat.weight}%</Body>)}</Card>
      <Heading>Assessments</Heading>
      {!course.assessments.length ? <Body>No assessments returned in this fixture. No average can be calculated yet.</Body> : null}
      {course.assessments.map(a => <Card key={a.id}><Heading>{a.name}</Heading><Body muted>{course.categories.find(cat => cat.id === a.category)?.name} · Assessment weight {a.weight}</Body>
        <Body>{a.status === 'graded' ? `${a.earned} / ${a.possible} · ${percent(a.earned! / a.possible * 100)}` : a.status === 'missing' ? 'Missing · excluded from estimate' : a.status === 'exempt' ? 'Exempt · excluded from estimate' : 'Not yet graded'}</Body>
      </Card>)}
    </>}
  </Page>;
}
