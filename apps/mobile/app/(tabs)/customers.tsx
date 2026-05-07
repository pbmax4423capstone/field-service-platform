import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Linking,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatPhone } from '@field-service/shared'

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function fetchCustomers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) return

    let query = supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email')
      .eq('organization_id', userData.organization_id)
      .order('last_name')
      .limit(150)

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data } = await query
    setCustomers(data ?? [])
    setRefreshing(false)
  }

  useEffect(() => { fetchCustomers() }, [search])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TextInput
          style={styles.search}
          placeholder="Search by name or phone..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCustomers() }} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/customer/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.first_name[0]}{item.last_name[0]}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); Linking.openURL(`tel:${item.phone}`) }}>
                <Text style={styles.phone}>{formatPhone(item.phone)}</Text>
              </TouchableOpacity>
              {item.email && <Text style={styles.email} numberOfLines={1}>{item.email}</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#FFF',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 10, fontSize: 15 },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#2563EB' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  phone: { fontSize: 13, color: '#2563EB', marginTop: 2 },
  email: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  chevron: { fontSize: 20, color: '#D1D5DB' },
})
