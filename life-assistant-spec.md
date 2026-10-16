# Life Assistant — Mô tả dự án

> Phiên bản: 0.5 · Ngày: 16/10/2026 · Trạng thái: **M0–M5 đã xong.** MVP hoàn chỉnh; còn chờ xác nhận cron nhắc nhở tự chạy qua một đêm
> Giai đoạn hiện tại: **Module 1 — Flashcard học từ vựng tiếng Anh**

---

## 1. Tầm nhìn

Một website cá nhân (tên miền riêng tính sau, tạm dùng domain mặc định của Cloudflare Pages: `<ten-project>.pages.dev`), dùng được trên cả điện thoại lẫn máy tính, dữ liệu đồng bộ qua cloud. Về lâu dài đây là **trợ lý cuộc sống (life assistant)** gom các công cụ cá nhân về một chỗ:

| Module | Mô tả ngắn | Giai đoạn |
|---|---|---|
| **Flashcard** | Tạo nhanh và ôn tập flashcard theo lịch lặp lại ngắt quãng (spaced repetition) | **Làm ngay** |
| Kế hoạch | Lên kế hoạch tuần/ngày, việc cần làm | Sau |
| Thói quen & sức khỏe | Theo dõi thói quen, chỉ số sức khỏe cá nhân | Sau |
| Blog | Viết và đăng bài | Sau |
| Trợ lý AI | Hỏi đáp, tổng hợp dữ liệu từ các module | Sau |

**Nguyên tắc chung**
- Một người dùng chính (bản thân tôi), nhưng thiết kế không chặn việc mở rộng thêm người dùng.
- Mỗi module độc lập, dùng chung: đăng nhập, giao diện, thông báo, lưu trữ.
- Ưu tiên chi phí bằng 0 hoặc rất thấp (gói miễn phí của Firebase và các dịch vụ khác).
- Dùng tốt trên iPhone: cài được lên màn hình chính (PWA), thao tác bằng một tay.

---

## 2. Module 1 — Flashcard

### 2.1. Vấn đề cần giải quyết
- Mỗi bài nghe/đọc (ví dụ bài Study4 Listening), tôi có một danh sách 30–60 từ vựng lưu trong Notion.
- Các app flashcard miễn phí đã thử (Kuliko, OpenQuiz…) đều giới hạn số lần ôn, hoặc khoá tính năng sau gói trả phí.
- Tôi cần: **tạo bộ thẻ trong vài giây** từ danh sách có sẵn, **ôn tập không giới hạn**, và **được nhắc khi đến hạn ôn**.

### 2.2. Mục tiêu MVP
1. Tạo bộ thẻ bằng cách dán văn bản (TSV) trong dưới 1 phút.
2. Ôn tập theo thuật toán spaced repetition, không giới hạn số lần.
3. Đồng bộ giữa điện thoại và máy tính.
4. Nhắc ôn tập mỗi ngày khi có thẻ đến hạn.

### 2.3. Không làm trong MVP
- Tự sinh thẻ bằng AI ngay trong web (Claude đã làm việc này ở bên ngoài, rồi xuất file để dán vào).
- Chia sẻ bộ thẻ cho người khác, cộng đồng, bảng xếp hạng.
- App native iOS/Android.

---

## 3. Tính năng chi tiết

### 3.1. Quản lý bộ thẻ (Deck)
- Tạo / sửa / xoá / lưu trữ bộ thẻ. Mỗi bộ có: tên, mô tả, thẻ gắn (tag), link nguồn (ví dụ trang Notion).
- Xem danh sách thẻ trong bộ: tìm kiếm, **sắp xếp theo ABC**, lọc theo trạng thái (mới / đang học / cần ôn / đã thuộc).
- Bộ thẻ con hoặc tag, ví dụ `can-on-ky` cho các từ hay sai.

### 3.2. Tạo thẻ nhanh (ưu tiên số 1)
**Nhập hàng loạt bằng cách dán văn bản**, mỗi dòng là một thẻ, các cột cách nhau bằng Tab:

```
Từ ⇥ Định nghĩa ⇥ Phát âm ⇥ Loại từ ⇥ Ví dụ ⇥ Đồng nghĩa (cách nhau bởi ;)
```

Ví dụ:
```
accidental	vô tình, do tai nạn (TN: deliberate)	/ˌæksɪˈdentl/	adj	Most eagle deaths are accidental.	unintentional; chance
```

