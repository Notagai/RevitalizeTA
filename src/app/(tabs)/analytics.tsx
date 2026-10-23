import { useApp } from '../../state/AppProvider';
import { timestamp } from '../../core/presentation';
import { Body, Card, Heading, Page } from '../../ui/components';

export default function Analytics() {
  const { sync } = useApp();
  return <Page><Heading>Observed changes</Heading><Body muted>Synthetic data only. Changes describe what this app observed during the latest check, not when a teacher entered a mark.</Body>
    <Card><Body>Last verified demo check: {timestamp(sync.snapshot?.checkedAt ?? null)}</Body>
      {sync.status === 'changed' ? sync.changes.map((change, i) => <Body key={`${change.courseId}-${i}`}>{sync.snapshot?.courses.find(c => c.id === change.courseId)?.code ?? 'Removed course'}: {change.description}</Body>) : <Body>No change details for this check. Run a successful demo check to compare saved grades.</Body>}
    </Card><Card><Heading>History and what-if calculations</Heading><Body>Long-term history and hypothetical marks are planned after the core sync and storage flows are verified. Current change details reset on restart.</Body></Card>
  </Page>;
}
