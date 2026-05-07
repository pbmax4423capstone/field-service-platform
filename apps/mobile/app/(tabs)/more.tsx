import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function MoreScreen() {
  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <View style={styles.section}>
        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <Text style={styles.itemTextDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#FFF', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  section: { margin: 16, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemText: { fontSize: 16, color: '#111827' },
  itemTextDanger: { fontSize: 16, color: '#EF4444' },
})