Yêu cầu:
- **Phân cách cột: Tab. Phân cách thẻ: xuống dòng.** Kiểm chứng trên file thật 59 từ (`src/modules/flashcards/domain/__fixtures__/eagles.tsv`) cho thấy không có lựa chọn nào khác an toàn:
  - Dấu `,` có mặt trong definition, trong pronunciation (`/ˈkɑːnflɪkt/ (n), /kənˈflɪkt/ (v)`) và cả trong partOfSpeech (`n, v`).
  - Dấu `;` có trong definition của 4 dòng (`harm`, `harvest`, `poison`, `settle`), ví dụ `(n) vụ mùa; (v) thu hoạch`. Dùng `;` làm phân cách thẻ sẽ cắt nát các dòng này.
  - Vẫn cho người dùng đổi dấu phân cách cột trong giao diện, nhưng mặc định là Tab và có cảnh báo khi số cột giữa các dòng không đều.
- **Xem trước** trước khi lưu: hiện bảng các thẻ đã đọc được, đánh dấu dòng lỗi (thiếu cột, trùng từ).
- **Phát hiện trùng lặp**: từ đã có trong bộ thì hỏi bỏ qua, ghi đè hay giữ cả hai.
- Cột không bắt buộc có thể để trống.
- Định dạng này **khớp với file mà Claude (skill vocab-coach) xuất ra**, nên quy trình là: Notion → Claude → file TSV → dán vào web.

Các cách tạo khác:
- Thêm từng thẻ thủ công (form nhanh, Enter để sang thẻ tiếp theo).
- Nhập file `.txt` / `.csv` / `.tsv`.
- (Sau MVP) Nhập file `.apkg` của Anki; nhập trực tiếp từ một trang Notion.

### 3.3. Cấu trúc một thẻ
| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `term` | ✓ | Từ / cụm từ tiếng Anh |
| `definition` | ✓ | Nghĩa tiếng Việt + ghi chú (cấu trúc đi kèm, từ trái nghĩa…) |
| `pronunciation` | | IPA |
| `partOfSpeech` | | n, v, adj, adv, phr… |
| `example` | | Câu ví dụ |
| `synonyms` | | Danh sách |
| `antonyms` | | Danh sách (thêm so với định dạng OpenQuiz) |
| `wordFamily` | | Họ từ |
| `myExample` | | Câu tôi tự đặt (lấy từ Notion) |
| `tags` | | Ví dụ `can-on-ky` |
| `imageUrl`, `audioUrl` | | Sau MVP |

### 3.4. Ôn tập
**Các chế độ ôn**
- **Anh → Việt**: hiện từ, IPA và nút nghe; lật thẻ để xem nghĩa.
- **Việt → Anh**: hiện nghĩa, nhớ lại từ (chiều này khó hơn).
- **Gõ đáp án**: gõ từ tiếng Anh rồi so khớp, cho phép sai nhỏ (thiếu dấu gạch nối, viết hoa…).
- **Điền vào câu (cloze)**: câu ví dụ bị che từ cần nhớ.
- (Sau MVP) Trắc nghiệm, nghe rồi chép chính tả.

**Đánh giá sau mỗi thẻ** (4 mức, theo kiểu Anki/FSRS):
`Quên (Again)` · `Khó (Hard)` · `Được (Good)` · `Dễ (Easy)`. Mỗi nút hiển thị trước khoảng thời gian đến lần ôn kế tiếp (ví dụ "10 phút", "1 ngày", "4 ngày").

**Chọn phạm vi ôn** *(bổ sung 15/10/2026 — bản 0.1 thiếu mục này)*
- Màn hình chuẩn bị phiên cho chọn: bộ thẻ (một, nhiều hoặc tất cả), trạng thái thẻ (mới / đang học / cần ôn / đã thuộc), kiểu hỏi, và ôn theo lịch hay luyện tự do.
- Nút bắt đầu hiện số thẻ khớp lựa chọn, **tính đúng cách phiên sẽ tính**, kể cả phần đã ôn trong ngày.
- Hai lối tắt bỏ qua màn hình này: nút ở trang chủ và nút "Ôn bộ này" ở trang bộ thẻ.

**Lưu ý hiển thị:** phần `definition` chứa cả ghi chú tiếng Anh (collocation, họ từ), nên ở chiều Việt→Anh và gõ đáp án phải **che từ cần nhớ trong chính phần nghĩa** — 38/59 thẻ của bộ mẫu lộ đáp án nếu hiện nguyên văn.

