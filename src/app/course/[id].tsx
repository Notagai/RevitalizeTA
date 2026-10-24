import { useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../state/AppProvider';
import { calculatedAverage } from '../../core/model';
import { assessmentSorts, gradeDelta, sortedAssignments, type AssessmentSort } from '../../core/grades';
import { courseSemester } from '../../core/timetable';
import { percent } from '../../core/presentation';
import { Action, BackButton, Body, Card, Heading } from '../../ui/components';
import { GradeDelta, GradeRing } from '../../ui/grade-visuals';
import { AssignmentCard } from '../../ui/assignment-card';
import { ChoiceChips } from '../../ui/choice-chips';
import { useTheme } from '../../ui/theme';
import { GradeReveal } from '../../ui/grade-reveal';

const filters = ['All', 'Graded', 'Missing', 'Pending', 'Exempt'] as const;
export default function CourseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sync, ready, isGradeVisible } = useApp();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  const [sort, setSort] = useState<AssessmentSort>('Newest');
  const course = sync.snapshot?.courses.find(c => c.id === id);
  const visible = !course || isGradeVisible(course.id);
  const assignments = useMemo(() => sortedAssignments(course?.assessments ?? [], sort).filter(assignment =>
    filter === 'All' || assignment.parts.some(a => a.status === (filter === 'Pending' ? 'ungraded' : filter.toLowerCase()))), [course, sort, filter]);
  const previousAverage = sync.snapshot?.comparison?.courses.find(c => c.id === id)?.reportedAverage;
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={visible ? assignments : []} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.page} initialNumToRender={8} windowSize={7}
      renderItem={({ item }) => course ? <AssignmentCard assignment={item} course={course} /> : null}
      ListHeaderComponent={<View style={{ gap: 16, marginBottom: 16 }}>
        <BackButton />
        {!course ? <Card><Heading>{ready ? 'Course unavailable' : 'Loading…'}</Heading><Body muted>This course is no longer available.</Body>
          <Link href="/" style={[styles.link, { color: colors.accent }]}>Dashboard</Link></Card> : <>
          <View style={{ gap: 5 }}>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{course.code} · {course.teacher ?? 'Teacher unavailable'} · {course.room ? 'Rm. ' + course.room : 'Room unavailable'}</Text>
            <Heading>{course.name}</Heading>
            <Body muted>Semester {courseSemester(course)} · Period {course.period ?? '—'}</Body>
          </View>
          {visible ? <>
          <Card>
            <View style={styles.summary}>
              <GradeRing value={course.reportedAverage} label="reported grade" />
              <View style={{ flex: 1, minWidth: 120, gap: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Estimated weighted average</Text>
                <Text style={[styles.estimate, { color: colors.accent }]}>{percent(calculatedAverage(course))}</Text>
                <GradeDelta value={gradeDelta(course.reportedAverage, previousAverage)} />
              </View>
            </View>
            <Link href={{ pathname: '/weights', params: { course: course.id } }} style={[styles.link, { color: colors.accent }]}>Course weights</Link>
          </Card>
          <Heading>Assessments</Heading>
          <ChoiceChips label="Assessment status" options={filters} value={filter} onChange={setFilter} />
          <ChoiceChips label="Sort assessments" options={assessmentSorts} value={sort} onChange={setSort} />
          {!course.assessments.some(a => a.date) && course.assessments.length > 0 && (sort === 'Newest' || sort === 'Oldest')
            ? <Body muted>Dates unavailable · showing name order</Body> : null}
          </> : <Card><Heading>Grades hidden</Heading>
            <Body muted>Privacy Mode is protecting the course marks and assessment details.</Body>
            <GradeReveal id={course.id} label="Show course grades" />
          </Card>}
        </>}
      </View>}
      ListEmptyComponent={course && visible ? <Card><Body muted>{course.assessments.length ? 'No assessments match this filter.' : 'No assessments yet.'}</Body></Card> : undefined}
      ListFooterComponent={visible && (sort !== 'Newest' || filter !== 'All') ? <View style={{ paddingTop: 16 }}><Action label="Reset sort and filters" onPress={() => { setSort('Newest'); setFilter('All'); }} /></View> : undefined}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center', gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  estimate: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  link: { minHeight: 48, paddingVertical: 14, fontSize: 15, fontWeight: '600' },
});
