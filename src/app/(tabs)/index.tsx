import { Fragment, useState } from 'react';
import { Link } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../state/AppProvider';
import { averageDelta, gradeSummary, weightedAverage } from '../../core/grades';
import { coursesForSemester, type Semester } from '../../core/timetable';
import { percent, syncMessage, timestamp } from '../../core/presentation';
import { Body, Card, Heading, Page } from '../../ui/components';
import { GradeDelta, GradeRing } from '../../ui/grade-visuals';
import { CourseCard, LunchBar } from '../../ui/course-card';
import { RefreshButton } from '../../ui/refresh-button';
import { GradeReveal } from '../../ui/grade-reveal';
import { SemesterToggle } from '../../ui/semester-toggle';
import { useTheme } from '../../ui/theme';
import { SCHOOL_LOGIN_ENABLED } from '../../core/integration';

export default function Dashboard() {
  const { sync, ready, displayName, courseWeights, signedIn, isGradeVisible } = useApp();
  const { colors } = useTheme();
  const [semester, setSemester] = useState<Semester>(1);
  const allCourses = sync.snapshot?.courses ?? [];
  const courses = coursesForSemester(allCourses, semester);
  const summary = gradeSummary(allCourses);
  const unreadableReports = allCourses.filter(course => course.reportProblem).length;
  const overallVisible = isGradeVisible('overall');
  const failed = !['never', 'checking', 'changed', 'unchanged'].includes(sync.status);
  return <Page>
    <View style={styles.welcome}>
      <Image source={require('../../../assets/images/logo.png')} accessibilityLabel="RevitalizeTA logo" style={styles.logo} resizeMode="contain" />
      <View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.muted, fontSize: 14 }}>Welcome{displayName ? ',' : ''}</Text>
        <Heading>{displayName || 'RevitalizeTA'}</Heading></View>
    </View>
    <View style={[styles.hero, { backgroundColor: colors.hero }]}>
      <View style={styles.heroRow}>
        {overallVisible ? <GradeRing value={summary.average} label="overall average" inverse /> :
          <View accessible accessibilityLabel="Overall average hidden" style={{ width: 136, height: 136, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.onHero, fontSize: 20, fontWeight: '700' }}>Hidden</Text>
          </View>}
        <View style={styles.heroInfo}>
          <Text style={{ color: colors.onHero, fontSize: 16, fontWeight: '600' }}>From {summary.reportedCount} {summary.reportedCount === 1 ? 'course' : 'courses'}</Text>
          {overallVisible ? <GradeDelta value={averageDelta(allCourses, sync.snapshot?.comparison)} inverse /> :
            <GradeReveal id="overall" label="Show overall grades" />}
          <Text style={{ color: colors.heroMuted, fontSize: 11, lineHeight: 17 }}>Last refreshed: {timestamp(sync.snapshot?.checkedAt ?? null)}</Text>
          <RefreshButton />
        </View>
      </View>
      <View style={[styles.weighted, { borderTopColor: colors.heroMuted + '40' }]}>
        <View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.heroMuted, fontSize: 12 }}>Weighted average</Text>
          <Text style={{ color: colors.heroMuted, fontSize: 11 }}>Category estimates · course weights</Text></View>
        <Text style={{ color: colors.onHero, fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{overallVisible ? percent(weightedAverage(allCourses, courseWeights)) : 'Hidden'}</Text>
      </View>
    </View>
    {failed ? <View accessibilityLiveRegion="polite"><Body>{syncMessage(sync)}</Body></View> : null}
    {unreadableReports ? <Card>
      <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '700' }}>Some assessment reports could not be imported</Text>
      <Body>{unreadableReports} {unreadableReports === 1 ? 'course has' : 'courses have'} an unsupported assessment format. Reported course grades remain available. Open each affected course for the exact safe diagnostic.</Body>
    </Card> : null}
    {!signedIn ? <Card><Heading>{SCHOOL_LOGIN_ENABLED ? 'Connect your account' : 'Account connection pending'}</Heading>
      <Body muted>{SCHOOL_LOGIN_ENABLED ? 'Sign in with your YRDSB TeachAssist account.' : 'Account connection is unavailable.'}</Body>
      <Link href="/sign-in" style={[styles.link, { color: colors.accent }]}>{SCHOOL_LOGIN_ENABLED ? 'Sign in' : 'Connection details'}</Link>
    </Card> : null}
    <Heading>Courses:</Heading>
    <SemesterToggle value={semester} onChange={setSemester} />
    {!courses.length ? <Card><Body muted>{!ready ? 'Loading…' : !sync.snapshot ? 'Your courses will appear after you connect your account.' : 'No courses in this semester.'}</Body></Card> : courses.map((course, index) => <Fragment key={course.id}>
      <CourseCard course={course} previousAverage={sync.snapshot?.comparison?.courses.find(c => c.id === course.id)?.reportedAverage} />
      {index === 1 ? <LunchBar /> : null}
    </Fragment>)}
    <Link href="/weights" style={[styles.link, { color: colors.accent }]}>Course weights</Link>
  </Page>;
}
const styles = StyleSheet.create({
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  logo: { width: 54, height: 54 },
  hero: { borderRadius: 24, padding: 18, gap: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  heroInfo: { flex: 1, minWidth: 125, gap: 8 },
  weighted: { borderTopWidth: 1, paddingTop: 15, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  link: { paddingVertical: 14, fontSize: 15, fontWeight: '600', minHeight: 48 },
});
