/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

/**
 * One service worker for both jobs.
 *
 * Firebase would happily register its own firebase-messaging-sw.js, but then
 * two workers compete for the same pages, and iOS — the only platform where
 * these notifications matter — is the least forgiving about that. So the PWA
 * cache and the push handler live together here.
 */
declare const self: ServiceWorkerGlobalScope

// The update prompt in the app asks before applying a new version; this is how
// the user's answer reaches the waiting worker.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    // The Firebase auth proxy must reach the network, never the cached shell.
    denylist: [/^\/__\//],
  }),
)

const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

onBackgroundMessage(getMessaging(firebaseApp), (payload) => {
  const title = payload.data?.title ?? 'Đến giờ ôn tập'
  void self.registration.showNotification(title, {
    body: payload.data?.body ?? '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    // Replaces yesterday's reminder instead of stacking up a column of them.
    tag: 'daily-review',
    data: { url: payload.data?.url ?? '/' },
  })
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      // Focus the app if it is already open rather than opening a second copy.
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
