# Vibe - HCMUT Tutoring Platform

Nền tảng kết nối sinh viên với tutor tại Đại học Bách khoa TP.HCM.

## 🚀 Tính năng

- **Đăng ký & Đăng nhập** - Xác thực JWT, phân quyền Student/Tutor/Admin
- **Hồ sơ cá nhân** - Tutor: chuyên môn, lịch rảnh | Student: môn cần hỗ trợ
- **Quản lý Session** - Tạo, đăng ký, bắt đầu, hoàn thành buổi học
- **Chat realtime** - Nhắn tin giữa tutor và student
- **Đánh giá & Feedback** - Rating sau mỗi buổi học
- **Thông báo** - Realtime notifications
- **Điểm rèn luyện** - Tự động cộng điểm khi hoàn thành session

## 🛠️ Tech Stack

| Frontend     | Backend           | Database |
| ------------ | ----------------- | -------- |
| React + Vite | Node.js + Express | MongoDB  |
| Tailwind CSS | Socket.IO         | Mongoose |

## 📦 Cài đặt

### 1. Clone & Install

```bash
git clone https://github.com/HeroKeyboardUT/Vibe.git
cd Vibe
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Cấu hình Backend

Tạo file `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/vibe
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### 3. Chạy ứng dụng

```bash
# Từ thư mục gốc - chạy cả frontend & backend
npm start

# Hoặc chạy riêng
cd backend && npm start    # Backend: http://localhost:5000
cd frontend && npm run dev # Frontend: http://localhost:5173
```

## 📁 Cấu trúc

```
Vibe/
├── backend/
│   ├── controller/    # API handlers
│   ├── model/         # Mongoose schemas
│   ├── route/         # Express routes
│   ├── middleware/    # Auth, validation
│   └── utils/         # Helpers, schedulers
├── frontend/
│   └── src/
│       ├── components/  # Reusable UI
│       ├── pages/       # Page components
│       ├── context/     # React context
│       └── services/    # API calls
└── package.json
```

## 👥 Tài khoản test

| Role    | Email                | Password   |
| ------- | -------------------- | ---------- |
| Admin   | admin@hcmut.edu.vn   | admin123   |
| Tutor   | tutor@hcmut.edu.vn   | tutor123   |
| Student | student@hcmut.edu.vn | student123 |

## 📝 License

MIT
