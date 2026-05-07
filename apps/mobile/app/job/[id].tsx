import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { supabase } from '@/lib/supabase'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  JOB_STATUS_TRANSITIONS,
  formatDateTime,
  formatCurrency,
  formatPhone,
  formatDate,
} from '@field-service/shared'

interface LineItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  taxable: boolean
}

interface JobNote {
  id: string
  content: string
  created_at: string
  author_id: string
}

interface JobPhoto {
  id: string
  url: string
  photo_type: 'before' | 'after' | 'other'
  caption: string | null
  created_at: string
}

interface JobDetail {
  id: string
  title: string
  description: string | null
  status: string
  scheduled_start: string
  scheduled_end: string | null
  organization_id: string
  customers: {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string | null
  } | null
  customer_addresses: {
    street: string
    city: string
    state: string
    zip: string
    access_notes: string | null
  } | null
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useNavigation()

  const [job, setJob] = useState<JobDetail | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState<JobNote[]>([])
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  async function loadJob() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const { data: jobData } = await supabase
      .from('jobs')
      .select(`
        id, title, description, status, scheduled_start, scheduled_end, organization_id,
        customers(id, first_name, last_name, phone, email),
        customer_addresses(street, city, state, zip, access_notes)
      `)
      .eq('id', id)
      .single()

    if (jobData) {
      setJob(jobData as unknown as JobDetail)
      navigation.setOptions({ title: jobData.title })
    }

    const [itemsRes, notesRes, photosRes] = await Promise.all([
      supabase.from('job_line_items').select('id, name, quantity, unit_price, taxable').eq('job_id', id).order('created_at'),
      supabase.from('job_notes').select('id, content, created_at, author_id').eq('job_id', id).order('created_at'),
      supabase.from('job_photos').select('id, url, photo_type, caption, created_at').eq('job_id', id).order('created_at'),
    ])