**Phiên ôn hằng ngày**
- Thứ tự: thẻ đến hạn trước, thẻ mới sau.
- Cấu hình được: số thẻ mới mỗi ngày (mặc định 20), số lượt ôn tối đa mỗi ngày (mặc định 200).
- Có thể ôn thêm ngoài lịch (luyện tự do) mà không làm hỏng lịch ôn.
- Phát âm bằng Web Speech API (text-to-speech có sẵn trong trình duyệt, miễn phí).
- Phím tắt trên máy tính: `Space` để lật thẻ, `1`–`4` để đánh giá. Trên điện thoại: chạm để lật, vuốt hoặc bấm nút để đánh giá.

### 3.5. Thuật toán lặp lại ngắt quãng
- **Đề xuất: FSRS** (Free Spaced Repetition Scheduler). Đây là thuật toán mã nguồn mở mà Anki đang dùng, có sẵn thư viện JavaScript/TypeScript `ts-fsrs`.
  - Mỗi thẻ lưu: `due`, `stability`, `difficulty`, `reps`, `lapses`, `state` (New/Learning/Review/Relearning), `lastReview`.
  - Có tham số "tỉ lệ nhớ mong muốn" (desired retention, mặc định 0.9).
- **Phương án đơn giản hơn: SM-2** (thuật toán cổ điển của SuperMemo/Anki đời đầu), nếu muốn tự viết từ đầu.
- Mọi lượt ôn được lưu vào **review log**. Nhờ đó có thể đổi thuật toán hoặc tối ưu tham số về sau mà không mất lịch sử.

### 3.6. Nhắc nhở ôn tập
- Mỗi ngày, vào giờ tôi chọn (ví dụ 20:00), nếu có thẻ đến hạn thì gửi thông báo: "Hôm nay có 35 thẻ cần ôn".
- **Kênh thông báo:**
  1. **Web Push** (Firebase Cloud Messaging). Trên iPhone, web push chỉ hoạt động khi web đã được **thêm vào Màn hình chính (PWA)** và người dùng cho phép thông báo.
  2. Dự phòng: email tóm tắt hằng ngày.
  3. Luôn có: số thẻ đến hạn hiển thị ngay trên trang chủ.
**Cách chạy job theo lịch — đã chốt:** **Cloudflare Workers Cron Trigger**, KHÔNG dùng Cloud Functions (Firebase giữ gói Spark miễn phí, không gắn thẻ thanh toán).

- Worker chạy mỗi 15 phút (cron `*/15 * * * *`), tự xác định user nào có `reminderTime` khớp múi giờ của họ trong khung vừa qua.
- Worker đọc Firestore và gửi FCM qua **REST API** (Firestore REST + FCM HTTP v1), xác thực bằng **service account key** ký JWT → đổi lấy access token. Key lưu trong Worker Secret, không commit.
- Hạn mức: Workers free 100.000 request/ngày, cron trigger không tính riêng → thoải mái cho ~96 lần chạy/ngày.
- Đổi lại: logic phía server phải viết hai lần (client TS + worker TS). Chấp nhận được vì worker chỉ làm đúng một việc là đếm thẻ đến hạn và gửi push.

### 3.7. Thống kê
- Số thẻ đến hạn hôm nay và 7 ngày tới.
- Chuỗi ngày học liên tục (streak).
- Số thẻ theo trạng thái (mới / đang học / đã thuộc) trong từng bộ.
- Tỉ lệ nhớ, danh sách thẻ hay quên nhất (để đưa vào tag `can-on-ky`).

### 3.8. Sao lưu
- Xuất toàn bộ dữ liệu ra JSON hoặc TSV bất kỳ lúc nào.
- Nhập lại từ file sao lưu.

---

## 4. Yêu cầu phi chức năng
- **Thiết bị:** responsive, ưu tiên thiết kế cho điện thoại; PWA cài được lên màn hình chính iOS và Android.
- **Offline:** ôn được khi mất mạng, tự đồng bộ khi có mạng lại (Firestore có sẵn chế độ lưu offline).
- **Hiệu năng:** mở app và bắt đầu ôn trong dưới 2 giây; lật thẻ không bị trễ.
- **Bảo mật:** đăng nhập Google qua Firebase Auth; Security Rules chỉ cho phép mỗi người đọc/ghi dữ liệu của chính mình.
- **Chi phí:** nằm trong gói miễn phí với quy mô dùng cá nhân (vài nghìn thẻ, vài trăm lượt ôn mỗi ngày).

