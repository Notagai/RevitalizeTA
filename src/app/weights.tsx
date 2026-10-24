import { useCallback, useRef, type ComponentRef } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { categoryAverage } from '../core/grades';
import { courseSemester } from '../core/timetable';
import { percent } from '../core/presentation';
import { BackButton, Body, Card, Heading, Page } from '../ui/components';
import { CourseWeightEditor } from '../ui/course-weight-editor';
import { useTheme } from '../ui/theme';

export default function CourseWeights() {
  const { course: target } = useLocalSearchParams<{ course?: string }>();
  const { sync, courseWeights, setCourseWeight, isGradeVisible } = useApp();
  const { colors } = useTheme();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef(new Map<string, number>());
  const focused = useRef(false);
  const courses = [...(sync.snapshot?.courses ?? [])].sort((a, b) => courseSemester(a) - courseSemester(b) || (a.period ?? 6) - (b.period ?? 6));
  const scrollToTarget = useCallback(() => {
    if (!focused.current) return;
    const y = target ? offsets.current.get(target) : 0;
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 20), animated: false });
  }, [target]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const frame = requestAnimationFrame(scrollToTarget);
    return () => { focused.current = false; cancelAnimationFrame(frame); };
  }, [scrollToTarget]));
  return <Page scrollRef={scroll} onContentSizeChange={scrollToTarget}>
    <BackButton /><Heading>Course weights</Heading>
    {!courses.length ? <Card><Body muted>Course weights will appear when courses are available.</Body></Card> : null}
    {courses.map(course => <View key={course.id} onLayout={event => {
      offsets.current.set(course.id, event.nativeEvent.layout.y);
      if (target === course.id) scrollToTarget();
    }}>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{course.code} · Semester {courseSemester(course)}</Text>
        <Heading>{course.name}</Heading>
        <CourseWeightEditor key={`${course.id}:${courseWeights[course.id] ?? course.credit ?? 1}`} code={course.code}
          weight={courseWeights[course.id] ?? course.credit ?? 1} onSave={weight => setCourseWeight(course.id, weight)} />
        {!course.categories.length ? <Body muted>No category weights available.</Body> : course.categories.map(category => <View key={category.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.text, flex: 1, minWidth: 120, fontSize: 14 }}>{category.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{category.weight}% weight</Text>
          <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>{isGradeVisible(course.id) ? percent(category.reportedAverage ?? categoryAverage(course, category.id)) : 'Hidden'}</Text>
        </View>)}
      </Card>
    </View>)}
    {courses.length ? <Body muted>Course weights combine category estimates in the dashboard. Default: 1 per course when credits are unavailable. Zero excludes a course. Weights and grades last for this session.</Body> : null}
  </Page>;
}
