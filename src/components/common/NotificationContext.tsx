"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getLatestInProgressSchedule } from '@/api/scheduleApi';
import { getRoutineById } from '@/api/routineApi';

// 타입 정의
export type NotificationType =
  | 'ROUTINE_START_REMINDER'
  | 'delayed_routine_item'
  | 'SCHEDULE_START'
  | 'ROUTINE_ITEM_START'
  | 'SUPPLIES_REMINDER'
  | 'SEVERE_WEATHER_ALERT'
  | 'TRAFFIC_DELAY_ALERT'
  | 'GENERIC';

export interface WeatherInfo {
  description: string;
  temperature: string;
  feelsLike: string;
  humidity: string;
  icon: string;
  type: string;
}

export interface RoutineItem {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface RoutineNotificationData {
  name: string;
  subtitle?: string;
  type?: NotificationType;
  weatherInfo?: WeatherInfo | null;
}

export interface NotificationData {
  title?: string;
  message?: string;
  [key: string]: unknown;
}

interface NotificationContextType {
  isOpen: boolean;
  notificationData: NotificationData | null;
  showNotification: (data: NotificationData) => void;
  hideNotification: () => void;
  routineNotificationOpen: boolean;
  routineNotificationData: RoutineNotificationData | null;
  hideRoutineNotification: () => void;
  checkedRoutines: string[];
  setCheckedRoutines: React.Dispatch<React.SetStateAction<string[]>>;
  sendAndroidFCMTokenToServer: (token: string) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const [checkedRoutines, setCheckedRoutines] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // 토큰 존재 여부 확인을 위한 상태
  const [hasToken, setHasToken] = useState(false);

  // 루틴 알림을 위한 상태
  const [routineNotificationOpen, setRoutineNotificationOpen] = useState(false);
  const [routineNotificationData, setRoutineNotificationData] = useState<RoutineNotificationData | null>(null);

  // 마지막으로 체크한 시간을 저장
  const lastCheckRef = useRef(new Date());

  // WebSocket 관련 상태
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const showNotification = useCallback((data: NotificationData) => {
    setNotificationData(data);
    setIsOpen(true);
  }, []);

