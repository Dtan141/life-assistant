import { Link, useParams } from 'react-router-dom'

export default function DeckDetailPage() {
  const { deckId } = useParams()

  return (
    <div className="mx-auto max-w-lg space-y-4 px-5 pt-8">
      <Link to="/flashcards" className="text-sm text-slate-500">
        ← Bộ thẻ
      </Link>
      <h1 className="text-2xl font-bold">Chi tiết bộ thẻ</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Danh sách thẻ, tìm kiếm và nhập TSV sẽ có ở bước tiếp theo của M2.
      </p>
      <p className="text-xs text-slate-400">deckId: {deckId}</p>
    </div>
  )
}
