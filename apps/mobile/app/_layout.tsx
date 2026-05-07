import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  useEffect(() => {
    supabase.auth.getSession()
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
