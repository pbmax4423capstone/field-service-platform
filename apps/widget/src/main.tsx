import React from 'react'
import { createRoot } from 'react-dom/client'
import { BookingWidget } from './BookingWidget'

function init() {
  const script =
    document.currentScript as HTMLScriptElement | null ??
    document.querySelector('script[data-org-slug]') as HTMLScriptElement | null

  const orgSlug = script?.getAttribute('data-org-slug') ?? ''
  const apiBase =
    script?.getAttribute('data-api-base') ?? 'https://app.fieldpro.app'

  if (!orgSlug) {
    console.warn('[FieldPro Widget] Missing data-org-slug attribute on script tag.')
    return
  }

  // Mount a shadow-DOM container so widget styles don't bleed into the host page
  const host = document.createElement('div')
  host.id = 'fieldpro-widget-root'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)

  createRoot(mountPoint).render(
    <BookingWidget orgSlug={orgSlug} apiBase={apiBase} />,
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
