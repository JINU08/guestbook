# 📖 Firebase & Cloudinary 온라인 방명록 (Guestbook)

Firebase Cloud Firestore와 Cloudinary를 연동한 반응형 온라인 방명록 웹 애플리케이션입니다.
텍스트 메시지와 함께 사진(이미지)을 자유롭게 첨부하여 등록할 수 있습니다.

---

## 📷 Cloudinary 이미지 업로드 설정 정보
- **Cloud Name**: `x1virehd`
- **Upload Preset**: `guestbook` (Unsigned)
- 사용자가 첨부한 이미지는 Cloudinary를 통해 다이렉트 업로드되며, 생성된 안전한 이미지 URL(`secure_url`)이 Firestore 방명록 문서에 저장됩니다.

---

## 🚀 로컬에서 실행하는 방법

웹 브라우저의 ES Module 보안 정책(CORS)으로 인해, HTML 파일을 더블 클릭하여 `file://` 경로로 열기보다는 **로컬 웹 서버**를 통해 실행하는 것을 권장합니다.

### 방법 1. VS Code Live Server (가장 추천)
1. VS Code에서 `index.html` 파일을 엽니다.
2. 마우스 우클릭 후 **"Open with Live Server"** 를 클릭합니다.

### 방법 2. Python 로컬 서버
터미널(PowerShell 또는 명령 프롬프트)에서 아래 명령어를 실행합니다:
```bash
python -m http.server 3000
```
그 후 브라우저에서 `http://localhost:3000` 으로 접속합니다.

### 방법 3. Node.js npx serve
```bash
npx serve .
```

---

## ⚙️ Firebase Console 필수 설정 안내

방명록이 정상적으로 데이터를 읽고 쓰려면 **Firebase 콘솔에서 Firestore 데이터베이스를 활성화하고 보안 규칙을 설정**해야 합니다.

1. **[Firebase Console](https://console.firebase.google.com/)** 접속 후 `guestbook` 프로젝트 선택
2. 왼쪽 메뉴 **빌드(Build)** > **Firestore Database** 클릭
3. **데이터베이스 만들기(Create Database)** 클릭
   - 위치(Location): `asia-northeast3 (Seoul)` 또는 가까운 리전 선택
   - 보안 규칙: **테스트 모드로 시작(Start in test mode)** 선택 후 [사용 설정] 클릭
4. **보안 규칙(Rules) 탭 확인**:
   모든 사용자가 방명록을 읽고 쓸 수 있도록 규칙을 다음과 같이 설정합니다:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /guestbook/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   설정 후 **[게시(Publish)]** 버튼을 누르면 즉시 방명록 등록과 조회가 가능해집니다.
