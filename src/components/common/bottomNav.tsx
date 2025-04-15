"use client";

import Link from "next/link";

const footerLinks = [
  {
    title: "Prologue",
    link: "/about_I_GO",
  },
];

export default function QuickNav() {
  return (
    <div className="relative flex justify-between px-[22px] bg-[#fff] w-full py-[8px] h-[69px] gap-x-[115px] lg:gap-x-[125px] shadow-[1px_2px_6px_1px_rgba(0,0,0,0.25)]">
      <Link
        href="/calendar"
        className="flex flex-col gap-y-[3px] items-center py-[5px] px-[12px] w-full bg-[#fff] rounded-[8px] shadow-[1px_2px_8px_1px_rgba(0,0,0,0.25)] hover:border-[2px] hover:border-primary duration-300"
      >
        <svg
          className="w-[24px]"
          xmlns="http://www.w3.org/2000/svg"
          version="1.0"
          width="1202.000000pt"
          height="1280.000000pt"
          viewBox="0 0 1202.000000 1280.000000"
          preserveAspectRatio="xMidYMid meet"
        >
          <g
            transform="translate(0.000000,1280.000000) scale(0.100000,-0.100000)"
            fill="#000000"
            stroke="none"
          >
            <path d="M513 12497 l-512 -302 -1 -6097 0 -6098 5255 0 5255 0 0 545 0 545 751 0 751 0 -79 83 c-167 177 -301 378 -446 667 -260 518 -401 1056 -484 1835 -16 148 -17 509 -20 4643 l-3 4482 -4978 0 -4977 0 -512 -303z m517 -4692 c0 -2764 4 -4244 10 -4358 43 -714 162 -1259 365 -1672 91 -187 175 -313 284 -428 104 -109 182 -170 280 -219 l76 -38 3887 0 3888 0 0 -200 0 -200 -4565 0 -4565 0 0 5554 0 5554 162 96 c89 53 165 96 170 96 4 0 8 -1883 8 -4185z m2540 1550 l0 -965 -925 0 -925 0 0 965 0 965 925 0 925 0 0 -965z m2310 0 l0 -965 -1005 0 -1005 0 0 965 0 965 1005 0 1005 0 0 -965z m2310 0 l0 -965 -1005 0 -1005 0 0 965 0 965 1005 0 1005 0 0 -965z m2095 0 l0 -960 -897 -3 -898 -2 0 965 0 965 898 -2 897 -3 0 -960z m-6715 -2220 l0 -965 -925 0 -925 0 0 965 0 965 925 0 925 0 0 -965z m2310 0 l0 -965 -1005 0 -1005 0 0 958 c0 527 3 962 7 965 3 4 456 7 1005 7 l998 0 0 -965z m2310 0 l0 -965 -1005 0 -1005 0 0 965 0 965 1005 0 1005 0 0 -965z m2095 0 l0 -960 -897 -3 -898 -2 0 965 0 965 898 -2 897 -3 0 -960z m-6715 -1992 c0 -401 3 -833 7 -960 l6 -233 -931 0 -932 0 0 960 0 960 925 0 925 0 0 -727z m2310 -90 c0 -450 3 -882 7 -960 l6 -143 -1005 0 -1005 0 -7 92 c-3 50 -6 482 -6 960 l0 868 1005 0 1005 0 0 -817z m2310 -66 c0 -486 3 -918 6 -960 l7 -77 -1005 0 -1005 0 -7 53 c-3 28 -6 460 -6 960 l0 907 1005 0 1005 0 0 -883z m2100 -77 l0 -960 -897 2 -898 3 -3 958 -2 957 900 0 900 0 0 -960z m-6686 -1302 c3 -24 10 -92 17 -153 63 -632 242 -1224 478 -1582 l61 -93 -970 0 -969 0 -48 60 c-253 312 -409 920 -446 1743 l-3 67 937 0 938 0 5 -42z m2306 25 c0 -103 69 -572 115 -780 90 -405 246 -794 411 -1025 l34 -48 -958 0 -958 0 -46 48 c-314 324 -530 950 -603 1750 l-7 72 1006 0 c951 0 1006 -1 1006 -17z m2324 -155 c67 -665 245 -1256 487 -1615 27 -40 49 -76 49 -78 0 -3 -429 -5 -954 -5 l-954 0 -64 68 c-242 257 -432 722 -528 1297 -29 172 -60 418 -60 475 l0 30 1003 0 1003 0 18 -172z m2063 107 c18 -413 101 -977 198 -1330 29 -108 123 -393 150 -457 7 -17 -32 -18 -733 -18 l-740 0 -47 48 c-107 107 -225 290 -310 480 -150 339 -248 769 -298 1305 l-3 37 891 -2 890 -3 2 -60z" />
          </g>
        </svg>

        <p className="text-[#232323] text-[14px] font-[700] tracking-[-0.8px] leading-[110%]">
          캘린더
        </p>
      </Link>
      <Link
        href="/"
        className="duration-300 absolute left-[50%] translate-x-[-50%] top-[-10px] w-[75px] aspect-square rounded-full flex flex-col items-center justify-center gap-y-[4px] items-center bg-[#fff] shadow-[1px_2px_8px_1px_rgba(0,0,0,0.25)] hover:border-[2px] hover:border-primary"
      >
        <svg
          width="30"
          height="25"
          viewBox="0 0 30 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.0001 5.04639L4.30075 14.2828C4.30075 14.2958 4.29762 14.315 4.29137 14.3411C4.28524 14.367 4.28198 14.3859 4.28198 14.3993V23.7521C4.28198 24.0898 4.39988 24.3824 4.63562 24.6288C4.8713 24.8754 5.15038 24.9995 5.47293 24.9995H12.6181V17.517H17.3822V24.9998H24.5273C24.8498 24.9998 25.1293 24.876 25.3646 24.6288C25.6003 24.3827 25.7186 24.0898 25.7186 23.7521V14.3993C25.7186 14.3474 25.7119 14.3082 25.6999 14.2828L15.0001 5.04639Z"
            fill="#232323"
          />
          <path
            d="M29.7931 12.1785L25.7182 8.63217V0.682141C25.7182 0.500396 25.6624 0.350932 25.5504 0.233955C25.4394 0.117114 25.2966 0.0586935 25.1227 0.0586935H21.55C21.3763 0.0586935 21.2336 0.117114 21.1218 0.233955C21.0103 0.350932 20.9546 0.500464 20.9546 0.682141V4.48172L16.4144 0.506606C16.0178 0.168846 15.5463 0 15.0004 0C14.4546 0 13.9832 0.168846 13.5863 0.506606L0.206772 12.1785C0.0827437 12.2822 0.0147659 12.4219 0.00212194 12.5973C-0.0104569 12.7725 0.0328846 12.9256 0.132277 13.0554L1.28594 14.4973C1.38534 14.6142 1.51543 14.6856 1.67673 14.7118C1.82566 14.7249 1.97459 14.6793 2.12351 14.5754L15.0001 3.33208L27.8767 14.5754C27.9762 14.666 28.1062 14.7112 28.2675 14.7112H28.3234C28.4845 14.6856 28.6143 14.6136 28.7142 14.4971L29.868 13.0553C29.9672 12.9253 30.0107 12.7724 29.9978 12.597C29.9851 12.4221 29.9168 12.2824 29.7931 12.1785Z"
            fill="#232323"
          />
        </svg>

        <p className="text-[#232323] text-[13px] font-[700] tracking-[-0.8px] leading-[110%]">
          메인
        </p>
      </Link>
      <Link
        href="/mypage"
        className="flex flex-col gap-y-[3px] items-center py-[5px] px-[12px] w-full bg-[#fff] rounded-[8px] shadow-[1px_2px_8px_1px_rgba(0,0,0,0.25)] hover:border-[2px] hover:border-primary duration-300"
      >
        <svg
          className="w-[24px]"
          viewBox="0 0 27 27"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.5 2C11.2255 2 9.00211 2.67446 7.11095 3.9381C5.21978 5.20174 3.7458 6.99779 2.87539 9.09914C2.00498 11.2005 1.77724 13.5128 2.22097 15.7435C2.6647 17.9743 3.75997 20.0234 5.36828 21.6317C6.97658 23.24 9.02568 24.3353 11.2565 24.779C13.4872 25.2228 15.7995 24.995 17.9009 24.1246C20.0022 23.2542 21.7983 21.7802 23.0619 19.8891C24.3255 17.9979 25 15.7745 25 13.5C25 10.45 23.7884 7.52494 21.6317 5.36827C19.4751 3.2116 16.55 2 13.5 2Z"
            stroke="#232323"
            stroke-width="3.04533"
            stroke-miterlimit="10"
          />
          <path
            d="M9.84082 9.99039C9.84082 9.99039 9.89571 8.84693 11.1195 7.86224C11.8455 7.27744 12.7158 7.1082 13.4999 7.09644C14.2141 7.0873 14.8518 7.20556 15.2334 7.38721C15.8868 7.69823 17.159 8.45749 17.159 10.0721C17.159 11.7709 16.0482 12.5426 14.7826 13.3914C13.5169 14.2402 13.1732 15.1615 13.1732 16.1135"
            stroke="#232323"
            stroke-width="2.66466"
            stroke-miterlimit="10"
            stroke-linecap="round"
          />
          <path
            d="M13.1081 20.818C13.8298 20.818 14.4149 20.2329 14.4149 19.5112C14.4149 18.7894 13.8298 18.2043 13.1081 18.2043C12.3864 18.2043 11.8013 18.7894 11.8013 19.5112C11.8013 20.2329 12.3864 20.818 13.1081 20.818Z"
            fill="#232323"
          />
        </svg>

        <p className="text-[#232323] text-[14px] font-[700] tracking-[-0.8px] leading-[110%]">
          마이페이지
        </p>
      </Link>
    </div>
  );
}
