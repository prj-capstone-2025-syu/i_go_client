import api from './axiosConfig'; // axiosConfig에서 api 임포트

/**
 * 스마트 중간지점 찾기 AI에게 메시지 전송
 * @param {string} message - 사용자 메시지 (예: "3명", "강남역, 홍대입구역, 신림역")
 * @returns {Promise<Object>} 서버 응답 데이터 (AI의 다음 메시지, 추천 결과 등)
 */
export const sendSmartMidpointMessage = async (message) => {
  try {
    // '/api/midpoint/smart' 엔드포인트 사용
    const response = await api.post('/midpoint/smart', { message });
    return response.data; // MidpointResponse DTO 객체 반환
  } catch (error) {
    console.error('스마트 중간지점 메시지 전송 실패:', error.response?.data || error.message);
    // 에러 응답 구조가 있다면 message 필드를 사용, 없으면 기본 에러 메시지
    const errorMessage = error.response?.data?.message || '메시지 전송 중 오류가 발생했습니다.';
    throw new Error(errorMessage); // 에러 메시지를 포함하여 throw
  }
};

/**
 * 스마트 중간지점 찾기 대화 세션 초기화
 * @returns {Promise<Object>} 서버 응답 데이터 (AI의 첫 질문)
 */
export const resetMidpointSession = async () => {
  try {
    // '/api/midpoint/reset' 엔드포인트 사용
    const response = await api.post('/midpoint/reset');
    return response.data; // MidpointResponse DTO 객체 반환
  } catch (error) {
    console.error('세션 초기화 실패:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || '세션 초기화 중 오류가 발생했습니다.';
    throw new Error(errorMessage);
  }
};

// findBasicMidpoint 함수는 제거됨