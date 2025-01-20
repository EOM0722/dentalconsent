// 전역 변수 선언
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let previousWidth = 0;

// API 엔드포인트 설정
const API_URL = 'https://dentalconsent.ngrok.app';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykMoNg3OZOTqxEnCDYfx63yJhZjvT-bzkPMPHTsazoouFHNYflOwy5GLL86SGRmPNa/exec';

// 서명 패드 초기화
document.addEventListener('DOMContentLoaded', function () {
    // 동의 여부 선택 폼 이벤트 리스너 추가
    const consentForm = document.getElementById('consentForm');
    if (consentForm) {
        consentForm.addEventListener('submit', handleConsentSubmit);
    }

    // 기존 동의서 페이지 초기화 (contact.html에서 실행)
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        initializeConsentForm();
    }
});

// 동의 여부 선택 처리
function handleConsentSubmit(event) {
    event.preventDefault();
    const consent = document.querySelector('input[name="consent"]:checked');
    
    if (!consent) {
        alert("동의 여부를 선택해주세요.");
        return;
    }

    if (consent.value === "agree") {
        window.location.href = "contact.html";
    } else {
        alert("문진 페이지로 이동합니다.");
        window.location.href = "https://www.appleden.com/";
    }
}

// 동의서 페이지 초기화 함수
function initializeConsentForm() {
    initializeCanvas();
    populateBirthDateDropdowns();
    displayCurrentDate();
}

// 캔버스 초기화 함수
function initializeCanvas() {
    canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');

    function setCanvasSize() {
        const containerWidth = canvas.parentElement.offsetWidth - 20;
        if (containerWidth !== previousWidth) {
            const existingContent = canvas.toDataURL();
            canvas.width = containerWidth;
            canvas.height = 200;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            const img = new Image();
            img.src = existingContent;
            img.onload = () => ctx.drawImage(img, 0, 0);

            previousWidth = containerWidth;
        }
    }

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 터치 이벤트
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', () => (isDrawing = false));

    preventCanvasResetOnInput();
}

// 생년월일 드롭다운 옵션 생성
function populateBirthDateDropdowns() {
    const yearSelect = document.getElementById('birthYear');
    const monthSelect = document.getElementById('birthMonth');
    const daySelect = document.getElementById('birthDay');

    if (!yearSelect || !monthSelect || !daySelect) return;

    // 년도 옵션 (현재 년도부터 100년 전까지)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 100; year--) {
        const option = new Option(year, year);
        yearSelect.add(option);
    }

    // 월 옵션
    for (let month = 1; month <= 12; month++) {
        const option = new Option(month, month);
        monthSelect.add(option);
    }

    // 일 옵션 업데이트 함수
    function updateDays() {
        const year = parseInt(yearSelect.value);
        const month = parseInt(monthSelect.value);
        const daysInMonth = new Date(year, month, 0).getDate();

        daySelect.innerHTML = '<option value="">일 선택</option>';
        for (let day = 1; day <= daysInMonth; day++) {
            const option = new Option(day, day);
            daySelect.add(option);
        }
    }

    yearSelect.addEventListener('change', updateDays);
    monthSelect.addEventListener('change', updateDays);

    updateDays();
}

// 현재 날짜 표시
function displayCurrentDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (!currentDateElement) return;

    const currentDate = new Date();
    const dateString = currentDate.getFullYear() + '년 ' + 
                      (currentDate.getMonth() + 1) + '월 ' + 
                      currentDate.getDate() + '일';
    currentDateElement.textContent = dateString;
}

// 터치 이벤트 처리
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    isDrawing = true;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
}

// 마우스 드로잉 함수들
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
}

function clearSignature() {
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function preventCanvasResetOnInput() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', (e) => e.stopPropagation());
    });
}

// 서명 저장
async function saveSignature() {
    const signatureData = canvas.toDataURL('image/png');
    const name = document.getElementById('name').value;

    console.log('서명 저장 시도...');

    try {
        const response = await fetch(`${API_URL}/save-signature`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                signature: signatureData,
                name: name,
            }),
        });

        const data = await response.json();
        if (data.success) {
            console.log('서명이 성공적으로 저장되었습니다:', data.filename);
            return true;
        } else {
            console.error('서명 저장 실패:', data.error);
            return false;
        }
    } catch (error) {
        console.error('서명 저장 중 오류 발생:', error);
        return false;
    }
}

// 폼 제출
async function submitForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    // 폼 데이터 수집
    const name = document.getElementById('name').value;
    const birthYear = document.getElementById('birthYear').value;
    const birthMonth = String(document.getElementById('birthMonth').value).padStart(2, '0');
    const birthDay = String(document.getElementById('birthDay').value).padStart(2, '0');
    const birthdate = `${birthYear}-${birthMonth}-${birthDay}`;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const gender = document.getElementById('gender').value;
    const currentDate = new Date();
    const consentDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const consent = document.getElementById('consent').checked;

    if (!consent) {
        alert('인체유래물등 기증 동의가 필요합니다.');
        return;
    }

    // 서명 저장
    const isSignatureSaved = await saveSignature();
    if (!isSignatureSaved) {
        alert('서명 저장 중 오류가 발생했습니다.');
        return;
    }

    // 구글 스크립트 API 호출
    const xhr = new XMLHttpRequest();
    xhr.open('POST', GOOGLE_SCRIPT_URL);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                document.getElementById('submitSuccessMessage').classList.remove('d-none');
                form.reset();
                clearSignature();
                // 동의서 제출 후 건강검진 페이지로 이동
                window.location.href = 'https://www.appleden.com/';
            } else {
                document.getElementById('submitErrorMessage').classList.remove('d-none');
            }
            document.getElementById('submitButton').disabled = false;
        }
    };

    const formData = `name=${encodeURIComponent(name)}&birthdate=${encodeURIComponent(birthdate)}&address=${encodeURIComponent(address)}&phone=${encodeURIComponent(phone)}&gender=${encodeURIComponent(gender)}&consentDate=${encodeURIComponent(consentDate)}&consent=${encodeURIComponent(consent)}`;

    xhr.send(formData);
    document.getElementById('submitButton').disabled = true;
}
