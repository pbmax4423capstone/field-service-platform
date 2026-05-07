import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  // undefined = still loading, null = no session, Session = authenticated
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/today')
    }
  }, [session, segments])

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="job/[id]"
          options={{
            headerShown: true,
            title: 'Job Detail',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#FFF' },
            headerTintColor: '#2563EB',
          }}
        />
        <Stack.Screen
          name="customer/[id]"
          options={{
            headerShown: true,
            title: 'Customer',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#FFF' },
            headerTintColor: '#2563EB',
          }}
        />
      </Stack>
    </>
  )
}
