import { 
    db, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "./firebase-config.js";

// DOM 요소 선택
const guestbookForm = document.getElementById("guestbook-form");
const nameInput = document.getElementById("user-name");
const messageInput = document.getElementById("user-message");
const charNum = document.getElementById("char-num");
const submitBtn = document.getElementById("submit-btn");
const messagesList = document.getElementById("messages-list");
const totalCount = document.getElementById("total-count");
const loadingState = document.getElementById("loading-state");
const emptyState = document.getElementById("empty-state");
const setupGuideBanner = document.getElementById("setup-guide-banner");
const toast = document.getElementById("toast");

// Firestore 컬렉션 참조 ('guestbook' 컬렉션 사용)
const guestbookColRef = collection(db, "guestbook");

// 글자 수 실시간 카운트
messageInput.addEventListener("input", () => {
    charNum.textContent = messageInput.value.length;
});

// 토스트 메시지 띄우기 함수
function showToast(message, type = "info", duration = 3000) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, duration);
}

// 시간 포맷팅 함수 (방금 전, n분 전, n시간 전, 또는 날짜)
function formatTime(timestamp) {
    if (!timestamp) return "방금 전";
    
    // Firestore Timestamp 객체인지 확인
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) {
        return "방금 전";
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes}분 전`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours}시간 전`;
    } else {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    }
}

// 아바타 배경색 생성을 위한 해시 함수
function getAvatarColor(name) {
    const colors = [
        ["#ec4899", "#f43f5e"], // pink
        ["#8b5cf6", "#6366f1"], // indigo-purple
        ["#3b82f6", "#06b6d4"], // blue-cyan
        ["#10b981", "#14b8a6"], // emerald-teal
        ["#f59e0b", "#f97316"], // amber-orange
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return `linear-gradient(135deg, ${colors[index][0]} 0%, ${colors[index][1]} 100%)`;
}

// HTML 특수문자 이스케이프 (XSS 방지)
function escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}

// 1. 방명록 등록 이벤트 처리
guestbookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    // 유효성 검사: 이름 또는 메시지가 비어있는 경우
    if (!name) {
        showToast("작성자 이름을 입력해주세요.", "error");
        nameInput.focus();
        return;
    }

    if (!message) {
        showToast("방명록 메시지를 입력해주세요.", "error");
        messageInput.focus();
        return;
    }

    // 버튼 비활성화 (중복 클릭 방지)
    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-text").textContent = "등록 중...";

    try {
        // Firestore에 새 방명록 추가
        await addDoc(guestbookColRef, {
            name: name,
            message: message,
            createdAt: serverTimestamp() // Firestore 서버 타임스탬프
        });

        // 폼 초기화
        nameInput.value = "";
        messageInput.value = "";
        charNum.textContent = "0";
        showToast("방명록이 성공적으로 등록되었습니다! 🎉", "success");
    } catch (error) {
        console.error("Firestore 등록 오류:", error);
        
        // 권한이나 설정 오류 메시지 분기
        if (error.code === "permission-denied") {
            showToast("Firestore 보안 규칙 권한이 없습니다. Firebase Console 설정을 확인해주세요.", "error", 5000);
            setupGuideBanner.classList.remove("hidden");
        } else {
            showToast("등록 중 오류가 발생했습니다: " + error.message, "error", 4000);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-text").textContent = "방명록 등록하기";
    }
});

// 2. Firestore 실시간 데이터 구독 (최근 작성글이 위로 정렬: createdAt desc)
function subscribeGuestbook() {
    // createdAt 기준 내림차순 정렬 쿼리
    const q = query(guestbookColRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        loadingState.classList.add("hidden");
        setupGuideBanner.classList.add("hidden");

        const count = snapshot.size;
        totalCount.textContent = count;

        if (count === 0) {
            emptyState.classList.remove("hidden");
            messagesList.innerHTML = "";
            return;
        }

        emptyState.classList.add("hidden");
        
        // 카드 렌더링
        const cardsHtml = snapshot.docs.map((doc) => {
            const data = doc.data();
            const safeName = escapeHtml(data.name || "익명");
            const safeMessage = escapeHtml(data.message || "");
            const formattedTime = formatTime(data.createdAt);
            const initial = safeName.charAt(0).toUpperCase();
            const avatarBg = getAvatarColor(safeName);

            return `
                <article class="message-card" data-id="${doc.id}">
                    <div class="message-card-header">
                        <div class="author-info">
                            <div class="avatar" style="background: ${avatarBg}">${initial}</div>
                            <span class="author-name">${safeName}</span>
                        </div>
                        <time class="message-time">${formattedTime}</time>
                    </div>
                    <div class="message-body">${safeMessage}</div>
                </article>
            `;
        }).join("");

        messagesList.innerHTML = cardsHtml;
    }, (error) => {
        console.error("Firestore 실시간 리스너 오류:", error);
        loadingState.classList.add("hidden");

        if (error.code === "permission-denied") {
            showToast("Firestore 권한 오류: 보안 규칙에서 읽기 허용이 필요합니다.", "error", 6000);
            setupGuideBanner.classList.remove("hidden");
        } else if (error.code === "failed-precondition") {
            // 인덱스 필요 오류 등
            showToast("Firestore 색인 또는 사전 설정이 필요합니다.", "error", 5000);
        } else {
            showToast("데이터를 불러오는 중 오류가 발생했습니다.", "error");
        }
    });
}

// 초기 구독 시작
subscribeGuestbook();
