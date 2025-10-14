# I-GO (Ai 지각 방지 비서)

<div align="center">
<img width="300" alt="I-GO Project Logo" src="https://igo.ai.kr/logo.png">

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fprj-capstone-2025-syu%2Fi_go_client&count_bg=%23007ACC&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)

</div>

> **삼육대학교 캡톤 디자인 프로젝트** <br/> **⏲️ 개발기간: 2025.03 ~ 현재 진행 중**

## 배포 주소 🚀

> **개발 서버:** [https://i-go.netlify.app/](https://i-go.netlify.app/) <br>
> **정식 서버:** [https://igo.ai.kr](https://igo.ai.kr) <br>

---

## I-GO 프로젝트 소개 👨‍🏫

I-GO는 계획적으로 살고 싶지만 아침잠이 많고, 외출 준비에 변수가 많은 대학생과 사회초년생을 위한 'AI 지각 방지 비서'입니다. 반복되는 지각으로 인한 스트레스와 타인과의 약속을 지키지 못하는 불안감을 근본적으로 해결하고자 시작되었습니다.

사용자들은 단순히 아침에 깨워주는 알람을 넘어, 외출 준비 과정 전체를 관리해주는 서비스를 필요로 합니다. I-GO는 매일 아침 날씨 앱, 지도 앱을 따로 확인해야 하는 번거로움을 없애고, 실시간 교통상황과 날씨 같은 예측 불가능한 변수까지 동적으로 계산하여 가장 정확한 출발 시간을 제안합니다.

궁극적으로 I-GO는 사용자가 아침마다 겪는 정보 탐색의 번거로움을 완전히 자동화하고, 'AI 잔소리'처럼 각 준비 단계마다 해야 할 일을 알려주어 생각 없이 따라만 해도 절대 늦지 않는 체계적인 아침 루틴을 만들어주는 것을 목표로 합니다.

---

## 주요 기능 📦

### ⭐️ AI 기반 스마트 일정 관리
- "오늘 3시에 강남에서 약속 있어"와 같이 Ai와 대화하듯 프롬프트 창에 입력하면 일정이 등록됩니다.
- 등록된 일정은 사용자의 구글 캘린더와 실시간으로 연동되어 여러 기기에서 편리하게 확인할 수 있습니다.

### ⭐️ 실시간 변수 대응 알람
- TMap API를 활용하여 목적지까지의 실시간 소요 시간을 초 단위로 계산합니다.
- 갑작스러운 폭우나 교통 체증 등 돌발 변수가 발생하면, 이를 즉시 감지하여 자동으로 알람을 앞당겨 사용자가 미리 대응할 수 있도록 돕습니다.

### ⭐️ 개인화된 준비 과정 가이드
- '지금 머리 감기', '30분 뒤에 옷 입기' 처럼, 사용자가 설정한 개인 준비 루틴에 맞춰 각 단계마다 수행할 작업을 푸시 알림으로 알려줍니다.
- "오늘 비 오니까 우산 챙겨!" 와 같이, 그날의 날씨나 일정에 필요한 준비물을 미리 알려주어 분주한 아침에 실수를 줄여줍니다.

---

## Stacks & Deployment 🛠️

### ⚙️ Development Stacks
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=Javascript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=Next.js&logoColor=white)
![Java](https://img.shields.io/badge/java-%23ED8B00.svg?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring](https://img.shields.io/badge/spring-%236DB33F.svg?style=for-the-badge&logo=spring&logoColor=white)

### ☁️ Deployment (CI/CD)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=GitHub%20Actions&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=Docker&logoColor=white)
- `main` 브랜치에 코드가 푸시되면 **GitHub Actions**와 **Docker**를 이용하여 **블루-그린 방식**의 **무중단 배포**가 자동으로 이루어집니다.

---

## 개발팀 소개 🧑‍🤝‍🧑

| 이정민(팀장) | 김재현 | 이서진 | 오승은 | 권승오 |
| :---: | :---: | :---: | :---: | :---: |
| [@BBongDDa](https://github.com/BBongDDa) | [@jaehyun](https://github.com/jaehyun) | [@seojin](https://github.com/seojin) | [@seungeun](https://github.com/seungeun) | [@seungoh](https://github.com/seungoh) |
| 컴퓨터공학전공 | 컴퓨터공학전공 | 컴퓨터공학전공 | 컴퓨터공학전공 | 컴퓨터공학전공 |

---

## 클라이언트 서버 실행방법
```bash
npm run dev
# or
yarn dev
```
