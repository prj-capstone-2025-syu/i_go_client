importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
    apiKey: "AIzaSyAKw4-LxFYGf4Q7D3qIVtgPggLU9HCi4Bc",
    authDomain: "igo-project-56559.firebaseapp.com",
    projectId: "igo-project-56559",
    storageBucket: "igo-project-56559.firebasestorage.app",
    messagingSenderId: "932057891922",
    appId: "1:932057891922:web:d45582c1010db17b1f8b8b",
    measurementId: "G-GBQRRJX8HP"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// 백그라운드 메시지 핸들러
messaging.onBackgroundMessage((payload) => {
    console.log('백그라운드 메시지 수신:', payload);

    // notification 페이로드가 있으면 시스템이 자동으로 처리하므로 여기서는 아무것도 하지 않음
    // data 페이로드만 있는 경우에만 수동으로 알림 생성
    if (payload.data && !payload.notification) {
        const notificationTitle = payload.data.title || 'IGO 알림';
        const notificationOptions = {
            body: payload.data.body || '새로운 알림이 있습니다.',
            icon: '/logo.png',
            badge: '/logo.png',
            data: payload.data
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    }

    // notification 페이로드가 있으면 시스템이 자동 처리하므로 로그만 출력
    console.log('notification 페이로드 있음 - 시스템이 자동 처리');
});