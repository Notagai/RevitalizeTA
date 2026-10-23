import { View, type ColorValue } from 'react-native';

export function NavigationIcon({ name, color }: { name: 'overview' | 'analytics' | 'settings'; color: ColorValue | null }) {
  return <View aria-hidden style={{ width: 23, height: 23, justifyContent: 'center' }}>
    {name === 'overview' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
      {[0, 1, 2, 3].map(index => <View key={index} style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />)}
    </View> : name === 'analytics' ? <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 21 }}>
      {[10, 20, 15].map((height, index) => <View key={index} style={{ width: 5, height, borderRadius: 2, backgroundColor: color }} />)}
    </View> : <View style={{ gap: 5 }}>{[4, 13, 7].map((left, index) => <View key={index} style={{ height: 3, backgroundColor: color, borderRadius: 2 }}><View style={{ position: 'absolute', top: -2, left, height: 7, width: 5, backgroundColor: color, borderRadius: 2 }} /></View>)}</View>}
  </View>;
}
