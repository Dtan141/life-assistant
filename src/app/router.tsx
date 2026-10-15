import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/app/AppLayout'
import RequireAuth from '@/app/RequireAuth'
import HomePage from '@/app/HomePage'
import NotFoundPage from '@/app/NotFoundPage'
import SettingsPage from '@/app/SettingsPage'
import BackupPage from '@/app/BackupPage'
import DeckListPage from '@/modules/flashcards/pages/DeckListPage'
import DeckDetailPage from '@/modules/flashcards/pages/DeckDetailPage'
import ImportPage from '@/modules/flashcards/pages/ImportPage'
import ReviewPage from '@/modules/flashcards/pages/ReviewPage'
import ReviewSetupPage from '@/modules/flashcards/pages/ReviewSetupPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'flashcards', element: <DeckListPage /> },
      { path: 'flashcards/review', element: <ReviewSetupPage /> },
      { path: 'flashcards/review/session', element: <ReviewPage /> },
      { path: 'flashcards/:deckId', element: <DeckDetailPage /> },
      { path: 'flashcards/:deckId/import', element: <ImportPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/backup', element: <BackupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
