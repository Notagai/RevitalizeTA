import { memo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Assignment } from '../core/grades';
import type { Assessment, Course } from '../core/model';
import { levelBandLabel, levelLabel, levelRange, validLevelOverride } from '../core/levels';
import { percent } from '../core/presentation';
import { useApp } from '../state/AppProvider';
import { Action, Body, Card, Heading } from './components';
import { Badge, GradeBar } from './grade-visuals';
import { useTheme } from './theme';

function LevelGradeEditor({ course, part }: { course: Course; part: Assessment }) {
  const { colors } = useTheme();
  const { levelOverrides, setLevelAssignmentGrade } = useApp();
  const level = part.level!;
  const { midpoint, min, max } = levelRange(level);
  const saved = levelOverrides[course.id]?.[part.id];
  const [draft, setDraft] = useState(saved === undefined ? '' : String(saved));
  const parsed = Number(draft);
  const valid = draft.trim() !== '' && /^(?:\d{1,3}(?:\.\d{1,2})?)$/.test(draft.trim())
    && validLevelOverride(level, parsed);

  return <View style={{ gap: 8, paddingVertical: 6 }}>
    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
      {levelLabel(level)} · Official range {levelBandLabel(level)}
    </Text>
    <Body muted>{saved === undefined ? 'Using estimated midpoint ' + midpoint.toFixed(1) + '%.' :
      'Using your manually chosen ' + saved.toFixed(1) + '%. School record unchanged.'}</Body>
    <Text style={{ color: colors.muted, fontSize: 12 }}>
      Personal assignment estimate ({min}–{max}%). Editable for this session only.
    </Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <TextInput accessibilityLabel={'Estimated percentage for ' + part.name + ' ' + part.category}
        keyboardType="decimal-pad" inputMode="decimal" value={draft}
        onChangeText={setDraft} placeholder={'e.g. ' + midpoint.toFixed(1)}
        placeholderTextColor={colors.muted} maxLength={6}
        style={{ flex: 1, minWidth: 100, minHeight: 48, borderColor: draft && !valid ? colors.danger : colors.border,
          borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, color: colors.text }} />
      <Action label="Apply" disabled={!valid || saved === parsed}
        onPress={() => setLevelAssignmentGrade(course.id, part.id, parsed)} />
      {saved !== undefined ? <Action label="Reset" onPress={() => { setLevelAssignmentGrade(course.id, part.id, null); setDraft(''); }} /> : null}
    </View>
    {draft && !valid ? <Text style={{ color: colors.danger, fontSize: 12 }}>
      Enter a percentage from {min} to {max}.
    </Text> : null}
  </View>;
}

export const AssignmentCard = memo(function AssignmentCard({ assignment, course }: { assignment: Assignment; course: Course }) {
  const { colors } = useTheme();
  const containsLevel = assignment.parts.some(part => part.level);
  return <Card>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 130, gap: 4 }}><Heading>{assignment.name}</Heading>
        {assignment.date ? <Text style={{ color: colors.muted, fontSize: 12 }}>{assignment.date}</Text> : null}</View>
      {assignment.grade !== null ? <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700' }}>
          {containsLevel ? '~' : ''}{percent(assignment.grade)}
        </Text>
        {containsLevel ? <Text style={{ color: colors.muted, fontSize: 11 }}>Personal estimate</Text> : null}
      </View> : <Badge label={assignment.parts.some(a => a.status === 'missing') ? 'Missing' :
        assignment.parts.every(a => a.status === 'exempt') ? 'Exempt' : 'Pending'}
        alert={assignment.parts.some(a => a.status === 'missing')} />}
    </View>
    {assignment.parts.map(part => <View key={part.id} style={{ gap: 2 }}>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {course.categories.find(c => c.id === part.category)?.name ?? part.category} · Weight {part.weight}
      </Text>
      {part.level ? <LevelGradeEditor course={course} part={part} /> : <Body>
        {part.earned === null ? '—' : part.earned} / {part.possible || '—'} points
        {part.status !== 'graded' ? ' · ' + (part.status === 'ungraded' ? 'Pending' :
          part.status === 'missing' ? 'Missing' : 'Exempt') : ''}
      </Body>}
    </View>)}
    <GradeBar value={assignment.grade} label={(containsLevel ? 'Estimated ' : '') + assignment.name} />
  </Card>;
});
