import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatDateTime } from '@field-service/shared'

type StatusFilter = 'all' | 'scheduled' | 'dispatched' | 'en_route' | 'in_progress' | 'completed'

const FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'En Route', value: 'en_route' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

interface Job {
  id: string
  title: string
  status: string
  scheduled_start: string
  customers?: { first_name: string; last_name: string } | null
  customer_addresses?: { street: string; city: string } | null
}

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')

  async function fetchJobs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('jobs')
      .select('id, title, status, scheduled_start, customers(first_name, last_name), customer_addresses(street, city)')
      .eq('technician_id', user.id)
      .order('scheduled_start', { ascending: false })
      .limit(100)

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setJobs((data as Job[] | null) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchJobs()
  }, [filter])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterChip, filter === opt.value && styles.filterChipActive]}
              onPress={() => setFilter(opt.value)}
            >
              <Text style={[styles.filterChipText, filter === opt.value && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs() }} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading...' : filter === 'all' ? 'No jobs assigned' : `No ${JOB_STATUS_LABELS[filter] ?? filter} jobs`}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const customer = item.customers
          const address = item.customer_addresses
          const statusColor = JOB_STATUS_COLORS[item.status] ?? '#6B7280'

          return (
            <TouchableOpacity
              style={styles.jobCard}
              onPress={() => router.push(`/job/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {JOB_STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              {customer && (
                <Text style={styles.customerName}>
                  {customer.first_name} {customer.last_name}
                </Text>
              )}
              {address && (
                <Text style={styles.address} numberOfLines={1}>
                  {address.street}, {address.city}
                </Text>
              )}
              <Text style={styles.date}>{formatDateTime(item.scheduled_start)}</Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#FFF',
    paddingTop: 60,
    paddingBottom: 0,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 },
  filterRow: { paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterChipTextActive: { color: '#2563EB' },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, color: '#6B7280' },
  jobCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  jobTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '600' },
  customerName: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  address: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  date: { fontSize: 12, color: '#6B7280' },
})
