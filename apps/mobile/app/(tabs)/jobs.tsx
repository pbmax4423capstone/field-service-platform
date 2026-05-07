import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatDateTime } from '@field-service/shared'

export default function JobsScreen() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchJobs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('jobs')
      .select('*, customers(first_name, last_name)')
      .eq('technician_id', user.id)
      .not('status', 'in', '("completed","cancelled")')
      .order('scheduled_start')
      .limit(50)

    setJobs(data ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchJobs() }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs() }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{loading ? 'Loading...' : 'No active jobs'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const customer = item.customers
          const statusColor = JOB_STATUS_COLORS[item.status] ?? '#6B7280'
          return (
            <TouchableOpacity style={styles.jobCard}>
              <View style={styles.row}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.jobTitle}>{item.title}</Text>
              </View>
              {customer && (
                <Text style={styles.customerName}>{customer.first_name} {customer.last_name}</Text>
              )}
              <Text style={styles.date}>{formatDateTime(item.scheduled_start)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {JOB_STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#FFF', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, color: '#6B7280' },
  jobCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  customerName: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
  date: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
})
