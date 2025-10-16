import api from './axiosConfig'; // axiosConfig에서 api 임포트

// LocalDateTime 배열을 JavaScript Date 객체로 변환하는 헬퍼 함수
const parseLocalDateTime = (dateTimeValue) => {
    // null이나 undefined 체크
    if (!dateTimeValue) return null;

    // 이미 문자열이면 그대로 반환 (ISO 8601 형식)
    if (typeof dateTimeValue === 'string') {
        return dateTimeValue;
    }

    // 배열 형태 [year, month, day, hour, minute, second, nano]
    if (Array.isArray(dateTimeValue)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = dateTimeValue;
        // JavaScript Date는 month가 0-based (0=1월)이므로 -1 필요
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.toISOString();
    }

    // 그 외의 경우 그대로 반환
    return dateTimeValue;
};

// 일정 생성
export const createSchedule = async (scheduleData) => {
    try {
        const response = await api.post('/schedules', scheduleData);
        return response.data;
    } catch (error) {
        console.error('일정 생성 실패:', error);
        throw error;
    }
};

// 일정 조회 (날짜 범위)
export const getSchedules = async (start, end) => {
    try {
        // 날짜 형식이 ISO 8601 형태인지 확인
        console.log("요청 시작 날짜:", start);
        console.log("요청 종료 날짜:", end);

        const params = new URLSearchParams({
            start: start,
            end: end
        });

        const response = await api.get(`/schedules?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('일정 조회 중 오류 발생:', error);
        throw error;
    }
};

// 일정 삭제
export const deleteSchedule = async (scheduleId) => {
    try {
        const response = await api.delete(`/schedules/${scheduleId}`);
        return response.data;
    } catch (error) {
        console.error('일정 삭제 실패:', error);
        throw error;
    }
};

// 특정 일정 조회
export const getScheduleById = async (scheduleId) => {
    try {
        const response = await api.get(`/schedules/${scheduleId}`);
        return response.data;
    } catch (error) {
        console.error('일정 조회 실패:', error);
        throw error;
    }
};

// 일정 수정
export const updateSchedule = async (scheduleId, scheduleData) => {
    try {
        const response = await api.put(`/schedules/${scheduleId}`, scheduleData);
        return response.data;
    } catch (error) {
        console.error('일정 수정 실패:', error);
        throw error;
    }
};

// 다가오는 일정 조회 (3개)
export const getUpcomingSchedules = async (limit = 3) => {
    try {
        const params = new URLSearchParams({
            limit: limit.toString()
        });
        const response = await api.get(`/schedules/upcoming?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('다가오는 일정 조회 중 오류 발생:', error);
        throw error;
    }
};

//진행 중 일정 조회
// 진행 중인 가장 최근 일정 1개 조회 API
export const getLatestInProgressSchedule = async () => {
    try {
        const response = await api.get(`/schedules/in-progress/latest`);
        const data = response.data;

        // null 체크
        if (!data) {
            return null;
        }

        // 백엔드가 루틴 정보를 포함한 Map 형태로 반환하는 경우
        // { schedule: {...}, hasRoutine: true, routineStartTime: ..., routineEndTime: ..., routineItems: [...] }
        // 또는 Schedule 객체를 직접 반환하는 경우

        // schedule 프로퍼티가 있으면 Map 형태 (루틴 있음)
        if (data.schedule) {
            // LocalDateTime 배열을 ISO 문자열로 변환
            const routineStartTimeISO = parseLocalDateTime(data.routineStartTime);
            const routineEndTimeISO = parseLocalDateTime(data.routineEndTime);

            console.log('📊 진행 중인 일정 (루틴 포함):', {
                scheduleId: data.schedule.id,
                title: data.schedule.title,
                routineStartTime: routineStartTimeISO,
                routineEndTime: routineEndTimeISO,
                routineItemsCount: data.routineItems?.length || 0
            });

            // 루틴 정보를 schedule 객체에 추가 (최상위 속성으로도 추가)
            return {
                ...data.schedule,
                routineStartTime: routineStartTimeISO, // 변환된 ISO 문자열
                routineEndTime: routineEndTimeISO,     // 변환된 ISO 문자열
                _routineInfo: {
                    hasRoutine: data.hasRoutine,
                    routineStartTime: routineStartTimeISO,
                    routineEndTime: routineEndTimeISO,
                    routineItems: data.routineItems || []
                }
            };
        }

        // Schedule 객체를 직접 반환한 경우 (루틴 없음)
        console.log('📊 진행 중인 일정 (루틴 없음):', {
            scheduleId: data.id,
            title: data.title
        });

        return data;
    } catch (error) {
        console.error('진행 중인 일정 조회 중 오류 발생:', error);
        // 백엔드에서 일정이 없을 때 null을 반환하도록 처리
        if (error.response && error.response.status === 404) { // 404도 "없음"으로 간주
            return null;
        }
        throw error;
    }
};