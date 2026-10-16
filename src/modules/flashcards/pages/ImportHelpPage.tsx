import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Note, Panel } from '@/shared/ui/Panel'
import { Page, PageHeader, Section } from '@/shared/ui/Page'
import { useBack } from '@/shared/ui/useBack'
import { COLUMN_LABELS } from '@/modules/flashcards/domain/tsv-parser'

const COLUMN_NOTES: string[] = [
  'Từ hoặc cụm từ tiếng Anh.',
  'Nghĩa tiếng Việt. Viết thêm ghi chú gì cũng được.',
  'Phiên âm IPA.',
  'n, v, adj, phr… viết tự do, không bị ràng buộc.',
  'Một câu chứa từ đó.',
  'Cách nhau bởi dấu chấm phẩy.',
  'Cách nhau bởi dấu chấm phẩy. Có thể bỏ, xem mẹo bên dưới.',
  'Cách nhau bởi dấu chấm phẩy, ví dụ can-on-ky.',
]

const EXAMPLE_ROWS = [
  [
    'accidental',
    'vô tình, do tai nạn',
    '/ˌæksɪˈdentl/',
    'adj',
    'Most eagle deaths are accidental.',
    'unintentional; chance',
    'deliberate',
    '',
  ],
  ['boundary', 'ranh giới', '/ˈbaʊndri/', 'n', '', '', '', ''],
  ['bird sanctuary', 'khu bảo tồn chim', '', '', '', '', '', ''],
]

const EXAMPLE_TSV = EXAMPLE_ROWS.map((cells) =>
  cells.join('\t').replace(/\t+$/, ''),
).join('\n')

const PROMPT = `Tôi sẽ đưa bạn một danh sách từ vựng tiếng Anh. Hãy xuất ra dạng TSV để tôi nhập vào app flashcard.

Quy tắc:
- Mỗi dòng là một thẻ. Các cột cách nhau bằng đúng MỘT ký tự Tab.
- Thứ tự cột: Từ, Nghĩa tiếng Việt, Phiên âm IPA, Loại từ, Câu ví dụ, Đồng nghĩa, Trái nghĩa, Tags.
- Chỉ hai cột đầu là bắt buộc. Cột nào không có thì để trống, KHÔNG được bỏ cột.
- Đồng nghĩa, trái nghĩa và tags: nhiều giá trị thì cách nhau bằng dấu chấm phẩy.
- Tuyệt đối không dùng dấu phẩy để ngăn cột, vì nghĩa tiếng Việt vốn có dấu phẩy.
- Không thêm dòng tiêu đề, không thêm giải thích, chỉ trả về đúng phần TSV.

Danh sách của tôi:`

export default function ImportHelpPage() {
  const [copied, setCopied] = useState<'example' | 'prompt' | null>(null)
  // Reachable from the deck list, an empty deck and settings alike.
  const goBack = useBack('/flashcards')

  async function copy(text: string, which: 'example' | 'prompt') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Clipboard write failed', err)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Cách chuẩn bị file nhập"
        back={{ label: 'Quay lại', onBack: goBack }}
        subtitle="Mỗi dòng một thẻ, các cột cách nhau bằng phím Tab."
      />

      <Section title="Thứ tự cột">
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {COLUMN_LABELS.map((label, index) => (
              <li key={label} className="flex gap-3 px-4 py-2.5">
                <span className="w-5 shrink-0 text-sm tabular-nums text-slate-400">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{label}</span>
                  {index < 2 && (
                    <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                      bắt buộc
                    </span>
                  )}
                  <span className="block text-sm text-slate-500">
                    {COLUMN_NOTES[index]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </Section>

      <Section title="Ví dụ">
        <Panel className="overflow-x-auto p-3">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre">
            {EXAMPLE_ROWS.map((cells, i) => (
              <span key={i} className="block">
                {cells.map((cell, j) => (
                  <span key={j}>
                    {cell || <span className="text-slate-300 dark:text-slate-700">—</span>}
                    {j < cells.length - 1 && (
                      <span className="mx-1 text-slate-300 dark:text-slate-700">⇥</span>
                    )}
                  </span>
                ))}
              </span>
            ))}
          </pre>
        </Panel>
        <p className="mt-2 text-sm text-slate-500">
          Dấu <span className="font-mono">⇥</span> là ký tự Tab. Dòng 2 chỉ có bốn cột
          đầu, dòng 3 chỉ có hai — cả hai đều hợp lệ.
        </p>
        <Button
          variant="secondary"
          onClick={() => void copy(EXAMPLE_TSV, 'example')}
          className="mt-3 w-full"
        >
          {copied === 'example' ? 'Đã chép' : 'Chép ví dụ để thử'}
        </Button>
      </Section>

      <Section title="Ba điều hay sai nhất">
        <ul className="space-y-2 text-sm">
          <Pitfall title="Dùng dấu phẩy thay Tab">
            Nghĩa tiếng Việt gần như luôn có dấu phẩy, nên file sẽ vỡ thành sai cột.
            Tab là lựa chọn an toàn duy nhất.
          </Pitfall>
          <Pitfall title="Bỏ hẳn cột trống thay vì để trống">
            Thiếu một Tab là mọi cột phía sau lệch đi một ô. Không có phiên âm thì vẫn
            giữ chỗ của nó.
          </Pitfall>
          <Pitfall title="Dán từ bảng Word hoặc Excel">
            Thường kèm theo ký tự lạ hoặc xuống dòng giữa ô. Dán vào ô xem trước rồi
            kiểm tra số dòng trước khi lưu.
          </Pitfall>
        </ul>
      </Section>

      <Section title="Nhờ AI tạo file cho nhanh">
        <p className="mb-3 text-sm text-slate-500">
          Chép đoạn dưới đây, dán vào Claude hoặc ChatGPT kèm danh sách từ của bạn.
        </p>
        <Panel className="max-h-56 overflow-y-auto p-3">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {PROMPT}
          </pre>
        </Panel>
        <Button
          variant="secondary"
          onClick={() => void copy(PROMPT, 'prompt')}
          className="mt-3 w-full"
        >
          {copied === 'prompt' ? 'Đã chép' : 'Chép đoạn yêu cầu'}
        </Button>
      </Section>

      <Section title="Mẹo">
        <Note>
          Trái nghĩa viết thẳng trong phần nghĩa dạng{' '}
          <span className="font-mono">(TN: deliberate, intentional)</span> cũng được —
          app tự tách ra, và vẫn giữ nguyên phần nghĩa như bạn viết.
        </Note>
      </Section>
    </Page>
  )
}

function Pitfall({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-slate-500">{children}</p>
    </li>
  )
}
