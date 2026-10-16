# Dựng lại dự án trên máy khác

Mọi thứ cần thiết đều đã nằm trong repo, **trừ các khoá bí mật**. Danh sách
dưới đây là những thứ bạn phải tự cung cấp.

## 1. Cài đặt

Cần **Node 20.19+ hoặc 22.12+** (Vite 8 không chạy trên bản thấp hơn). Dự án
đang dùng Node 24 LTS.

```powershell
git clone https://github.com/Dtan141/life-assistant.git
cd life-assistant
npm install
```

Nếu PowerShell báo *"running scripts is disabled"*, chạy một lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## 2. File `.env.local`

Chép từ `.env.example` rồi điền. Sáu biến đầu lấy ở **Firebase Console →
Project settings → Your apps**; biến VAPID lấy ở tab **Cloud Messaging →
Web Push certificates**.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=life-assistant.tan14012004.workers.dev
VITE_FIREBASE_PROJECT_ID=life-assistant-1401
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

⚠️ `VITE_FIREBASE_AUTH_DOMAIN` **phải là domain của chính app**, không phải
`life-assistant-1401.firebaseapp.com`. Lý do ghi trong `CLAUDE.md` — đặt sai
thì đăng nhập trên iPhone hỏng mà không báo lỗi gì.

Mấy biến này **không phải bí mật** (chúng nằm công khai trong bundle), nhưng
`.env.local` vẫn được gitignore để tách môi trường.

## 3. Biến build trên Cloudflare

Đúng bảy biến trên, khai ở **Settings → Builds → Variables** của Worker
`life-assistant`. Sửa biến xong **phải chạy lại build** thì giá trị mới vào
bundle — Vite nhúng chúng lúc build, không phải lúc chạy.

## 4. Hai Worker secret — chỉ cần cho tính năng nhắc nhở

```powershell
npx wrangler login
Get-Content D:\keys\fb-key.json -Raw | npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
npx wrangler secret put FIREBASE_API_KEY
```

- `FIREBASE_SERVICE_ACCOUNT` — nội dung file JSON lấy ở **Firebase Console →
  Project settings → Service accounts → Generate new private key**.
  **Đây là bí mật thật**: nó đọc ghi được toàn bộ Firestore, bỏ qua mọi
  Security Rules. Không commit, không dán vào chat, không để trong thư mục dự
  án. Dùng `Get-Content ... | wrangler secret put` để khỏi dán tay — dán
  nhiều dòng vào PowerShell sẽ in nội dung ra màn hình và làm hỏng lệnh.
- `FIREBASE_API_KEY` — chính là `VITE_FIREBASE_API_KEY`, Worker dùng nó để
  xác minh người gọi endpoint gửi thử.

Kiểm tra: `npx wrangler secret list` phải thấy đúng hai tên, không thấy giá
trị.

## 5. Cấu hình phía Google — làm một lần cho mỗi domain

Nếu đổi domain, hoặc dựng project Firebase mới, phải làm lại:

| Nơi | Việc |
|---|---|
| Firebase → Authentication → Settings → Authorized domains | Thêm domain (không có `https://`, không có `/` cuối) |
| Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client | Thêm `https://<domain>/__/auth/handler` vào **Authorized redirect URIs**, và `https://<domain>` vào **Authorized JavaScript origins** |
| Google Cloud → OAuth consent screen | Để **In production**. Còn **Testing** thì chỉ email trong danh sách test users đăng nhập được |
| Firebase → Firestore → Rules | Dán nội dung `firestore.rules` rồi Publish |

Riêng `worker/index.ts` có hằng số `FIREBASE_AUTH_HOST` trỏ tới
`life-assistant-1401.firebaseapp.com`. Đổi project Firebase thì sửa chỗ đó.

## 6. Kiểm tra đã dựng xong

```powershell
npm test          # 203 test phải pass
npx tsc -b        # không lỗi
npm run dev       # mở localhost:5173, đăng nhập Google được
```

Thông báo đẩy **không test được ở localhost trên iPhone** — phải dùng bản
deploy và phải cài app ra Màn hình chính.

## Những thứ KHÔNG nằm trong repo

- `.env.local` — mục 2
- Service account key — mục 4
- Dữ liệu người dùng — nằm trong Firestore, lấy ra bằng **Cài đặt → Sao lưu**
  trong app. Thư mục `database/` bị gitignore vì chứa dữ liệu cá nhân.
