import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@field-service/shared'

interface UserProfile {
  full_name: string
  email: string
  phone: string | null
  expo_push_token: string | null
}

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

async function registerPushToken(userId: string) {
  if (Platform.OS === 'web') return

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync()

  const token = tokenData.data

  await supabase
    .from('users')
    .update({ expo_push_token: token, expo_push_token_updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }
}

export default function MoreScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('full_name, email, phone, expo_push_token')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setPushEnabled(!!data.expo_push_token)
      }

      try {
        await registerPushToken(user.id)
        setPushEnabled(true)
      } catch {
        // Notifications not critical — continue silently
      }
    }

    load()
  }, [])

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const initials = profile ? getInitials(profile.full_name) : '?'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name ?? '—'}</Text>
          <Text style={styles.profileEmail}>{profile?.email ?? '—'}</Text>
          {profile?.phone && <Text style={styles.profilePhone}>{profile.phone}</Text>}
        </View>
      </View>

      {/* Status section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Push Notifications</Text>
          <View style={[styles.badge, pushEnabled ? styles.badgeGreen : styles.badgeGray]}>
            <Text style={[styles.badgeText, pushEnabled ? styles.badgeTextGreen : styles.badgeTextGray]}>
              {pushEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>v{APP_VERSION}</Text>
        </View>
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.menuItemDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: '#FFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  profileCard: {
    margin: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  profilePhone: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 15, color: '#374151' },
  infoValue: { fontSize: 15, color: '#6B7280' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeGray: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextGreen: { color: '#059669' },
  badgeTextGray: { color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  menuItem: { paddingHorizontal: 16, paddingVertical: 14 },
  menuItemDanger: { fontSize: 15, color: '#EF4444', fontWeight: '500' },
})
