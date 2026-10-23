import { Link } from 'expo-router';
import { Pressable, RefreshControl, Text } from 'react-native';
import { useApp } from '../../state/AppProvider';
import { calculatedAverage } from '../../core/model';
import { percent } from '../../core/presentation';
import { Body, Card, Heading, Page, SyncCard } from '../../ui/components';
import { useTheme } from '../../ui/theme';

export default function Dashboard() {
  const { sync, ready, refresh } = useApp();
  const { colors } = useTheme();
  return <Page refreshControl={<RefreshControl refreshing={sync.status === 'checking'} onRefresh={() => { void refresh(); }} enabled={ready && sync.status !== 'deleting'} tintColor={colors.accent} colors={[colors.accent]} />}>
    <Heading>Your courses, clearly.</Heading>
    <Body muted>Explore synthetic grades and reliable check states. No school account is connected.</Body>
    <SyncCard />
    {sync.snapshot?.courses.length === 0 ? <Card><Heading>No courses returned</Heading><Body>The selected synthetic response contains an intentional empty course list. Choose another scenario in Settings to restore demo courses.</Body></Card> : null}
    {sync.snapshot?.courses.map(course => <Link key={course.id} href={{ pathname: '/course/[id]', params: { id: course.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${course.code}, ${course.name}. Reported demo average ${percent(course.reportedAverage)}. View assessments.`}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card><Body muted>{course.code} · {course.term}</Body><Heading>{course.name}</Heading>
          <Text style={{ fontSize: 32, fontWeight: '700', color: colors.accent }}>{percent(course.reportedAverage)}</Text>
          <Body>Reported in fixture</Body><Body muted>App-calculated estimate: {percent(calculatedAverage(course))}</Body><Body>View assessments →</Body>
        </Card>
      </Pressable>
    </Link>)}
  </Page>;
}
