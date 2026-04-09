# 🐷 Smart Sow Management — v1.0

ระบบจัดการแม่พันธุ์สุกรอัจฉริยะ  
React + Supabase + Vercel | รองรับมือถือ

---

## 📦 Tech Stack

| ชั้น | เทคโนโลยี |
|------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Routing | React Router v6 |
| Dates | date-fns |

---

## 🚀 วิธี Deploy ขึ้น Vercel

### 1. เตรียม Supabase

1. เข้า [supabase.com](https://supabase.com) → Project ของคุณ
2. ไปที่ **SQL Editor** → รัน `supabase_schema.sql` ที่สร้างไว้
3. ไปที่ **Settings → API** คัดลอก:
   - `Project URL`
   - `anon / public key`

### 2. สร้าง Worker accounts

ใน Supabase Dashboard → **Authentication → Users → Add User**  
สร้าง 1 account ต่อ 1 คนงาน

จากนั้นรัน SQL นี้ใน SQL Editor (แทนค่า UUID จาก Users page):

```sql
-- สร้างฟาร์มก่อน
INSERT INTO farms (name, owner_name, phone, line_token)
VALUES ('นิพนธ์ฟาร์ม', 'คุณอ๊อด', '08x-xxx-xxxx', 'your_line_notify_token')
RETURNING id;

-- จากนั้นสร้าง worker โดยใช้ UUID ที่ได้จาก farms และ auth.users
INSERT INTO workers (id, farm_id, full_name, nickname, role)
VALUES 
  ('uuid-from-auth-user-1', 'uuid-from-farms', 'ชื่อเต็มคนงาน 1', 'ชื่อเล่น', 'owner'),
  ('uuid-from-auth-user-2', 'uuid-from-farms', 'ชื่อเต็มคนงาน 2', 'ชื่อเล่น', 'staff'),
  ('uuid-from-auth-user-3', 'uuid-from-farms', 'ชื่อเต็มคนงาน 3', 'ชื่อเล่น', 'staff');

-- สร้างคอกตัวอย่าง
INSERT INTO pens (farm_id, pen_code, pen_type, capacity)
VALUES
  ('uuid-from-farms', 'A1', 'mating', 1),
  ('uuid-from-farms', 'A2', 'mating', 1),
  ('uuid-from-farms', 'B1', 'gestation', 5),
  ('uuid-from-farms', 'C1', 'farrowing', 1),
  ('uuid-from-farms', 'C2', 'farrowing', 1);
```

### 3. Clone & ตั้งค่า Local

```bash
git clone <your-repo>
cd sow-farm-app
cp .env.example .env.local
```

แก้ไข `.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

### 4. Deploy ไป Vercel

**วิธีที่ 1: Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

**วิธีที่ 2: GitHub Integration (แนะนำ)**
1. Push code ขึ้น GitHub
2. เข้า [vercel.com](https://vercel.com) → New Project → Import GitHub
3. ตั้ง Environment Variables:
   ```
   VITE_SUPABASE_URL = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ...
   ```
4. กด Deploy — เสร็จ!

---

## 📱 หน้าจอในแอป

| หน้า | URL | คำอธิบาย |
|------|-----|----------|
| Login | `/login` | เข้าสู่ระบบด้วย email/password |
| Dashboard | `/` | KPI, แจ้งเตือนวันนี้, ใกล้คลอด |
| รายชื่อแม่หมู | `/sows` | ค้นหา, กรองตามสถานะ |
| เพิ่มแม่หมู | `/sows/add` | ฟอร์มเพิ่มแม่หมูใหม่ |
| รายละเอียด | `/sows/:id` | Timeline, ประวัติ, บันทึก |
| บันทึกเหตุการณ์ | `/sows/:id/record/:cycleId?step=X` | ฟอร์มแต่ละขั้นตอน |
| การแจ้งเตือน | `/alerts` | รายการแจ้งเตือนทั้งหมด |

---

## 🔔 ระบบแจ้งเตือนอัตโนมัติ

เมื่อบันทึกการผสมพันธุ์ — PostgreSQL Trigger สร้าง alerts อัตโนมัติ:

| วัน | กิจกรรม | Priority |
|-----|---------|----------|
| D+21 | ตรวจสัด | ปกติ |
| D+30 | อัลตราซาวด์ | ปกติ |
| D+85 | เพิ่มอาหาร | แจ้งล่วงหน้า |
| D+108 | ย้ายคอกคลอด | ด่วน |
| D+114 | วันกำหนดคลอด | ด่วนมาก |
| คลอด+21 | หย่านม | ปกติ |
| คลอด+26 | ผสมรอบใหม่ | ปกติ |

---

## 📂 โครงสร้างไฟล์

```
src/
├── lib/
│   └── supabase.js        # Supabase client + API functions
├── contexts/
│   └── AuthContext.jsx    # Authentication state
├── components/
│   ├── Layout.jsx         # App shell
│   ├── BottomNav.jsx      # Navigation bar
│   ├── StatusBadge.jsx    # สถานะแม่หมู
│   ├── SowCard.jsx        # Card แม่หมูในรายการ
│   └── MilestoneTimeline.jsx # Timeline วงจร
├── pages/
│   ├── Login.jsx          # หน้า Login
│   ├── Dashboard.jsx      # หน้าหลัก
│   ├── Sows.jsx           # รายชื่อแม่หมู
│   ├── SowDetail.jsx      # รายละเอียดแม่หมู
│   ├── AddSow.jsx         # เพิ่ม/แก้ไขแม่หมู
│   ├── RecordEvent.jsx    # บันทึกทุกขั้นตอน
│   └── Alerts.jsx         # การแจ้งเตือน
└── App.jsx                # Router
```

---

## 🔧 Customization

### เพิ่มคอก (pens)
รัน SQL ใน Supabase:
```sql
INSERT INTO pens (farm_id, pen_code, pen_type, capacity)
VALUES ('your-farm-id', 'D1', 'farrowing', 1);
```

### เพิ่มพ่อพันธุ์ (boars)
```sql
INSERT INTO boars (farm_id, boar_code, breed)
VALUES ('your-farm-id', 'B001', 'Duroc');
```

### ปรับ Alert ล่วงหน้า (days advance)
แก้ใน `v_alerts_today` view:
```sql
AND a.due_date <= CURRENT_DATE + 3  -- เปลี่ยนตัวเลขนี้
```

---

## 🐛 Known Issues / Roadmap v1.1

- [ ] Push notification (Web Push API)
- [ ] LINE Notify / Telegram Bot integration  
- [ ] รายงาน PDF ประจำเดือน
- [ ] สแกน QR code แทนการพิมพ์รหัส
- [ ] Health records management page
- [ ] Offline mode (PWA)
