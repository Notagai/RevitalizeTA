import { memo } from 'react';
import { Text, View } from 'react-native';
import type { Assignment } from '../core/grades';
import type { Course } from '../core/model';
import { percent } from '../core/presentation';
import { Body, Card, Heading } from './components';
import { Badge, GradeBar } from './grade-visuals';
import { useTheme } from './theme';

export const AssignmentCard = memo(function AssignmentCard({ assignment, course }: { assignment: Assignment; course: Course }) {
  const { colors } = useTheme();
  return <Card>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 130, gap: 4 }}><Heading>{assignment.name}</Heading>
        {assignment.date ? <Text style={{ color: colors.muted, fontSize: 12 }}>{assignment.date}</Text> : null}</View>
      {assignment.grade !== null ? <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700' }}>{percent(assignment.grade)}</Text>
        : <Badge label={assignment.parts.some(a => a.status === 'missing') ? 'Missing' : assignment.parts.every(a => a.status === 'exempt') ? 'Exempt' : 'Pending'} alert={assignment.parts.some(a => a.status === 'missing')} />}
    </View>
    {assignment.parts.map(part => <View key={part.id} style={{ gap: 2 }}>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{course.categories.find(c => c.id === part.category)?.name} · Weight {part.weight}</Text>
      <Body>{part.earned === null ? '—' : part.earned} / {part.possible || '—'} points{part.status !== 'graded' ? ` · ${part.status === 'ungraded' ? 'Pending' : part.status === 'missing' ? 'Missing' : 'Exempt'}` : ''}</Body>
    </View>)}
    <GradeBar value={assignment.grade} label={assignment.name} />
  </Card>;
});
