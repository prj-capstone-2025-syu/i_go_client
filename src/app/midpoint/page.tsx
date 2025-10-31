"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Suspense } from "react";
import NavBar from "@/components/common/topNav";
import { sendSmartMidpointMessage, resetMidpointSession } from "@/api/midpointApi";


interface Sender {
  name: string;
  avatarUrl: string;
}

interface ActionButtonProps {
  text: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface Message {
  id: string;
  text: string;
  time: string;
  sender: Sender;
  isSenderMe: boolean;
  actions?: ActionButtonProps[];
  actionsDisabled?: boolean;
}

interface RecommendedStationType {
  stationName: string;
  longitude: number;
  latitude: number;
  uniqueLanes: string[];
  laneCount: number;
}


interface MidpointResponseType {
  success: boolean;
  message: string;
  recommendedStations?: RecommendedStationType[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const aiPartner: Sender = { name: "아이고 AI", avatarUrl: "/logo.png" };
const currentUser: Sender = { name: "나", avatarUrl: "..." }; // 사용자 아바타 URL
const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
    const myMessageBubbleClass = "bg-[#01274f] text-white rounded-l-xl rounded-br-xl";
    const partnerMessageBubbleClass = "bg-white text-[#383838] border border-gray-200 rounded-r-xl rounded-bl-xl";
    const partnerMessageContainerClass = "justify-start pr-10";
    const myMessageContainerClass = "justify-end pl-10";

    return (
        <div className={`select-none flex w-full mb-3 ${ message.isSenderMe ? myMessageContainerClass : partnerMessageContainerClass }`} >
            {!message.isSenderMe && (
                <div className="mr-[10px] self-end shrink-0">
                    <div aria-label={message.sender.name} className="outline-none">
                        <div className="w-[36px] h-[36px] bg-contain bg-center bg-[#fff] bg-no-repeat rounded-full border border-gray-200"
                          style={{ backgroundImage: `url("${message.sender.avatarUrl}")` }} >
                        </div>
                    </div>
                </div>
            )}
            <div className={`flex flex-col ${ message.isSenderMe ? "items-end" : "items-start" }`} >
                <div className={`group max-w-xs md:max-md p-3 shadow-sm ${ message.isSenderMe ? myMessageBubbleClass : partnerMessageBubbleClass }`} >
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
                        {message.text}
                    </p>
                    {/* Action buttons removed as per previous step */}
                </div>
                <p className={`outline-none text-xs text-gray-400 font-light leading-4 tracking-tight mt-1 ${ message.isSenderMe ? "mr-1" : "ml-1" }`} >
                    {message.time}
                </p>
            </div>
        </div>
    );
};

// --- 메인 로직 컴포넌트 ---
const ChatInterface = () => {
    const messageAreaRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);

    // 메시지 추가 함수
    const addMessage = useCallback((text: string, sender: Sender) => {
        const newMessage: Message = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text,
            sender,
            isSenderMe: sender === currentUser,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        };
        setMessages((prev) => [...prev, newMessage]);
    }, []); // Empty dependency array as it doesn't depend on external state

    // 서버에 메시지 전송 및 응답 처리
    const handleSendMessage = useCallback(async (messageText: string) => {
        if (isSending || !messageText.trim()) return;

        setIsSending(true);
        addMessage(messageText, currentUser);

        try {
            const response = await sendSmartMidpointMessage(messageText) as MidpointResponseType;
            await sleep(300);

            // 이제 response는 MidpointResponseType으로 간주됨
            addMessage(response.message, aiPartner);

            if (response.recommendedStations && response.recommendedStations.length > 0) {
                console.log("추천 역 상세 정보:", response.recommendedStations);
            }

        } catch (error) {
            await sleep(300);
            let errorMessage = '메시지 처리 중 문제가 발생했습니다.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                console.error("Caught an unknown error type:", error); // 예상치 못한 에러 로깅
            }
            addMessage(`오류: ${errorMessage}`, aiPartner);
        } finally {
            setIsSending(false);
        }
    }, [isSending, addMessage]);

    // 세션 초기화 함수
    const handleResetSession = useCallback(async () => {
        if (isSending) return;
        setIsSending(true);
        setMessages([]);

        try {
            const response = await resetMidpointSession() as MidpointResponseType;
            await sleep(300);
            addMessage(response.message, aiPartner);
        } catch (error) {
            await sleep(300);
            let errorMessage = '세션 초기화 중 문제가 발생했습니다.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                 console.error("Caught an unknown error type during reset:", error);
            }
            addMessage(`오류: ${errorMessage}`, aiPartner);
        } finally {
            setIsSending(false);
        }
    }, [isSending, addMessage]);

    // 컴포넌트 마운트 시 세션 초기화
    useEffect(() => {
        handleResetSession();
    }, []);

    // 메시지 목록 변경 시 스크롤 맨 아래로
    useEffect(() => {
        if (messageAreaRef.current) {
            messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col grow h-full w-full bg-[#F9F9F9] overflow-hidden">
            <div ref={messageAreaRef} className="grow px-4 py-5 flex flex-col overflow-y-auto gap-y-2" >
                {messages.map((msg) => (
                    <MessageItem key={msg.id} message={msg} />
                ))}
                {isSending && ( // 로딩 표시
                    <div className="flex justify-start pr-10 mb-3">
                        <div className="mr-[10px] self-end shrink-0">
                            <div aria-label={aiPartner.name} className="outline-none">
                                <div className="w-[36px] h-[36px] bg-contain bg-center bg-[#fff] bg-no-repeat rounded-full border border-gray-200"
                                    style={{ backgroundImage: `url("${aiPartner.avatarUrl}")` }} >
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="group max-w-xs md:max-md p-3 shadow-sm bg-white text-[#383838] border border-gray-200 rounded-r-xl rounded-bl-xl">
                                <p className="text-sm font-normal leading-relaxed animate-pulse">...</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* 입력 영역 */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <textarea
                    id="smartMessageInput"
                    placeholder={isSending ? "답변을 기다리는 중..." : "여기에 메시지 입력..."}
                    disabled={isSending}
                    className="w-full box-sizing-border-box p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                            e.preventDefault();
                            const inputElement = e.target as HTMLTextAreaElement;
                            handleSendMessage(inputElement.value);
                            inputElement.value = '';
                        }
                    }}
                />
                <button
                    onClick={() => {
                        const inputElement = document.getElementById('smartMessageInput') as HTMLTextAreaElement;
                        handleSendMessage(inputElement.value);
                        inputElement.value = '';
                    }}
                    disabled={isSending}
                    className="mt-2 w-full bg-[#01274f] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
                >
                    {isSending ? '전송 중...' : '전송'}
                </button>
                <button onClick={handleResetSession} disabled={isSending}
                        className="reset-btn mt-2 w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50">
                    대화 초기화
                </button>
            </div>
        </div>
    );
};

// --- 페이지 최종 렌더링? ---
export default function ChatPage() {
    return (
        <Suspense fallback={<div>로딩 중...</div>}>
            <div className="flex flex-col w-full h-full">
                <style jsx global>{`
                  .main-wrapper { height: 100dvh !important; }
                  .bottom-nav-warpper { display: none !important; }
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                  }
                  .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                `}</style>
                <NavBar title="중간 위치 정하기" link="/setting" />
                <ChatInterface />
            </div>
        </Suspense>
    );
}