---

## 5. Kiến trúc & công nghệ đề xuất

| Lớp | Đề xuất | Ghi chú |
|---|---|---|
| Frontend | **React + TypeScript + Vite, dạng SPA** | Giao diện bằng Tailwind CSS. Không dùng Next.js — blog có SEO sau này tách thành project riêng |
| PWA | `vite-plugin-pwa` | Manifest, service worker, cài lên màn hình chính |
| Đăng nhập | Firebase Authentication (Google) | Gói Spark |
| Dữ liệu | Cloud Firestore | Gói Spark, chế độ offline, đồng bộ thời gian thực |
| Lịch ôn | `ts-fsrs` | Chạy phía client |
| Thông báo | Firebase Cloud Messaging + **Cloudflare Workers Cron** | Xem mục 3.6 |
| Hosting | **Cloudflare Workers** (Static Assets) | Giao diện mới của Cloudflare tạo Worker chứ không phải Pages. Một Worker vừa phục vụ `dist/`, vừa proxy auth, và M4 sẽ gắn luôn Cron vào đây |
| Tên miền | **Chưa có** | Đang dùng `life-assistant.tan14012004.workers.dev`. Mua tên miền sau, không chặn M2–M5 |

**Lưu ý vận hành — đăng nhập trên iOS:** Safari chặn third-party storage, nên luồng `signInWithRedirect` qua `<project>.firebaseapp.com` im lặng thất bại trong PWA đã cài (`getRedirectResult` trả `null`, không ném lỗi). Worker phải proxy `/__/auth/*` và `VITE_FIREBASE_AUTH_DOMAIN` phải trỏ về chính domain của app. Kèm theo đó, `https://<domain>/__/auth/handler` phải được đăng ký trong **Authorized redirect URIs** của OAuth client bên Google Cloud Console. Xem `worker/index.ts`.

**Định hướng mở rộng thành life assistant**
- Đường dẫn theo module: `/flashcards`, `/planner`, `/habits`, `/blog`… (hoặc mỗi module một subdomain).
- Các phần dùng chung: `auth`, `notifications`, `ui`, `settings`.
- Dữ liệu tách theo module dưới cùng một người dùng: `users/{uid}/flashcards/...`, `users/{uid}/habits/...`.
- (Về sau) Mở một API hoặc MCP server để Claude đọc/ghi thẳng vào dữ liệu: tạo bộ thẻ, xem thẻ hay quên, lên kế hoạch tuần…

---

## 6. Mô hình dữ liệu (Firestore)

```
users/{uid}
  ├─ displayName, email, createdAt
  ├─ settings: { newPerDay, maxReviewsPerDay, desiredRetention, reminderTime, timezone }
  │
  ├─ decks/{deckId}
  │    name, description, tags[], sourceUrl, createdAt, updatedAt, archived
  │
  ├─ cards/{cardId}
  │    deckId, term, definition, pronunciation, partOfSpeech,
  │    example, synonyms[], antonyms[], wordFamily, myExample, tags[],
  │    createdAt, updatedAt,
  │    srs: { due, stability, difficulty, reps, lapses, state, lastReview }
  │
  ├─ reviewLogs/{logId}
  │    cardId, deckId, rating (1–4), reviewedAt, elapsedDays, scheduledDays, mode
  │
  └─ pushTokens/{tokenId}
       token, device, createdAt
```

- Lấy thẻ đến hạn: `cards where srs.due <= now order by srs.due`, cần tạo composite index.
- Thẻ để cùng một collection (không lồng trong deck) để dễ truy vấn thẻ đến hạn trên tất cả các bộ.

---

## 7. Quy trình sử dụng chính

1. Học bài nghe/đọc, ghi từ vựng vào **Notion** (ENGLISH › Study4 Listening).
2. Nhờ **Claude (skill vocab-coach)** tạo thẻ từ, bài tập, chấm bài, rồi **xuất file TSV**.
3. Mở web, chọn **Tạo bộ thẻ**, dán TSV, xem trước rồi lưu.
4. Mỗi tối nhận thông báo, mở app trên iPhone và ôn 10–15 phút.
5. Thẻ hay quên tự động có tag `can-on-ky`, dùng cho các buổi ôn sau với Claude.

---

## 8. Lộ trình

