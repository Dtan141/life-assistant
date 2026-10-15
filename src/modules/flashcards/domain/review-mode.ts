export const REVIEW_MODES = ['en-vi', 'vi-en', 'typing', 'cloze'] as const
export type ReviewMode = (typeof REVIEW_MODES)[number]

export const MODE_LABELS: Record<ReviewMode, string> = {
  'en-vi': 'Anh → Việt',
  'vi-en': 'Việt → Anh',
  typing: 'Gõ đáp án',
  cloze: 'Điền vào câu',
}

export const MODE_HINTS: Record<ReviewMode, string> = {
  'en-vi': 'Hiện từ, nhớ lại nghĩa. Dễ nhất.',
  'vi-en': 'Hiện nghĩa, nhớ lại từ. Khó hơn, nhưng là chiều cần cho nói và viết.',
  typing: 'Gõ lại từ tiếng Anh. Luyện thêm chính tả.',
  cloze: 'Câu ví dụ bị che từ cần nhớ. Thẻ không có ví dụ sẽ hiện như Anh → Việt.',
}

export function isReviewMode(value: string | null): value is ReviewMode {
  return value !== null && (REVIEW_MODES as readonly string[]).includes(value)
}
