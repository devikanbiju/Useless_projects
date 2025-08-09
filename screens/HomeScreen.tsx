import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Omana Aunty</Text>
      <Text style={styles.subtitle}>An all in one typical aunty for us.</Text>

      <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Chat' as never)}>
        <Text style={styles.ctaText}>Chat with Aunty</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('Outfit' as never)}>
        <Text style={styles.secondaryText}>Outfit Check</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6b7280' },
  cta: { marginTop: 32, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: 'white', fontWeight: '800', fontSize: 16 },
  secondary: { marginTop: 12, backgroundColor: '#111827', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryText: { color: 'white', fontWeight: '800', fontSize: 16 },
});