| Mốc | Nội dung | Kết quả |
|---|---|---|
| ~~**M0 — Chuẩn bị**~~ ✅ | Repo Vite + TS + Tailwind, Firebase `life-assistant-1401` (Spark), deploy qua Cloudflare Workers | Chạy tại `life-assistant.tan14012004.workers.dev` |
| ~~**M1 — Nền tảng**~~ ✅ | Đăng nhập Google, layout bottom-tab, PWA cài lên iPhone | Đăng nhập được trong PWA trên iPhone |
| ~~**M2 — Bộ thẻ**~~ ✅ | CRUD bộ thẻ và thẻ, nhập TSV có xem trước, sắp xếp ABC, tìm kiếm | Đã nhập bộ 59 từ bài đại bàng |
| ~~**M3 — Ôn tập**~~ ✅ | FSRS, phiên ôn hằng ngày, 4 mức đánh giá, 4 kiểu hỏi, phát âm TTS, màn hình chọn phạm vi ôn | Ôn tập hằng ngày được |
| ~~**M4 — Nhắc nhở**~~ ✅ | Web push (FCM) + Cloudflare Worker Cron mỗi 15 phút, nút gửi thử | Đã nhận thông báo trên iPhone (16/10/2026) |
| ~~**M5 — Hoàn thiện**~~ ✅ | Thống kê, streak, offline, xuất/nhập sao lưu, trang hướng dẫn nhập | Dùng ổn định hằng ngày |
| Sau đó | Module kế hoạch, thói quen, blog; API/MCP cho Claude | Life assistant |

---

## 9. Quyết định đã chốt (13/10/2026)

| Câu hỏi | Quyết định |
|---|---|
| Next.js hay React + Vite? | **React + Vite, SPA.** Blog SEO sau này làm project riêng |
| Tên miền | **Chưa mua.** Dùng `<ten-project>.pages.dev`; flashcard đặt ở đường dẫn con `/flashcards` |
| Firebase Blaze để dùng Cloud Functions? | **Không.** Giữ gói Spark, job theo lịch dùng **Cloudflare Workers Cron** |
| Hosting | **Cloudflare Pages** (kèm Workers Cron cho nhắc nhở) |
| Đa người dùng ngay từ đầu? | **Không.** Một user chính, không làm UI chia sẻ. Data vẫn tách theo `users/{uid}` để không chặn mở rộng |
| Nhập `.apkg` của Anki? | **Sau MVP.** Không làm trong M0–M5 |

**Còn để ngỏ, quyết sau:**
- [ ] Tên miền riêng: mua khi nào, tên gì.
- [ ] Có mở API/MCP server cho Claude đọc/ghi dữ liệu không (sau khi M5 xong).

---

## 10. Phụ lục — Định dạng nhập TSV

| Cột | Tên | Bắt buộc | Ví dụ |
|---|---|---|---|
| 1 | Từ | ✓ | `pose a threat` |
| 2 | Định nghĩa | ✓ | `gây ra mối đe dọa — pose a threat TO sth` |
| 3 | Phát âm | | `/poʊz ə θret/` |
| 4 | Loại từ | | `phr` |
| 5 | Ví dụ | | `Plastic waste poses a serious threat to sea birds.` |
| 6 | Đồng nghĩa | | `threaten; endanger` |
| 7 | Trái nghĩa *(mở rộng)* | | `protect; safeguard` |
| 8 | Tags *(mở rộng)* | | `can-on-ky` |

Cột 1–6 tương thích với định dạng nhập của OpenQuiz. Cột 7–8 là phần mở rộng riêng của dự án; nếu dòng nào thiếu hai cột này thì coi như để trống.

**Đối chiếu với file thật (`eagles.tsv`, 59 dòng, 15/10/2026):**
- File do `vocab-coach` xuất ra hiện **chỉ có 6 cột**, mọi dòng đều đủ 6. Cột 7–8 chưa được dùng.
- **Trái nghĩa nằm bên trong cột 2** dưới dạng `(TN: deliberate, intentional)`, không tách riêng.
- `partOfSpeech` có giá trị ngoài danh sách gợi ý: `phrasal v`, `collocation`, `phr`, `n, v`, `n, adj` → để **field tự do**, không ràng buộc enum.
- `term` có thể chứa `/` (`protected area / sanctuary`, `prevent sb/sth from V-ing`) → **không được tách term theo `/`**.
- `pronunciation` có thể chứa nhiều IPA kèm chú thích (`/ˈkɑːnflɪkt/ (n), /kənˈflɪkt/ (v)`).
