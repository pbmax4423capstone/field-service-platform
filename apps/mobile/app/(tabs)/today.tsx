import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Linking, Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatTime, formatPhone } from '@field-service/shared'

interface Job {
  id: string
  title: string
  status: string
  scheduled_start: string
  customers?: { first_name: string; last_name: string; phone: string }
  customer_addresses?: { street: string; city: string; state: string }
}

export default function TodayScreen() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  async function fetchJobs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

    const { data } = await supabase
      .from('jobs')
      .select('*, customers(first_name, last_name, phone), customer_addresses(street, city, state)')
      .eq('technician_id', user.id)
      .gte('scheduled_start', startOfDay)
      .lte('scheduled_start', endOfDay)
      .order('scheduled_start')

    setJobs(data ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchJobs() }, [])

  function openNavigation(address: string) {
    const url = Platform.OS === 'ios'
      ? `maps:?q=${encodeURIComponent(address)}`
      : `geo:0,0?q=${encodeURIComponent(address)}`
    Linking.openURL(url)
  }

  function callCustomer(phone: string) {
    Linking.openURL(`tel:${phone}`)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading today's jobs...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.jobCount}>{jobs.length} job{jobs.length !== 1 ? 's' : ''} scheduled</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs() }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No jobs today</Text>
            <Text style={styles.emptySubtitle}>Check the Jobs tab for all scheduled work</Text>
          </View>
        }
        renderItem={({ item }) => {
          const customer = item.customers
          const address = item.customer_addresses
          const statusColor = JOB_STATUS_COLORS[item.status] ?? '#6B7280'
          const fullAddress = address ? `${address.street}, ${address.city}, ${address.state}` : ''

          return (
            <View style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.jobTime}>{formatTime(item.scheduled_start)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {JOB_STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.jobTitle}>{item.title}</Text>
              {customer && (
                <Text style={styles.customerName}>
                  {customer.first_name} {customer.last_name}
                </Text>
              )}
              {fullAddress && (
                <TouchableOpacity onPress={() => openNavigation(fullAddress)}>
                  <Text style={styles.address}>📍 {fullAddress} →</Text>
                </TouchableOpacity>
              )}
              {customer?.phone && (
                <TouchableOpacity onPress={() => callCustomer(customer.phone)}>
                  <Text style={styles.phone}>📞 {formatPhone(customer.phone)}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280' },
  header: { backgroundColor: '#2563EB', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  headerDate: { fontSize: 14, color: '#BFDBFE', marginTop: 2 },
  jobCount: { fontSize: 13, color: '#93C5FD', marginTop: 4 },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  jobCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  jobHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  jobTime: { fontSize: 13, fontWeight: '600', color: '#374151' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  jobTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  customerName: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  address: { fontSize: 13, color: '#2563EB', marginBottom: 4 },
  phone: { fontSize: 13, color: '#2563EB' },
})
