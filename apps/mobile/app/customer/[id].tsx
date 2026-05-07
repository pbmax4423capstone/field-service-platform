import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useLocalSearchParams, useNavigation, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import {
  formatPhone,
  formatDateTime,
  EQUIPMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  formatDate,
} from '@field-service/shared'

interface CustomerDetail {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  notes: string | null
  tags: string[]
  created_at: string
}

interface CustomerAddress {
  id: string
  label: string | null
  street: string
  city: string
  state: string
  zip: string
  is_primary: boolean
  access_notes: string | null
}

interface Equipment {
  id: string
  equipment_type: string
  make: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  warranty_expiry: string | null
  notes: string | null
}

interface Job {
  id: string
  title: string
  status: string
  scheduled_start: string
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useNavigation()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [customerRes, addressesRes, equipmentRes, jobsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, first_name, last_name, phone, email, notes, tags, created_at')
          .eq('id', id)
          .single(),
        supabase
          .from('customer_addresses')
          .select('id, label, street, city, state, zip, is_primary, access_notes')
          .eq('customer_id', id)
          .order('is_primary', { ascending: false }),
        supabase
          .from('customer_equipment')
          .select('id, equipment_type, make, model, serial_number, install_date, warranty_expiry, notes')
          .eq('customer_id', id)
          .order('created_at'),
        supabase
          .from('jobs')
          .select('id, title, status, scheduled_start')
          .eq('customer_id', id)
          .order('scheduled_start', { ascending: false })
          .limit(20),
      ])

      if (customerRes.data) {
        const c = customerRes.data as CustomerDetail
        setCustomer(c)
        navigation.setOptions({ title: `${c.first_name} ${c.last_name}` })
      }

      setAddresses(addressesRes.data ?? [])
      setEquipment(equipmentRes.data ?? [])
      setJobs(jobsRes.data ?? [])
      setLoading(false)
    }

    load()
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Customer not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{customer.first_name[0]}{customer.last_name[0]}</Text>
        </View>
        <Text style={styles.name}>{customer.first_name} {customer.last_name}</Text>
        <Text style={styles.memberSince}>Customer since {formatDate(customer.created_at)}</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
            <Text style={styles.contactBtnText}>📞 Call</Text>
          </TouchableOpacity>
          {customer.email && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
              <Text style={styles.contactBtnText}>✉️ Email</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contact info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact Info</Text>
        <InfoRow label="Phone" value={formatPhone(customer.phone)} />
        {customer.email && <InfoRow label="Email" value={customer.email} />}
        {customer.tags.length > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tags</Text>
            <View style={styles.tagsRow}>
              {customer.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {customer.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.infoLabel}>Notes</Text>
            <Text style={styles.notesText}>{customer.notes}</Text>
          </View>
        )}
      </View>

      {/* Addresses */}
      {addresses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Addresses</Text>
          {addresses.map((addr) => (
            <View key={addr.id} style={styles.addressItem}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>{addr.label ?? (addr.is_primary ? 'Primary' : 'Address')}</Text>
                {addr.is_primary && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Primary</Text></View>}
              </View>
              <Text style={styles.addressText}>{addr.street}</Text>
              <Text style={styles.addressText}>{addr.city}, {addr.state} {addr.zip}</Text>
              {addr.access_notes && (
                <Text style={styles.accessNotes}>Access: {addr.access_notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Equipment */}
      {equipment.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Equipment ({equipment.length})</Text>
          {equipment.map((eq, idx) => (
            <View key={eq.id} style={[styles.equipmentItem, idx > 0 && styles.equipmentDivider]}>
              <Text style={styles.equipmentType}>
                {EQUIPMENT_TYPE_LABELS[eq.equipment_type] ?? eq.equipment_type}
              </Text>
              {(eq.make || eq.model) && (
                <Text style={styles.equipmentModel}>{[eq.make, eq.model].filter(Boolean).join(' ')}</Text>
              )}
              {eq.serial_number && (
                <Text style={styles.equipmentMeta}>S/N: {eq.serial_number}</Text>
              )}
              {eq.install_date && (
                <Text style={styles.equipmentMeta}>Installed: {formatDate(eq.install_date)}</Text>
              )}
              {eq.warranty_expiry && (
                <Text style={styles.equipmentMeta}>Warranty expires: {formatDate(eq.warranty_expiry)}</Text>
              )}
              {eq.notes && (
                <Text style={styles.equipmentNotes}>{eq.notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Service history */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Service History ({jobs.length})</Text>
        {jobs.length === 0 && (
          <Text style={styles.emptyText}>No service history</Text>
        )}
        {jobs.map((job) => {
          const color = JOB_STATUS_COLORS[job.status] ?? '#6B7280'
          return (
            <TouchableOpacity
              key={job.id}
              style={styles.jobItem}
              onPress={() => router.push(`/job/${job.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.jobItemLeft}>
                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                <Text style={styles.jobDate}>{formatDateTime(job.scheduled_start)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
                <Text style={[styles.statusText, { color }]}>
                  {JOB_STATUS_LABELS[job.status] ?? job.status}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#6B7280', fontSize: 16 },
  profileCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#2563EB' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  memberSince: { fontSize: 13, color: '#BFDBFE', marginBottom: 16 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contactBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  infoLabel: { fontSize: 13, color: '#9CA3AF', marginRight: 8, flexShrink: 0 },
  infoValue: { fontSize: 14, color: '#111827', textAlign: 'right', flex: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1, justifyContent: 'flex-end' },
  tag: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  notesBox: { paddingVertical: 6 },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 4 },
  addressItem: { marginBottom: 12 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addressLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  primaryBadge: { backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 10, fontWeight: '600', color: '#059669' },
  addressText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  accessNotes: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 },
  equipmentItem: { paddingVertical: 8 },
  equipmentDivider: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  equipmentType: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  equipmentModel: { fontSize: 14, color: '#4B5563' },
  equipmentMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  equipmentNotes: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  jobItemLeft: { flex: 1, marginRight: 8 },
  jobTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  jobDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '600' },
})
