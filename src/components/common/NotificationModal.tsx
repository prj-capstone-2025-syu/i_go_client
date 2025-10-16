"use client";

import React, { FC } from 'react';

interface NotificationModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actionText?: string;
}

const NotificationModal: FC<NotificationModalProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  actionText = "확인"
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[99] w-full h-full bg-[rgba(217,217,217,0.85)]"
        onClick={onClose}
      ></div>
      <div className="fixed left-[50%] top-[55%] translate-x-[-50%] translate-y-[-50%] w-[85%] max-w-[335px] bg-[#fff] p-[20px] pb-[10px] z-[100] rounded-[8px] shadow-md">
        <p className="text-[18px] text-[#5C5C5C] font-[400] text-center">
          {title}
        </p>
        {subtitle && (
          <p className="text-[16px] text-[#8C8C8C] font-[400] text-center whitespace-pre-line mt-[4px]">
            {subtitle}
          </p>
        )}
        <div className="mt-[10px] w-full h-[1px] bg-[#dfdfdf]"></div>
        <div className="w-full">
          <button
            onClick={onClose}
            className="text-[#ff2f01] text-[16px] font-[500] tracking-[-0.8px] leading-[155%] text-center py-[10px] hover:opacity-[0.7] w-full"
          >
            {actionText}
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationModal;
