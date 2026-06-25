# Permissions — MobileMetaherb

แอปขอสิทธิ์ **6 อย่าง** ทั้งหมดขอ **on-demand** (ตอนผู้ใช้แตะใช้ฟีเจอร์นั้นครั้งแรก ไม่ขอตอนเปิดแอป)
ระบบ (iOS) เด้ง popup ขออนุญาตให้เอง โดยใช้ข้อความจาก `ios/MobileMetaherbRN/Info.plist`

| # | สิทธิ์ | ฟีเจอร์ที่ทริกเกอร์ | ตำแหน่งในโค้ด | iOS key (Info.plist) | โมดูล | Android |
|---|---|---|---|---|---|---|
| 1 | 📷 กล้อง | รีวิวสินค้า (ถ่ายรูป) | `OrderReviewScreen.tsx:86` | `NSCameraUsageDescription` | expo-image-picker | `CAMERA` |
| | | แชทร้านค้า (แนบรูปถ่าย) | `ChatScreen.tsx:301` | | | |
| | | แจ้งปัญหา (ถ่ายหลักฐาน) | `ComplaintFormScreen.tsx:89` | | | |
| | | รูปโปรไฟล์ (ถ่าย) | `AccountInfoScreen.tsx:145` | | | |
| 2 | 🖼️ คลังรูปภาพ | เลือกรูปรีวิว | `OrderReviewScreen.tsx:94` | `NSPhotoLibraryUsageDescription` | expo-image-picker | `READ_MEDIA_IMAGES` |
| | | แชท (เลือกรูป) | `ChatScreen.tsx:309` | | | |
| | | แจ้งปัญหา (เลือกรูป) | `ComplaintFormScreen.tsx:94` | | | |
| | | รูปโปรไฟล์ (เลือก) | `AccountInfoScreen.tsx:145` | | | |
| | | โลโก้ร้าน (สมัครร้านค้า) | `SellerRegisterScreen.tsx:64` | | | |
| 3 | 🎙️ ไมโครโฟน | สั่งงาน AI ด้วยเสียง | `AIAssistantScreen.tsx:178` | `NSMicrophoneUsageDescription` | expo-speech-recognition | `RECORD_AUDIO` |
| 4 | 🗣️ การรู้จำเสียงพูด | แปลงเสียง→ข้อความ (เมต้า) | `AIAssistantScreen.tsx:178` (ขอพร้อมไมค์) | `NSSpeechRecognitionUsageDescription` | expo-speech-recognition | (ใช้ `RECORD_AUDIO`) |
| 5 | 🔔 การแจ้งเตือน | รับการแจ้งเตือน | `NotificationTestScreen.tsx:80` | (ไม่ต้องมี key) | expo-notifications | `POST_NOTIFICATIONS` |
| 6 | 🔐 Face ID / Touch ID | ยืนยันตัวตน (ตั้งค่า/ชำระเงิน) | `SecurityContext.tsx` (`requirePin` / `authenticateBiometric`) | `NSFaceIDUsageDescription` | expo-local-authentication | `USE_BIOMETRIC` |

## หมายเหตุ
- **เล่นเสียง AI (TTS / ElevenLabs)** ไม่ต้องขอสิทธิ์ — การ "เล่น" เสียงไม่ต้อง permission (มีแค่การ "อัด" ที่ต้องขอ)
- กล้อง/แกลเลอรี: `OrderReview`, `Chat`, `Complaint` เรียก `requestCameraPermissionsAsync` / `requestMediaLibraryPermissionsAsync` ตรงๆ ก่อนเปิด · ส่วน `SellerRegister`, `AccountInfo` ใช้ `launchImageLibraryAsync`/`launchCameraAsync` ซึ่ง expo-image-picker ขอสิทธิ์ให้อัตโนมัติ
- ทุกโมดูล native ห่อด้วย guard (`getImagePicker` / `getSpeech` / `getTts` / `getNotifications`) → ถ้าโมดูลไม่พร้อม (เช่นยังไม่ rebuild) จะ no-op ไม่แครช
- ข้อความขออนุญาต (ภาษาไทย) ทั้งหมดอยู่ใน `ios/MobileMetaherbRN/Info.plist`

## TODO (UX เสริม — ยังไม่ทำ)
- ตอนผู้ใช้กด "Don't Allow" → ปุ่ม **"เปิดการตั้งค่า"** (`Linking.openSettings()`) เพราะ iOS ไม่เด้ง popup ซ้ำ ต้องไปเปิดเองใน Settings (ตอนนี้แสดงแค่ Alert แจ้งเตือน)
- ข้อความเกริ่นก่อนขอสิทธิ์ (priming) — optional