  const hideNotification = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setNotificationData(null), 300);
  }, []);

  const showRoutineNotification = useCallback(
    (name: string, subtitle?: string, type: NotificationType = 'GENERIC', weatherInfo?: WeatherInfo | null) => {
      setRoutineNotificationData({ name, subtitle, type, weatherInfo });
      setRoutineNotificationOpen(true);
    },
    []
  );

  const hideRoutineNotification = useCallback(() => {
    setRoutineNotificationOpen(false);
    setTimeout(() => setRoutineNotificationData(null), 300);
  }, []);

  // 루틴 시작 1시간 전 알림 처리 - 기본 UI 호환성을 위해 subtitle에 날씨 정보 포함
  const handleRoutineStartReminder = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      // 백엔드에서 보내는 body 메시지를 그대로 사용
      // "루틴 시작 1시간 전! 약속 시간까지 N분 남았습니다."
      let subtitleText = body;

      // 날씨 정보가 있으면 subtitle에 텍스트로 추가
      if (data.hasWeather === 'true') {
        const temp = Math.round(parseFloat(data.temperature ?? '0'));
        const desc = data.weatherDescription ?? '';
        const humidity = data.humidity ?? '';
        const feelsLike = Math.round(parseFloat(data.feelsLike ?? '0'));

        subtitleText = `${body}\n\n${desc} ${temp}°C (체감 ${feelsLike}°C)\n습도: ${humidity}%`;
      }

      // 내부적으로는 WeatherInfo를 유지하지만 UI에는 subtitle만 전달
      const weatherInfo: WeatherInfo | null = data.hasWeather === 'true'
        ? {
            description: data.weatherDescription ?? '',
            temperature: data.temperature ?? '',
            feelsLike: data.feelsLike ?? '',
            humidity: data.humidity ?? '',
            icon: data.weatherIcon ?? '',
            type: data.weatherType ?? ''
          }
        : null;

      showRoutineNotification(title, subtitleText, 'ROUTINE_START_REMINDER', weatherInfo);
    },
    [showRoutineNotification]
  );

  // 지연 등록 루틴 아이템 알림 처리
  const handleDelayedRoutineItem = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      showRoutineNotification(body, title, 'delayed_routine_item');
    },
    [showRoutineNotification]
  );

  // 스케줄 시작 알림 처리
  const handleScheduleStart = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      showRoutineNotification(title, body, 'SCHEDULE_START');
    },
    [showRoutineNotification]
  );

  // 루틴 아이템 시작 알림 처리
  const handleRoutineItemStart = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      showRoutineNotification(title, body, 'ROUTINE_ITEM_START');

      // FCM으로 받은 아이템은 체크된 것으로 표시하여 중복 알림 방지
      // title은 "루틴명의 아이템명 할 시간입니다" 형식이므로 아이템명 추출
      const itemNameMatch = title.match(/의 (.+) 할 시간입니다/);
      if (data.scheduleId && itemNameMatch && itemNameMatch[1]) {
        const itemName = itemNameMatch[1];
        const itemKey = `item-${data.scheduleId}-${itemName}`;
        setCheckedItems(prev => new Set(prev).add(itemKey));
        console.log('FCM 알림 수신으로 체크된 아이템:', itemKey);
      }

    },
    [showRoutineNotification]
  );

  // 준비물 알림 처리
  const handleSuppliesReminder = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      showRoutineNotification(title, body, 'SUPPLIES_REMINDER');
    },
    [showRoutineNotification]
  );

  // 악천후 알림 처리
  const handleSevereWeatherAlert = useCallback(
    (data: Record<string, string>, title?: string, body?: string) => {
      // 백엔드에서 title과 body를 직접 전달받는 경우 그대로 사용
      // "날씨 알림", "날씨가 안좋아요🥲, 조금 일찍 나가볼까요? 알람 시작 45분 전!"
      const alertTitle = title || '날씨 알림';
      const alertBody = body || '날씨가 안좋아요🥲, 조금 일찍 나가볼까요? 알람 시작 45분 전!';

      console.log('악천후 알림 표시:', { scheduleId: data.scheduleId, title: alertTitle, body: alertBody });
      showRoutineNotification(alertTitle, alertBody, 'SEVERE_WEATHER_ALERT');
    },
    [showRoutineNotification]
  );

  // 교통 지연 알림 처리
  const handleTrafficDelayAlert = useCallback(
    (data: Record<string, string>, title?: string, body?: string) => {
      // 백엔드에서 title과 body를 직접 전달받는 경우 그대로 사용
      // "교통 알림", "교통 상황이 안 좋아요🥲, 조금 일찍 나가볼까요? 알람 시작 N분 전!"
      const alertTitle = title || '교통 알림';
      const alertBody = body || '교통 상황이 안 좋아요🥲, 조금 일찍 나가볼까요?';

      console.log('교통 지연 알림 표시:', { scheduleId: data.scheduleId, title: alertTitle, body: alertBody });
      showRoutineNotification(alertTitle, alertBody, 'TRAFFIC_DELAY_ALERT');
    },
    [showRoutineNotification]
  );

  // Android FCM 토큰 처리를 위한 함수
  const sendAndroidFCMTokenToServer = useCallback(async (token: string) => {
    try {
      const accessToken = localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      if (!accessToken) {
        console.log('인증 토큰이 없어 FCM 토큰 전송을 건너뜁니다.');
        return;
      }

      // axios를 사용하여 API 호출 (기존 구조 활용)
      const api = (await import('@/api/axiosConfig')).default;
      const response = await api.post('/user/fcm-token', {
        fcmToken: token,
        platform: 'android'
      });

      if (response.status === 200) {
        console.log('Android FCM 토큰이 서버로 전송되었습니다:', token);
        console.log('서버 응답:', response.data);
      }
    } catch (error) {
      console.error('FCM 토큰 전송 중 오류:', error);
      // TypeScript 타입 가드를 사용한 안전한 error 처리
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { data: unknown; status: number } };
        console.error('서버 오류 응답:', axiosError.response.data);
        console.error('오류 상태 코드:', axiosError.response.status);
      }
    }
  }, []);

  // WebSocket 연결 함수
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket이 이미 연결되어 있습니다.');
      return;
    }

    try {
      const token = localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      if (!token) {
        console.warn('⚠️ [WebSocket] 토큰이 없어 WebSocket 연결을 할 수 없습니다.');
        setHasToken(false);
        return;
      }

      setHasToken(true);

      // 백엔드 서버 URL 사용 (프론트엔드가 아닌 백엔드로 연결)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
      const wsHost = backendUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/ws/notifications?token=${token}`;

      console.log('🔌 [WebSocket] 연결 시도 중...', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ [WebSocket] 연결 성공!');
        setIsWebSocketConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [WebSocket] 메시지 수신:', message);

          if (message.type === 'CONNECTION_SUCCESS') {
            console.log('✅ [WebSocket] 서버 연결 확인:', message.message);
            return;
          }

          // FCM과 동일한 알림 처리 로직
          const title = message.title || message.data?.title || '알림';
          const body = message.body || message.data?.body || '새로운 알림이 있습니다.';
          const type = message.type || message.data?.type;
          const data = message.data || {};

          if (type) {
            switch (type) {
              case 'ROUTINE_START_REMINDER':
                handleRoutineStartReminder(data, title, body);
                break;
              case 'delayed_routine_item':
                handleDelayedRoutineItem(data, title, body);
                break;
              case 'SCHEDULE_START':
                handleScheduleStart(data, title, body);
                break;
              case 'ROUTINE_ITEM_START':
                handleRoutineItemStart(data, title, body);
                break;
              case 'SUPPLIES_REMINDER':
                handleSuppliesReminder(data, title, body);
                break;
              case 'SEVERE_WEATHER_ALERT':
                handleSevereWeatherAlert(data, title, body);
                break;
              case 'TRAFFIC_DELAY_ALERT':
                handleTrafficDelayAlert(data, title, body);
                break;
              default:
                showRoutineNotification(title, body, 'GENERIC');
            }
          } else {
            showRoutineNotification(title, body, 'GENERIC');
          }
        } catch (error) {
          console.error('❌ [WebSocket] 메시지 처리 오류:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [WebSocket] 연결 오류:', error);
      };

      ws.onclose = (event) => {
        console.log('🔌 [WebSocket] 연결 종료 - 코드:', event.code, '이유:', event.reason);
        setIsWebSocketConnected(false);

        // 1000 (정상 종료) 또는 1001 (페이지 이동) 제외하고 재연결 시도
        // 1006 (비정상 연결 종료)인 경우에만 재연결
        if (event.code === 1006) {
          console.log('🔄 [WebSocket] 비정상 종료 감지, 5초 후 재연결 시도...');
          reconnectTimeoutRef.current = setTimeout(() => {
            // 토큰이 여전히 있는지 확인 후 재연결
            const currentToken = localStorage.getItem('access_token') ||
              document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

            if (currentToken) {
              console.log('🔄 [WebSocket] 재연결 시도 중...');
              connectWebSocket();
            } else {
              console.log('⚠️ [WebSocket] 토큰 없음, 재연결 중단');
            }
          }, 5000);
        } else if (event.code === 1000) {
          console.log('✅ [WebSocket] 정상 종료 (재연결 안 함)');
        } else {
          console.log('⚠️ [WebSocket] 연결 종료 (코드: ' + event.code + '), 재연결 안 함');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ [WebSocket] 연결 실패:', error);
    }
  }, [handleRoutineStartReminder, handleDelayedRoutineItem, handleScheduleStart,
      handleRoutineItemStart, handleSuppliesReminder, handleSevereWeatherAlert,
      handleTrafficDelayAlert, showRoutineNotification]);

  // WebSocket 연결 해제 함수
  const disconnectWebSocket = useCallback(() => {
    console.log('🔌 [WebSocket] 연결 해제 시도...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
      console.log('🔄 [WebSocket] 재연결 타이머 취소');
    }

    if (wsRef.current) {
      // readyState 확인
      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'User disconnect');
        console.log('✅ [WebSocket] 연결 종료 요청 전송');
      }
      wsRef.current = null;
      setIsWebSocketConnected(false);
      console.log('✅ [WebSocket] 연결 해제 완료');
    } else {
      console.log('⚠️ [WebSocket] 이미 연결이 해제되어 있습니다.');
    }
  }, []);

  // 초기 WebSocket 연결 (컴포넌트 마운트 시)
  useEffect(() => {
    const checkFCMAndConnectWebSocket = async () => {
      const token = localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      if (!token) {
        console.log('⚠️ [초기화] 인증 토큰 없음, WebSocket 연결 안 함');
        setHasToken(false);
        return;
      }

      setHasToken(true);

      try {
        // FCM 지원 여부 확인
        if (!('Notification' in window)) {
          console.log('🔔 [FCM] 브라우저가 알림을 지원하지 않음 → WebSocket 연결');
          connectWebSocket();
          return;
        }

        // 알림 권한 확인 (요청하지 않고 현재 상태만 확인)
        if (Notification.permission === 'denied') {
          console.log('🔔 [FCM] 알림 권한 거부됨 → WebSocket 연결');
          connectWebSocket();
          return;
        }

        if (Notification.permission === 'default') {
          console.log('🔔 [FCM] 알림 권한 미설정 → FCM 토큰 발급 시도');
        }

        // Firebase 동적 import 시도
        const firebaseModule = await import('@/utils/firebase');
        const messagingInstance = firebaseModule.messaging as import('firebase/messaging').Messaging | null;

        if (!messagingInstance) {
          console.log('🔔 [FCM] Firebase messaging 초기화 실패 → WebSocket 연결');
          connectWebSocket();
          return;
        }

        // FCM 토큰 발급 시도
        const { getToken } = await import('firebase/messaging');
        const fcmToken = await getToken(messagingInstance, {
          vapidKey: 'BK6gC7kpp7i9gv1WMQuWsW_487xmyfsXWtE0DERzOUunoCWN3fzoJ0JwP3BIL_d4pYGcjlGxhjjmD59-0UGzoug'
        });

        if (fcmToken) {
          console.log('✅ [FCM] FCM 토큰 발급 성공 → WebSocket 연결 안 함');
          console.log('   FCM 토큰:', fcmToken.substring(0, 20) + '...');
          // FCM 토큰이 있으면 WebSocket 연결하지 않음
          return;
        } else {
          console.log('⚠️ [FCM] FCM 토큰 발급 실패 → WebSocket 연결');
          connectWebSocket();
        }
      } catch (error) {
        console.error('❌ [FCM] FCM 초기화 오류 → WebSocket 연결:', error);
        connectWebSocket();
      }
    };

    checkFCMAndConnectWebSocket();
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  // 로그아웃 감지 및 WebSocket 연결 해제
  useEffect(() => {
    const checkLogout = () => {
      const token = localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      const tokenExists = !!token;

      // 토큰이 있었는데 없어진 경우 (로그아웃)
      if (hasToken && !tokenExists) {
        console.log('🔓 [Auth] 로그아웃 감지, WebSocket 연결 해제...');
        setHasToken(false);
        disconnectWebSocket();
      } else if (!hasToken && tokenExists) {
        // 토큰이 새로 생긴 경우 (로그인) - hasToken 상태만 업데이트
        // WebSocket 연결은 초기 useEffect에서 FCM 체크 후 결정
        setHasToken(true);
      }
    };

    // 주기적으로 토큰 상태 체크 (1초마다)
    const intervalId = setInterval(checkLogout, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [hasToken, disconnectWebSocket]); // disconnectWebSocket 추가

  // 컴포넌트 언마운트 시 WebSocket 정리
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // WebSocket 테스트 페이지로부터 postMessage 수신 처리
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      // 보안: localhost:8080에서만 메시지 수신
      if (event.origin !== 'http://localhost:8080') {
        return;
      }

      console.log('📨 [PostMessage] 테스트 페이지로부터 메시지 수신:', event.data);

      if (event.data.type === 'WEBSOCKET_NOTIFICATION' && event.data.data) {
        const message = event.data.data;
        const title = message.title || '알림';
        const body = message.body || '새로운 알림이 있습니다.';
        const type = message.type || message.data?.type;
        const data = message.data || {};

        console.log('🔔 [PostMessage] 알림 표시:', { title, body, type });

        if (type) {
          switch (type) {
            case 'ROUTINE_START_REMINDER':
              handleRoutineStartReminder(data, title, body);
              break;
            case 'delayed_routine_item':
              handleDelayedRoutineItem(data, title, body);
              break;
            case 'SCHEDULE_START':
              handleScheduleStart(data, title, body);
              break;
            case 'ROUTINE_ITEM_START':
              handleRoutineItemStart(data, title, body);
              break;
            case 'SUPPLIES_REMINDER':
              handleSuppliesReminder(data, title, body);
              break;
            case 'SEVERE_WEATHER_ALERT':
              handleSevereWeatherAlert(data, title, body);
              break;
            case 'TRAFFIC_DELAY_ALERT':
              handleTrafficDelayAlert(data, title, body);
              break;
            default:
              showRoutineNotification(title, body, 'GENERIC');
          }
        } else {
          showRoutineNotification(title, body, 'GENERIC');
        }
      }
    };

    window.addEventListener('message', handlePostMessage);

    return () => {
      window.removeEventListener('message', handlePostMessage);
    };
  }, [handleRoutineStartReminder, handleDelayedRoutineItem, handleScheduleStart,
      handleRoutineItemStart, handleSuppliesReminder, handleSevereWeatherAlert,
      handleTrafficDelayAlert, showRoutineNotification]);


  // FCM 메시지 수신 처리
  useEffect(() => {
    if (!hasToken) return;

    let unsubscribe: (() => void) | undefined;

    const setupFCMMessageListener = async () => {
      try {
        // 동적 import로 Firebase 초기화 + 명시적 타입 단언
        const firebaseModule = await import('@/utils/firebase');
        const messagingInstance = firebaseModule.messaging as import('firebase/messaging').Messaging | null;

        if (!messagingInstance) {
          console.warn('Firebase messaging을 초기화할 수 없습니다.');
          return;
        }

        const { onMessage } = await import('firebase/messaging');

        // 포그라운드 메시지 수신 처리
        unsubscribe = onMessage(messagingInstance, (payload) => {
          console.log('FCM 포그라운드 메시지 수신:', payload);

          try {
            // notification 페이로드 또는 data 페이로드에서 title, body 가져오기
            const title = payload.notification?.title || payload.data?.title || '알림';
            const body = payload.notification?.body || payload.data?.body || '새로운 알림이 있습니다.';
            const type = payload.data?.type;

            if (type) {
              // 서버에서 보내는 알림 타입별 처리
              switch (type) {
                case 'ROUTINE_START_REMINDER':
                  // 루틴 시작 1시간 전 알림
                  handleRoutineStartReminder(payload.data as Record<string, string>, title, body);
                  break;

                case 'delayed_routine_item':
                  // 지연 등록 시 루틴 아이템 알림
                  handleDelayedRoutineItem(payload.data as Record<string, string>, title, body);
                  break;

                case 'SCHEDULE_START':
                  // 스케줄 시작 알림
                  handleScheduleStart(payload.data as Record<string, string>, title, body);
                  break;

                case 'ROUTINE_ITEM_START':
                  // 루틴 아이템 시작 알림
                  handleRoutineItemStart(payload.data as Record<string, string>, title, body);
                  break;

                case 'SUPPLIES_REMINDER':
                  // 준비물 알림
                  handleSuppliesReminder(payload.data as Record<string, string>, title, body);
                  break;

                case 'SEVERE_WEATHER_ALERT':
                  // 악천후 알림 (title, body 전달)
                  handleSevereWeatherAlert(payload.data as Record<string, string>, title, body);
                  break;

                case 'TRAFFIC_DELAY_ALERT':
                  // 교통 지연 알림 (title, body 전달)
                  handleTrafficDelayAlert(payload.data as Record<string, string>, title, body);
                  break;

                default:
                  // 일반 알림
                  showRoutineNotification(title, body, 'GENERIC');
              }
            } else {
              // type이 없으면 일반 알림으로 처리
              showRoutineNotification(title, body, 'GENERIC');
            }
          } catch (error) {
            console.error('FCM 메시지 처리 중 오류:', error);
            // 에러가 발생해도 기본 알림은 표시
            const fallbackTitle = payload.notification?.title || '알림';
            const fallbackBody = payload.notification?.body || '새로운 알림이 있습니다.';
            showRoutineNotification(fallbackTitle, fallbackBody, 'GENERIC');
          }
        });
      } catch (error) {
        console.error('FCM 메시지 리스너 설정 실패:', error);
      }
    };

    setupFCMMessageListener();

    // Service Worker로부터 메시지 수신 (백그라운드 알림 클릭 시)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('Service Worker 메시지 수신:', event.data);

      if (event.data.type === 'SHOW_SEVERE_WEATHER_MODAL' && event.data.data) {
        const data = event.data.data;
        handleSevereWeatherAlert(data);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    // cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [
    hasToken,
    handleRoutineStartReminder,
    handleDelayedRoutineItem,
    handleScheduleStart,
    handleRoutineItemStart,
    handleSuppliesReminder,
    handleSevereWeatherAlert,
    handleTrafficDelayAlert,
    showRoutineNotification
  ]);

  // 루틴 알림 체크 로직 - 새로고침 시 알림 방지
  useEffect(() => {
    // 토큰이 없으면 알림 체크를 실행하지 않음
    if (!hasToken) {
      console.log('토큰이 없어 알림 체크를 건너뜁니다.');
      return;
    }

    const checkSchedules = async () => {
      try {
        const inProgressSchedule = await getLatestInProgressSchedule();

        if (inProgressSchedule && inProgressSchedule.routineId) {
          const routineDetails = await getRoutineById(inProgressSchedule.routineId);

          if (routineDetails) {
            const now = new Date();
            const scheduleStartTime = new Date(inProgressSchedule.startTime);

            // 백엔드와 동일한 로직: 전체 루틴 소요 시간 계산
            const totalRoutineDuration = routineDetails.items.reduce((sum: number, item: RoutineItem) => sum + item.durationMinutes, 0);

            // 루틴 시작 시간 = 스케줄 시작 시간 - 전체 루틴 소요 시간
            const routineStartTime = new Date(scheduleStartTime.getTime() - totalRoutineDuration * 60000);

            // 루틴이 이미 완료되었는지 확인 (현재 시간이 스케줄 시작 시간을 넘었으면 루틴 완료)
            if (now >= scheduleStartTime) {
              console.log('루틴이 이미 완료되었습니다. 알림을 표시하지 않습니다.');
              return;
            }

            // 루틴 첫 시작 알림 (한 번만)
            const scheduleKey = `schedule-${inProgressSchedule.id}`;
            if (
              !checkedItems.has(scheduleKey) &&
              now >= routineStartTime &&
              now < scheduleStartTime
            ) {
              showRoutineNotification(routineDetails.name, '루틴 시간입니다.', 'GENERIC');
              setCheckedItems(prev => new Set(prev).add(scheduleKey));

              // checkedRoutines 상수 활용 - 체크된 루틴 기록
              setCheckedRoutines(prev => {
                if (!prev.includes(routineDetails.name)) {
                  return [...prev, routineDetails.name];
                }
                return prev;
              });
            }

            // 각 루틴 아이템의 시작 시간 계산 및 알림
            let accumulatedMinutes = 0;
            for (const item of routineDetails.items) {
              // 각 아이템의 시작 시간은 루틴 시작 시간부터 계산
              const itemStartTime = new Date(
                routineStartTime.getTime() + accumulatedMinutes * 60000
              );
              const itemEndTime = new Date(
                itemStartTime.getTime() + item.durationMinutes * 60000
              );

              // FCM 알림과 동일한 키 형식 사용 (타임스탬프 제거)
              const itemKey = `item-${inProgressSchedule.id}-${item.name}`;

              // 아이템 시작 시간이 되었고, 아직 종료되지 않았으며, 알림을 보내지 않은 경우
              if (
                itemStartTime > lastCheckRef.current &&
                itemStartTime <= now &&
                now < itemEndTime &&
                !checkedItems.has(itemKey)
              ) {
                showRoutineNotification(item.name, '시작 시간입니다.', 'ROUTINE_ITEM_START');
                setCheckedItems(prev => new Set(prev).add(itemKey));
                console.log('프론트엔드 체크로 알림 표시:', itemKey);
                break; // 가장 최근 아이템만 알림
              }

              accumulatedMinutes += item.durationMinutes;
            }
          }

          // 마지막 체크 시간 업데이트
          lastCheckRef.current = new Date();
        }
      } catch (error) {
        console.error('알림 체크 중 오류 발생:', error);
      }
    };

    // 페이지 로드 후 1분 뒤부터 1분 간격으로 스케줄 체크 시작
    const initialDelay = 60 * 1000; // 1분
    const intervalTime = 60 * 1000; // 1분

    const initialTimer = setTimeout(() => {
      checkSchedules(); // 최초 실행 (1분 후)

      // 이후 1분마다 반복 실행
      const intervalId = setInterval(checkSchedules, intervalTime);

      console.log('알림 체크가 시작되었습니다.');

      // cleanup: interval 제거를 위해 ref에 저장
      return () => clearInterval(intervalId);
    }, initialDelay);

    console.log('알림 체크가 1분 후에 시작됩니다.');

    // cleanup: 컴포넌트 언마운트 시 타이머 제거
    return () => clearTimeout(initialTimer);
  }, [checkedItems, hasToken, showRoutineNotification, setCheckedRoutines]);

  return (
    <NotificationContext.Provider
      value={{
        isOpen,
        notificationData,
        showNotification,
        hideNotification,
        routineNotificationOpen,
        routineNotificationData,
        hideRoutineNotification,
        checkedRoutines,
        setCheckedRoutines,
        sendAndroidFCMTokenToServer,
        connectWebSocket,
        disconnectWebSocket,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
