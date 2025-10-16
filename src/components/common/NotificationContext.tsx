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
      let subtitleText = body;

      // 날씨 정보가 있으면 subtitle에 텍스트로 추가
      if (data.hasWeather === 'true') {
        const temp = Math.round(parseFloat(data.temperature ?? '0'));
        const desc = data.weatherDescription ?? '';
        const humidity = data.humidity ?? '';
        const feelsLike = Math.round(parseFloat(data.feelsLike ?? '0'));

        subtitleText = `${body}\n${desc} ${temp}°C (체감 ${feelsLike}°C)\n습도: ${humidity}%`;
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
  // 백엔드 전송 데이터 구조:
  // {
  //   type: "SEVERE_WEATHER_ALERT",
  //   scheduleId: "일정 ID",
  //   weatherDescription: "비" | "눈" | "폭우" 등,
  //   newStartTime: "2025-10-14T09:30:00" (ISO 형식, 30분 앞당긴 시간),
  //   isSevereWeather: "true",
  //   severeWeatherDescription: "비",
  //   originalStartTime: "2025-10-14T10:00:00",
  //   originalEndTime: "2025-10-14T11:00:00",
  //   newEndTime: "2025-10-14T10:30:00"
  // }
  const handleSevereWeatherAlert = useCallback(
    (data: Record<string, string>) => {
      const weatherDesc = data.weatherDescription || data.severeWeatherDescription || '악천후';
      const newStartTime = data.newStartTime || '';
      const scheduleId = data.scheduleId;

      // 시간 포맷팅 (ISO 형식 -> 한국어 시간 형식)
      let formattedTime: string;
      try {
        const date = new Date(newStartTime);
        formattedTime = date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        // 파싱 실패 시 원본 시간 사용
        formattedTime = newStartTime;
      }

      const alertTitle = '⚠️ 악천후 알림';
      const alertBody = `${weatherDesc}이(가) 예상됩니다.\n\n날씨 때문에 늦을 수 있으니\n출발 시간을 15분 앞당겼습니다.\n\n새로운 출발 시간: ${formattedTime}`;

      console.log('악천후 알림 표시:', { scheduleId, weatherDesc, newStartTime, formattedTime });
      showRoutineNotification(alertTitle, alertBody, 'SEVERE_WEATHER_ALERT');
    },
    [showRoutineNotification]
  );


  // 교통 지연 알림 처리
  const handleTrafficDelayAlert = useCallback(
    (data: Record<string, string>) => {
      const delayReason = data.delayReason || '교통 지연';
      const newStartTime = data.newStartTime || '';
      const scheduleId = data.scheduleId;

      // 시간 포맷팅 (ISO 형식 -> 한국어 시간 형식)
      let formattedTime: string;
      try {
        const date = new Date(newStartTime);
        formattedTime = date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        // 파싱 실패 시 원본 시간 사용
        formattedTime = newStartTime;
      }

      const alertTitle = '🚦 교통 지연 알림';
      const alertBody = `${delayReason}으로 인해 출발 시간이 변경되었습니다.\n\n새로운 출발 시간: ${formattedTime}`;

      console.log('교통 지연 알림 표시:', { scheduleId, delayReason, newStartTime, formattedTime });
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

  // 토큰 체크 로직
  useEffect(() => {
    const checkToken = () => {
      // 로컬 스토리지 또는 쿠키에서 access_token 확인
      const token =
        localStorage.getItem('access_token') ||
        document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

      setHasToken(!!token);
    };

    checkToken();

    // 스토리지/쿠키 변경 감지를 위한 이벤트 리스너
    window.addEventListener('storage', checkToken);
    return () => window.removeEventListener('storage', checkToken);
  }, []);

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
                  // 악천후 알림 (data만 전달)
                  handleSevereWeatherAlert(payload.data as Record<string, string>);
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

            // 루틴 첫 시작 알림 (한 번만)
            const scheduleKey = `schedule-${inProgressSchedule.id}`;
            if (
              !checkedItems.has(scheduleKey) &&
              now.getTime() - scheduleStartTime.getTime() < 5 * 60000 // 5분 이내 시작된 경우만
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

            // 백엔드와 동일한 로직: 전체 루틴 소요 시간 계산
              const totalRoutineDuration = routineDetails.items.reduce((sum, item) => sum + item.durationMinutes, 0);

            // 루틴 시작 시간 = 스케줄 시작 시간 - 전체 루틴 소요 시간
            const routineStartTime = new Date(scheduleStartTime.getTime() - totalRoutineDuration * 60000);

            // 각 루틴 아이템의 시작 시간 계산 및 알림
            let accumulatedMinutes = 0;
            for (const item of routineDetails.items) {
              // 각 아이템의 시작 시간은 루틴 시작 시간부터 계산
              const itemStartTime = new Date(
                routineStartTime.getTime() + accumulatedMinutes * 60000
              );
              const itemKey = `item-${inProgressSchedule.id}-${item.name}-${itemStartTime.getTime()}`;

              // 지난 체크 이후 시작된 아이템이고 아직 알림을 보내지 않은 경우
              if (
                itemStartTime > lastCheckRef.current &&
                itemStartTime <= now &&
                !checkedItems.has(itemKey)
              ) {
                showRoutineNotification(item.name, '시작 시간입니다.', 'ROUTINE_ITEM_START');
                setCheckedItems(prev => new Set(prev).add(itemKey));
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