    setLineItems(itemsRes.data ?? [])
    setNotes(notesRes.data ?? [])
    setPhotos(photosRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadJob() }, [id])

  async function updateStatus(newStatus: string) {
    if (!job) return
    setUpdatingStatus(true)

    const oldStatus = job.status

    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      Alert.alert('Error', 'Failed to update status.')
      setUpdatingStatus(false)
      return
    }

    await supabase.from('job_status_history').insert({
      job_id: id,
      organization_id: job.organization_id,
      changed_by: userId!,
      from_status: oldStatus,
      to_status: newStatus,
    })

    setJob((prev) => prev ? { ...prev, status: newStatus } : prev)
    setUpdatingStatus(false)
  }

  async function addNote() {
    if (!newNote.trim() || !job) return
    setSavingNote(true)

    const { data } = await supabase.from('job_notes').insert({
      job_id: id,
      organization_id: job.organization_id,
      author_id: userId!,
      content: newNote.trim(),
    }).select().single()

    if (data) {
      setNotes((prev) => [...prev, data])
      setNewNote('')
    }
    setSavingNote(false)
  }

  async function pickPhoto(photoType: 'before' | 'after') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.')
      return
    }

    Alert.alert(
      `Add ${photoType === 'before' ? 'Before' : 'After'} Photo`,
      'Choose source',
      [
        { text: 'Camera', onPress: () => capturePhoto(photoType) },
        { text: 'Photo Library', onPress: () => libraryPhoto(photoType) },
        { text: 'Cancel', style: 'cancel' },
      ],
    )
  }

  async function capturePhoto(photoType: 'before' | 'after') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri, photoType)
    }
  }

  async function libraryPhoto(photoType: 'before' | 'after') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri, photoType)
    }
  }

  async function uploadPhoto(uri: string, photoType: 'before' | 'after') {
    if (!job) return
    setUploadingPhoto(true)

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      const fileName = `${id}/${photoType}-${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, bytes.buffer, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(fileName)

      const { data: photoRecord } = await supabase.from('job_photos').insert({
        job_id: id,
        organization_id: job.organization_id,
        uploaded_by: userId!,
        url: publicUrl,
        photo_type: photoType,
        caption: null,
      }).select().single()

      if (photoRecord) {
        setPhotos((prev) => [...prev, photoRecord as JobPhoto])
      }
    } catch (err) {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function openInMaps(address: string) {
    const url = Platform.OS === 'ios'
      ? `maps:?q=${encodeURIComponent(address)}`
      : `geo:0,0?q=${encodeURIComponent(address)}`
    Linking.openURL(url)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Job not found.</Text>
      </View>
    )
  }

  const statusColor = JOB_STATUS_COLORS[job.status] ?? '#6B7280'
  const nextStatuses = JOB_STATUS_TRANSITIONS[job.status] ?? []
  const customer = job.customers
  const address = job.customer_addresses
  const fullAddress = address ? `${address.street}, ${address.city}, ${address.state} ${address.zip}` : null
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const beforePhotos = photos.filter((p) => p.photo_type === 'before')
  const afterPhotos = photos.filter((p) => p.photo_type === 'after')

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {JOB_STATUS_LABELS[job.status] ?? job.status}
          </Text>
        </View>

        {/* Job info */}
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.dateText}>{formatDateTime(job.scheduled_start)}</Text>
          {job.scheduled_end && (
            <Text style={styles.dateSubText}>until {formatDateTime(job.scheduled_end)}</Text>
          )}
          {job.description && (
            <Text style={styles.description}>{job.description}</Text>
          )}
        </View>

        {/* Customer */}
        {customer && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.customerName}>{customer.first_name} {customer.last_name}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
              <Text style={styles.linkText}>📞 {formatPhone(customer.phone)}</Text>
            </TouchableOpacity>
            {customer.email && (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
                <Text style={styles.linkText}>✉️ {customer.email}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Address */}
        {fullAddress && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.addressText}>{fullAddress}</Text>
            {address?.access_notes && (
              <Text style={styles.accessNotes}>Access: {address.access_notes}</Text>
            )}
            <TouchableOpacity style={styles.mapsBtn} onPress={() => openInMaps(fullAddress)}>
              <Text style={styles.mapsBtnText}>🗺 Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status transitions */}
        {nextStatuses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            <View style={styles.transitionButtons}>
              {nextStatuses.map((next) => {
                const color = JOB_STATUS_COLORS[next] ?? '#6B7280'
                return (
                  <TouchableOpacity
                    key={next}
                    style={[styles.transitionBtn, { backgroundColor: color, opacity: updatingStatus ? 0.6 : 1 }]}
                    onPress={() => updateStatus(next)}
                    disabled={updatingStatus}
                  >
                    {updatingStatus
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={styles.transitionBtnText}>→ {JOB_STATUS_LABELS[next] ?? next}</Text>
                    }
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Line items */}
        {lineItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            {lineItems.map((item) => (
              <View key={item.id} style={styles.lineItem}>
                <View style={styles.lineItemLeft}>
                  <Text style={styles.lineItemName}>{item.name}</Text>
                  <Text style={styles.lineItemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.lineItemPrice}>
                  {formatCurrency(item.quantity * item.unit_price * 100)}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal * 100)}</Text>
            </View>
          </View>
        )}

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Photos</Text>

          <View style={styles.photoSection}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.photoSectionLabel}>Before</Text>
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={() => pickPhoto('before')}
                disabled={uploadingPhoto}
              >
                <Text style={styles.addPhotoBtnText}>{uploadingPhoto ? 'Uploading...' : '+ Add'}</Text>
              </TouchableOpacity>
            </View>
            {beforePhotos.length === 0
              ? <Text style={styles.noPhotos}>No before photos</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                  {beforePhotos.map((p) => (
                    <Image key={p.id} source={{ uri: p.url }} style={styles.thumbnail} />
                  ))}
                </ScrollView>
              )
            }
          </View>

          <View style={[styles.photoSection, { marginTop: 12 }]}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.photoSectionLabel}>After</Text>
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={() => pickPhoto('after')}
                disabled={uploadingPhoto}
              >
                <Text style={styles.addPhotoBtnText}>{uploadingPhoto ? 'Uploading...' : '+ Add'}</Text>
              </TouchableOpacity>
            </View>
            {afterPhotos.length === 0
              ? <Text style={styles.noPhotos}>No after photos</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                  {afterPhotos.map((p) => (
                    <Image key={p.id} source={{ uri: p.url }} style={styles.thumbnail} />
                  ))}
                </ScrollView>
              )
            }
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {notes.length === 0 && <Text style={styles.noPhotos}>No notes yet</Text>}
          {notes.map((note) => (
            <View key={note.id} style={styles.noteItem}>
              <Text style={styles.noteContent}>{note.content}</Text>
              <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
            </View>
          ))}
          <View style={styles.addNoteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note..."
              value={newNote}
              onChangeText={setNewNote}
              multiline
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveNoteBtn, (!newNote.trim() || savingNote) && styles.saveBtnDisabled]}
              onPress={addNote}
              disabled={!newNote.trim() || savingNote}
            >
              <Text style={styles.saveNoteBtnText}>{savingNote ? '...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#6B7280', fontSize: 16 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  jobTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  dateText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  dateSubText: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  description: { fontSize: 14, color: '#374151', marginTop: 10, lineHeight: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  customerName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 6 },
  linkText: { fontSize: 14, color: '#2563EB', marginBottom: 4 },
  addressText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  accessNotes: { fontSize: 13, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },
  mapsBtn: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  mapsBtnText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  transitionButtons: { gap: 8 },
  transitionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  transitionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lineItemLeft: { flex: 1 },
  lineItemName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  lineItemQty: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  lineItemPrice: { fontSize: 14, color: '#111827', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  photoSection: {},
  photoSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  photoSectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  addPhotoBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addPhotoBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  noPhotos: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  photoRow: { flexDirection: 'row' },
  thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  noteContent: { fontSize: 14, color: '#374151', lineHeight: 20 },
  noteDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  addNoteRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-end' },
  noteInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    minHeight: 44,
  },
  saveNoteBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveNoteBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
})
