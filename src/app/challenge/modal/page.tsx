interface modalitems {
    icon: string;
    challengeday: string;
    lastday: string;
}

type ModalProps = modalitems;

const Modal: React.FC<ModalProps> = ({ icon, challengeday, lastday }) => {

    return (
        <div>
            <div className="flex flex-col items-center bg-[#FAFAFA] rounded-[8px] py-[16px]">
                <div className="text-[18px]">{icon}</div>
                <div className="text-[#01274F] text-[14px] leading-[150%] line-clamp-1 tracking-[-0.8px]">{challengeday}</div>
                <div className="text-[#737373] text-[12px] leading-[150%] line-clamp-1 tracking-[-0.8px]">{lastday}</div>
            </div>
        </div>
    );
};