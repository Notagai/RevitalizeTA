import { Link } from 'expo-router';
import { Body, Heading, Page } from '../ui/components';
import { useTheme } from '../ui/theme';
export default function NotFound() {
  const { colors } = useTheme();
  return <Page><Heading>Page not found</Heading><Body>This link does not point to an available screen.</Body><Link href="/" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16 }}>Go to Dashboard</Link></Page>;
}
