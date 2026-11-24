import { 
    db, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "./firebase-config.js";

// Cloudinary 업로드 설정
const CLOUDINARY_CLOUD_NAME = "x1virehd";
const CLOUDINARY_UPLOAD_PRESET = "guestbook";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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

// 이미지 업로드 관련 DOM 요소
const imageFileInput = document.getElementById("image-file");
const fileUploadLabel = document.getElementById("file-upload-label");
const previewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const fileNameSpan = document.getElementById("image-file-name");
const removeImageBtn = document.getElementById("remove-image-btn");

// 이미지 모달 DOM 요소
const imageModal = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const modalCloseBtn = document.getElementById("modal-close-btn");

// 첨부할 이미지 파일 상태 및 미리보기 URL
let selectedImageFile = null;
let currentPreviewUrl = null;

// Firestore 컬렉션 참조 ('guestbook' 컬렉션 사용)
const guestbookColRef = collection(db, "guestbook");

// 글자 수 실시간 카운트
messageInput.addEventListener("input", () => {
    charNum.textContent = messageInput.value.length;
});

// 이미지 선택 초기화 함수
function clearSelectedImage() {
    selectedImageFile = null;
    imageFileInput.value = "";
    if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
        currentPreviewUrl = null;
    }
    imagePreview.src = "";
    fileNameSpan.textContent = "";
    previewContainer.classList.add("hidden");
    fileUploadLabel.classList.remove("has-file");
}

// 이미지 파일 선택 시 이벤트 처리
imageFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // 이미지 파일 형식 검사
    if (!file.type.startsWith("image/")) {
        showToast("이미지 파일(JPG, PNG, GIF, WebP 등)만 첨부할 수 있습니다.", "error");
        clearSelectedImage();
        return;
    }

    // 파일 크기 제한 (최대 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast("이미지 용량은 최대 10MB까지 가능합니다.", "error");
        clearSelectedImage();
        return;
    }

    selectedImageFile = file;

    // 기존 ObjectURL 정리
    if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
    }
    currentPreviewUrl = URL.createObjectURL(file);
    imagePreview.src = currentPreviewUrl;
    fileNameSpan.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    previewContainer.classList.remove("hidden");
    fileUploadLabel.classList.add("has-file");
});

// 이미지 삭제 버튼 클릭 시
removeImageBtn.addEventListener("click", () => {
    clearSelectedImage();
    showToast("첨부된 사진이 취소되었습니다.", "info");
});

// Cloudinary에 이미지 업로드 함수
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errMsg = errorJson?.error?.message || `Cloudinary 업로드 실패 (HTTP ${response.status})`;
        throw new Error(errMsg);
    }

    const data = await response.json();
    return data.secure_url || data.url;
}

// 이미지 모달 열기/닫기
function openImageModal(src, alt) {
    modalImage.src = src;
    modalImage.alt = alt || "방명록 이미지";
    imageModal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // 배경 스크롤 방지
}

function closeImageModal() {
    imageModal.classList.add("hidden");
    modalImage.src = "";
    document.body.style.overflow = "";
}

// 모달 닫기 이벤트 리스너들
modalCloseBtn.addEventListener("click", closeImageModal);
imageModal.querySelector(".modal-backdrop").addEventListener("click", closeImageModal);
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !imageModal.classList.contains("hidden")) {
        closeImageModal();
    }
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

    try {
        let uploadedImageUrl = null;

        // 첨부된 이미지가 있을 경우 Cloudinary 업로드 진행
        if (selectedImageFile) {
            submitBtn.querySelector(".btn-text").textContent = "사진 업로드 중...";
            uploadedImageUrl = await uploadToCloudinary(selectedImageFile);
        }

        submitBtn.querySelector(".btn-text").textContent = "방명록 등록 중...";

        // Firestore 저장 데이터 구성
        const postData = {
            name: name,
            message: message,
            createdAt: serverTimestamp() // Firestore 서버 타임스탬프
        };

        if (uploadedImageUrl) {
            postData.imageUrl = uploadedImageUrl;
        }

        // Firestore에 새 방명록 추가
        await addDoc(guestbookColRef, postData);

        // 폼 및 이미지 첨부 상태 초기화
        nameInput.value = "";
        messageInput.value = "";
        charNum.textContent = "0";
        clearSelectedImage();

        showToast("방명록이 성공적으로 등록되었습니다! 🎉", "success");
    } catch (error) {
        console.error("방명록 등록 오류:", error);
        
        // 권한이나 설정 오류 메시지 분기
        if (error.code === "permission-denied") {
            showToast("Firestore 보안 규칙 권한이 없습니다. Firebase Console 설정을 확인해주세요.", "error", 5000);
            setupGuideBanner.classList.remove("hidden");
        } else {
            showToast("등록 중 오류가 발생했습니다: " + error.message, "error", 5000);
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

            // 첨부 이미지가 있는 경우 이미지 렌더링
            let imageHtml = "";
            if (data.imageUrl) {
                const safeUrl = escapeHtml(data.imageUrl);
                imageHtml = `
                    <div class="message-image-wrapper">
                        <img 
                            src="${safeUrl}" 
                            alt="${safeName}님의 방명록 첨부 사진" 
                            class="message-image" 
                            loading="lazy"
                            title="클릭하여 원본 사진 보기"
                        />
                        <div class="image-zoom-hint">🔍 클릭하여 확대</div>
                    </div>
                `;
            }

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
                    ${imageHtml}
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

// 메시지 목록 내 이미지 클릭 시 모달 확대 이벤트 위임
messagesList.addEventListener("click", (e) => {
    const clickedImage = e.target.closest(".message-image");
    if (clickedImage) {
        openImageModal(clickedImage.src, clickedImage.alt);
    }
});

// 초기 구독 시작
subscribeGuestbook();
