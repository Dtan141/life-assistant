import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/app/AppLayout'
import RequireAuth from '@/app/RequireAuth'
import HomePage from '@/app/HomePage'
import NotFoundPage from '@/app/NotFoundPage'
import SettingsPage from '@/app/SettingsPage'
import DeckListPage from '@/modules/flashcards/pages/DeckListPage'
import DeckDetailPage from '@/modules/flashcards/pages/DeckDetailPage'
import ReviewPage from '@/modules/flashcards/pages/ReviewPage'

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
      { path: 'flashcards/review', element: <ReviewPage /> },
      { path: 'flashcards/:deckId', element: <DeckDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
