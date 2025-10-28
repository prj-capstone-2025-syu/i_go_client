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
  const [hasToken, setHasToken] = useState(false);
  const [routineNotificationOpen, setRoutineNotificationOpen] = useState(false);
  const [routineNotificationData, setRoutineNotificationData] = useState<RoutineNotificationData | null>(null);
  const lastCheckRef = useRef(new Date());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // ⭐ 중복 알림 방지용 - 최근 수신한 알림 ID 저장
  const recentNotificationIds = useRef<Set<string>>(new Set());

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

  // ⭐ 중복 체크 헬퍼 함수
  const isDuplicateNotification = useCallback((type: string, title: string): boolean => {
    const messageId = `${type}-${title}-${Math.floor(Date.now() / 3000)}`; // 3초 윈도우

    if (recentNotificationIds.current.has(messageId)) {
      console.log('⚠️ 중복 알림 감지, 무시:', messageId);
      return true;
    }

    recentNotificationIds.current.add(messageId);
    setTimeout(() => {
      recentNotificationIds.current.delete(messageId);
    }, 5000); // 5초 후 삭제

    return false;
  }, []);

  // 루틴 시작 알림 처리
  const handleRoutineStartReminder = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      console.log('🔔 handleRoutineStartReminder 호출됨:', { title, body, data });

      // 중복 체크
      if (isDuplicateNotification('ROUTINE_START_REMINDER', title)) {
        return;
      }

      const notificationTitle = title || '잔소리 시작 알림';
      const notificationBody = body || '잔소리 시작 1시간 전입니다.';

      showRoutineNotification(notificationTitle, notificationBody, 'ROUTINE_START_REMINDER');
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const handleDelayedRoutineItem = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      if (isDuplicateNotification('delayed_routine_item', title)) return;
      showRoutineNotification(body, title, 'delayed_routine_item');
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const handleScheduleStart = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      if (isDuplicateNotification('SCHEDULE_START', title)) return;
      showRoutineNotification(title, body, 'SCHEDULE_START');
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const handleRoutineItemStart = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      if (isDuplicateNotification('ROUTINE_ITEM_START', title)) return;
      showRoutineNotification(title, body, 'ROUTINE_ITEM_START');

      const itemNameMatch = title.match(/의 (.+) 할 시간입니다/);
      if (data.scheduleId && itemNameMatch && itemNameMatch[1]) {
        const itemName = itemNameMatch[1];
        const itemKey = `item-${data.scheduleId}-${itemName}`;
        setCheckedItems(prev => new Set(prev).add(itemKey));
        console.log('FCM 알림 수신으로 체크된 아이템:', itemKey);
      }
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const handleSuppliesReminder = useCallback(
    (data: Record<string, string>, title: string, body: string) => {
      if (isDuplicateNotification('SUPPLIES_REMINDER', title)) return;
      showRoutineNotification(title, body, 'SUPPLIES_REMINDER');
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const handleSevereWeatherAlert = useCallback(
    (data: Record<string, string>, title?: string, body?: string) => {
      const alertTitle = title || '날씨 알림';
      const alertBody = body || '날씨가 안좋아요!, 조금 일찍 나가볼까요?';

      if (isDuplicateNotification('SEVERE_WEATHER_ALERT', alertTitle)) return;

      console.log('악천후 알림 표시:', { scheduleId: data.scheduleId, title: alertTitle, body: alertBody });
      showRoutineNotification(alertTitle, alertBody, 'SEVERE_WEATHER_ALERT');
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const handleTrafficDelayAlert = useCallback(
    (data: Record<string, string>, title?: string, body?: string) => {
      const alertTitle = title || '교통 알림';
      const alertBody = body || '교통 상황이 안 좋아요🥲, 조금 일찍 나가볼까요?';

      if (isDuplicateNotification('TRAFFIC_DELAY_ALERT', alertTitle)) return;

      console.log('교통 지연 알림 표시:', { scheduleId: data.scheduleId, title: alertTitle, body: alertBody });
      showRoutineNotification(alertTitle, alertBody, 'TRAFFIC_DELAY_ALERT');
    },
    [showRoutineNotification, isDuplicateNotification]
  );

  const sendAndroidFCMTokenToServer = useCallback(async (token: string) => {
    try {
      const accessToken = localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      if (!accessToken) {
        console.log('인증 토큰이 없어 FCM 토큰 전송을 건너뜁니다.');
        return;
      }

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
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { data: unknown; status: number } };
        console.error('서버 오류 응답:', axiosError.response.data);
        console.error('오류 상태 코드:', axiosError.response.status);
      }
    }
  }, []);

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

        if (event.code === 1006) {
          console.log('🔄 [WebSocket] 비정상 종료 감지, 5초 후 재연결 시도...');
          reconnectTimeoutRef.current = setTimeout(() => {
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
      handleTrafficDelayAlert, showRoutineNotification, isDuplicateNotification]);

  const disconnectWebSocket = useCallback(() => {
    console.log('🔌 [WebSocket] 연결 해제 시도...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
      console.log('🔄 [WebSocket] 재연결 타이머 취소');
    }

    if (wsRef.current) {
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

  // ⭐⭐⭐ 초기 연결 로직 - FCM 토큰이 있어도 WebSocket 연결
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
        if (!('Notification' in window)) {
          console.log('🔔 [FCM] 브라우저가 알림을 지원하지 않음 → WebSocket 연결');
          connectWebSocket();
          return;
        }

        if (Notification.permission === 'denied') {
          console.log('🔔 [FCM] 알림 권한 거부됨 → WebSocket 연결');
          connectWebSocket();
          return;
        }

        if (Notification.permission === 'default') {
          console.log('🔔 [FCM] 알림 권한 미설정 → FCM 토큰 발급 시도');
        }

        const firebaseModule = await import('@/utils/firebase');
        const messagingInstance = firebaseModule.messaging as import('firebase/messaging').Messaging | null;

        if (!messagingInstance) {
          console.log('🔔 [FCM] Firebase messaging 초기화 실패 → WebSocket 연결');
          connectWebSocket();
          return;
        }

        const { getToken } = await import('firebase/messaging');
        const fcmToken = await getToken(messagingInstance, {
          vapidKey: 'BK6gC7kpp7i9gv1WMQuWsW_487xmyfsXWtE0DERzOUunoCWN3fzoJ0JwP3BIL_d4pYGcjlGxhjjmD59-0UGzoug'
        });

        if (fcmToken) {
          console.log('✅ [FCM] FCM 토큰 발급 성공');
          console.log('   FCM 토큰:', fcmToken.substring(0, 20) + '...');

          // ⭐⭐⭐ 핵심 수정: FCM 토큰이 있어도 WebSocket 연결 (폴백용)
          console.log('🔌 [WebSocket] FCM 토큰 있지만 폴백용으로 WebSocket도 연결');
          connectWebSocket();
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
  }, [connectWebSocket]);

  // 로그아웃 감지
  useEffect(() => {
    const checkLogout = () => {
      const token = localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      const tokenExists = !!token;

      if (hasToken && !tokenExists) {
        console.log('🔓 [Auth] 로그아웃 감지, WebSocket 연결 해제...');
        setHasToken(false);
        disconnectWebSocket();
      } else if (!hasToken && tokenExists) {
        setHasToken(true);
      }
    };

    const intervalId = setInterval(checkLogout, 1000);
    return () => clearInterval(intervalId);
  }, [hasToken, disconnectWebSocket]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // PostMessage 수신 처리
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
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
    return () => window.removeEventListener('message', handlePostMessage);
  }, [handleRoutineStartReminder, handleDelayedRoutineItem, handleScheduleStart,
      handleRoutineItemStart, handleSuppliesReminder, handleSevereWeatherAlert,
      handleTrafficDelayAlert, showRoutineNotification]);

  // FCM 메시지 수신 처리
  useEffect(() => {
    if (!hasToken) return;

    let unsubscribe: (() => void) | undefined;

    const setupFCMMessageListener = async () => {
      try {
        const firebaseModule = await import('@/utils/firebase');
        const messagingInstance = firebaseModule.messaging as import('firebase/messaging').Messaging | null;

        if (!messagingInstance) {
          console.warn('Firebase messaging을 초기화할 수 없습니다.');
          return;
        }

        const { onMessage } = await import('firebase/messaging');

        unsubscribe = onMessage(messagingInstance, (payload) => {
          console.log('🔥 FCM 포그라운드 메시지 수신:', payload);

          try {
            const title = payload.notification?.title || payload.data?.title || '알림';
            const body = payload.notification?.body || payload.data?.body || '새로운 알림이 있습니다.';
            const type = payload.data?.type;

            if (type) {
              switch (type) {
                case 'ROUTINE_START_REMINDER':
                  handleRoutineStartReminder(payload.data as Record<string, string>, title, body);
                  break;
                case 'delayed_routine_item':
                  handleDelayedRoutineItem(payload.data as Record<string, string>, title, body);
                  break;
                case 'SCHEDULE_START':
                  handleScheduleStart(payload.data as Record<string, string>, title, body);
                  break;
                case 'ROUTINE_ITEM_START':
                  handleRoutineItemStart(payload.data as Record<string, string>, title, body);
                  break;
                case 'SUPPLIES_REMINDER':
                  handleSuppliesReminder(payload.data as Record<string, string>, title, body);
                  break;
                case 'SEVERE_WEATHER_ALERT':
                  handleSevereWeatherAlert(payload.data as Record<string, string>, title, body);
                  break;
                case 'TRAFFIC_DELAY_ALERT':
                  handleTrafficDelayAlert(payload.data as Record<string, string>, title, body);
                  break;
                default:
                  showRoutineNotification(title, body, 'GENERIC');
              }
            } else {
              showRoutineNotification(title, body, 'GENERIC');
            }
          } catch (error) {
            console.error('FCM 메시지 처리 중 오류:', error);
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

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('Service Worker 메시지 수신:', event.data);

      if (event.data.type === 'SHOW_SEVERE_WEATHER_MODAL' && event.data.data) {
        const data = event.data.data;
        handleSevereWeatherAlert(data);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

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
    showRoutineNotification,
    isDuplicateNotification
  ]);

  // 루틴 알림 체크 로직
  useEffect(() => {
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

            const totalRoutineDuration = routineDetails.items.reduce((sum: number, item: RoutineItem) => sum + item.durationMinutes, 0);
            const routineStartTime = new Date(scheduleStartTime.getTime() - totalRoutineDuration * 60000);

            if (now >= scheduleStartTime) {
              console.log('루틴이 이미 완료되었습니다. 알림을 표시하지 않습니다.');
              return;
            }

            const scheduleKey = `schedule-${inProgressSchedule.id}`;
            if (
              !checkedItems.has(scheduleKey) &&
              now >= routineStartTime &&
              now < scheduleStartTime
            ) {
              showRoutineNotification(routineDetails.name, '시작 시간입니다.', 'GENERIC');
              setCheckedItems(prev => new Set(prev).add(scheduleKey));

              setCheckedRoutines(prev => {
                if (!prev.includes(routineDetails.name)) {
                  return [...prev, routineDetails.name];
                }
                return prev;
              });
            }

            let accumulatedMinutes = 0;
            for (const item of routineDetails.items) {
              const itemStartTime = new Date(
                routineStartTime.getTime() + accumulatedMinutes * 60000
              );
              const itemEndTime = new Date(
                itemStartTime.getTime() + item.durationMinutes * 60000
              );

              const itemKey = `item-${inProgressSchedule.id}-${item.name}`;

              if (
                itemStartTime > lastCheckRef.current &&
                itemStartTime <= now &&
                now < itemEndTime &&
                !checkedItems.has(itemKey)
              ) {
                showRoutineNotification(
              `${item.name}`,
              '시작 시간입니다',
              'ROUTINE_ITEM_START');
                setCheckedItems(prev => new Set(prev).add(itemKey));
                console.log('프론트엔드 체크로 알림 표시:', itemKey);
                break;
              }

              accumulatedMinutes += item.durationMinutes;
            }
          }

          lastCheckRef.current = new Date();
        }
      } catch (error) {
        console.error('알림 체크 중 오류 발생:', error);
      }
    };

    const initialDelay = 60 * 1000;
    const intervalTime = 60 * 1000;

    const initialTimer = setTimeout(() => {
      checkSchedules();
      const intervalId = setInterval(checkSchedules, intervalTime);
      console.log('알림 체크가 시작되었습니다.');
      return () => clearInterval(intervalId);
    }, initialDelay);

    console.log('알림 체크가 1분 후에 시작됩니다.');
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
