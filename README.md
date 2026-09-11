# 경산로그 (GyeongSanLog)

> 경산을 여행하고, 그 순간을 함께 기록하는 모바일 웹 앱 — 공모전 출품작

경산의 관광지를 **찾아보고**, 친구들과 여행 그룹을 만들어 정해진 시간마다
짧은 영상을 남기고, 여행이 끝나면 서로에게 쓴 편지를 열어보는 앱입니다.
팔공산·갓바위 같은 경산의 자연과 문화유적을 화면 곳곳의 모티브로 삼았습니다.

데스크톱에서도 항상 휴대폰 한 대처럼 보이도록 `PhoneFrame`(최대 430px)으로
감싸 렌더링합니다.

---

## 무엇을 할 수 있나요

| 영역 | 내용 |
| --- | --- |
| **로그인** | 이메일 회원가입/로그인, 카카오 로그인, 이메일 인증코드 발송·확인 |
| **홈** | 시간대별 인사말, 진행중인 축제, 중심 관광지 TOP5 |
| **검색** | 관광지 이름·주소 검색, 인기 검색어 칩 |
| **관광지 상세** | 사진, 관광 정보(전화/운영시간/휴무일/주차), **무장애 정보**(엘리베이터·화장실·유모차), 찜하기, 가까운 곳 추천 3곳 |
| **지도** | 현위치 기준 카카오 지도, **랜덤 여행지 뽑기**(슬롯머신 연출 → 지도에 핀이 떨어짐) |
| **갤러리** | 여행 그룹 만들기/초대코드로 참여, 시간대별 셋로그 그리드, 여행이 끝나야 열리는 편지 |
| **촬영** | 그룹의 현재 시간대 슬롯에 2초짜리 클립 촬영 후 업로드 |
| **마이페이지** | 프로필 수정, 찜 목록, 비밀번호 재설정, 로그아웃, 회원 탈퇴 |

### 이 앱만의 것 — 셋로그(SetLog)

여행 그룹은 시작일~종료일 사이를 **한 시간 단위 슬롯**으로 나눕니다.
각 슬롯마다 멤버 수만큼 칸이 생기고, 멤버들이 그 시간에 찍은 2초 클립이
칸을 하나씩 채웁니다. 같은 시간, 다른 자리에서 무엇을 보고 있었는지가
한 화면에 모이는 구조입니다. 편지는 **여행 종료일이 지나야** 열립니다.

---

## 기술 스택

- **React 19** + **Vite 8**
- **react-router-dom 7** (`BrowserRouter`)
- **Tailwind CSS v4** — `@tailwindcss/vite` 플러그인 사용, **설정 파일 없음**
  (`src/index.css`에서 `@import "tailwindcss"` 한 줄로 시작)
- **카카오 SDK 2종** — 로그인용(`window.Kakao`)과 지도용(`window.kakao.maps`),
  둘 다 같은 JavaScript 키를 쓰지만 스크립트는 별개
- 상태 관리 라이브러리 없음 (화면별 `useState` / `useEffect`)
- 토큰은 `localStorage`, 401이면 refresh 토큰으로 자동 재발급 후 재시도

---

## 시작하기

```bash
npm install

# .env 파일을 만들고 아래 두 값을 채웁니다 (.env.example 참고)
#   VITE_API_BASE_URL=https://gyeongsanlog.cloud
#   VITE_KAKAO_JS_KEY=<카카오 JavaScript 키>

npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
```

### 환경변수

| 이름 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | 백엔드 주소. 없으면 `https://gyeongsanlog.cloud`로 기본값 사용 |
| `VITE_KAKAO_JS_KEY` | 카카오 **JavaScript 키**. 로그인과 지도가 이 키 하나를 공유 |

> `.env`는 Vite가 **개발 서버를 켜는 시점에만** 읽습니다. 값을 고쳤으면
> `npm run dev`를 다시 시작하세요. 배포(Vercel 등)할 때는 `.env`가 git에
> 올라가지 않으므로 **호스팅 쪽 환경변수에 따로 등록**해야 합니다.

### 카카오 개발자 콘솔 설정

지도가 흰 화면으로 남거나 로그인이 안 되면 대부분 여기가 원인입니다.

1. **앱 설정 → 플랫폼 → Web** 에 사이트 도메인 등록
   (`http://localhost:5173`, 배포 도메인)
2. **제품 설정 → 카카오맵** 을 ON
3. **제품 설정 → 카카오 로그인** 활성화 + Redirect URI 등록

둘 중 하나라도 빠지면 스크립트는 200으로 내려받아지지만 지도가 그려지지 않습니다.
브라우저 콘솔에서 `window.kakao.maps`를 찍어보면 로드 여부를 바로 확인할 수 있습니다.

---

## 폴더 구조

```
src/
├─ api/                 도메인별 API 래퍼 (스웨거 명세 기준)
│  ├─ client.js         BASE_URL, 토큰 저장/조회, authFetch(401 자동 재발급)
│  ├─ auth.js           회원가입·로그인·카카오·이메일 인증
│  ├─ member.js         내 정보, 비밀번호 변경, 탈퇴
│  ├─ areas.js          관광지 목록/상세/찜/추천/랜덤/인기/축제
│  └─ groups.js         여행 그룹, 클립 업로드, 편지
├─ components/
│  ├─ AppHeader.jsx     메인 탭 상단 브랜드 헤더 (하단 경계 = 능선 실루엣)
│  ├─ BottomNav.jsx     하단 탭 + 가운데 촬영 버튼
│  ├─ Logo.jsx          렌즈 배지 안의 "갓바위 위로 뜨는 해" 인라인 SVG
│  ├─ SectionTitle.jsx  잎사귀 표식 + 밑줄이 그어지는 공용 섹션 제목
│  └─ SlotGrid.jsx      시간대별 셋로그 그리드
├─ pages/               라우트 단위 화면
├─ utils/
│  ├─ kakao.js          로그인용 카카오 SDK 로더
│  ├─ kakaoMap.js       지도용 SDK 로더 + 현위치 + 거리 계산
│  ├─ category.js       카테고리 → 색(칩) 매핑, 순위 뱃지 색
│  └─ videoOverlay.js   클립에 자막/오버레이 합성
├─ App.jsx              라우팅 + PhoneFrame
└─ index.css            Tailwind 진입점 + 전역 모션/질감 유틸
```

### 라우트

| 경로 | 화면 |
| --- | --- |
| `/login` `/signup` | 로그인 / 회원가입 |
| `/oauth/kakao` | 카카오 로그인 콜백 |
| `/home` | 홈 |
| `/search` `/spots/:id` | 검색 / 관광지 상세 |
| `/map` | 지도 + 랜덤 여행지 뽑기 |
| `/gallery` `/gallery/new` `/gallery/:groupId` | 갤러리 / 그룹 생성 / 그룹 상세 |
| `/camera/:groupId` `/camera/:groupId/result` | 촬영 / 촬영 결과 |
| `/mypage` `/profile` `/password-reset` `/account/delete` | 마이페이지 계열 |
| `/favorites` | 찜 목록 (더보기로 페이지 이어받기, 카드에서 바로 찜 해제) |
| `/support/contact` `/support/notice` | 공용 빈 상태 페이지(`EmptyStatePage`) |

---

## 디자인 시스템

색은 CSS 변수 대신 **클래스 안에 직접 쓴 hex**로 관리합니다. 이 코드베이스가
다른 곳에서도 그렇게 쓰고 있어서, 굳이 한 겹의 추상화를 더하지 않았습니다.
색을 바꿀 때는 전체 검색·치환으로 처리합니다.

### 색

| 역할 | 값 |
| --- | --- |
| 포인트(황토) | `#8B4A26` · hover `#6B3618` · 옅은 틴트 `#F6ECDD` |
| 솔숲 | `#4B6B4E` · 연한 `#9DB894` |
| 햇빛 | `#E8B769` |
| 갓바위 돌 | `#5C4433` |
| 종이 배경 | `#FDFAF4` · 카드 `#FFFCF6` / `#F4EFE6` |
| 경계선 | `#EBE0CE` / `#EFE7D9` |
| 글자 | 본문 `#2A2420` · 보조 `#6B6156` · 흐림 `#8C8274` |
| 경고 | `#d70015` |

카테고리 칩 색은 `src/utils/category.js`의 `categoryStyle()`이 한 곳에서
정합니다. `AREA_TYPE` enum과 TourAPI가 주는 한글 문자열 둘 다 받습니다.

### 서체

전체는 시스템 산세리프를 쓰고, **고운바탕**(Google Fonts)은 `.font-brand`를
붙인 곳 — 헤더 워드마크, 화면 제목, 섹션 제목 — 에만 좁게 적용합니다.

> 폰트 `@import`는 `src/index.css`에서 **반드시 `@import "tailwindcss"`보다 위**에
> 있어야 합니다. Vite/Lightning CSS는 `@import`가 다른 규칙 뒤에 오면 빌드에 실패합니다.

### 모션 유틸 (`src/index.css`)

| 클래스 | 쓰임 |
| --- | --- |
| `gs-rise` / `gs-rise-sm` | 화면·요소가 아래에서 떠오르며 등장 |
| `gs-stagger` | 컨테이너에 붙이면 자식들이 차례로 등장 (목록/그리드) |
| `gs-scale-in` / `gs-fade-in` | 모달 등장 |
| `gs-press` | 누르면 살짝 눌리는 촉감 (버튼·카드 공통) |
| `gs-skeleton` | 로딩 자리에 따뜻한 빛이 훑고 지나감 (회색 깜빡임 대체) |
| `gs-float` / `gs-sway` / `gs-sun` | 해·잎사귀 장식의 느린 움직임 |
| `gs-draw` | 섹션 제목 밑줄이 좌→우로 그어짐 |
| `gs-tab-pop` | 하단 탭 아이콘이 통 튀어오름 |
| `gs-paper` | 한지 결(아주 옅은 얼룩 세 겹) |

지도 뽑기 연출 전용 키프레임(`gs-bob`, `gs-reel`, `gs-pin-drop` 등)은 같은 파일
위쪽에 따로 모여 있습니다. 모든 애니메이션은
`prefers-reduced-motion: reduce`에서 멈추거나 즉시 끝나도록 처리했습니다.

---

## 현재 상태 / 남은 작업

- **백엔드 연동은 대부분 실제 API 기준**으로 되어 있습니다(`src/api/*`).
  다만 조회 API까지 전부 401을 명시하고 있어 **로그인 없이는 관광지 조회도 안 됩니다.**
- 검색은 백엔드에 키워드 파라미터가 없어서, 전체 목록(최대 200건)을 받아
  **프론트에서 이름·주소로 필터링**합니다. 데이터가 늘면 검색 API가 필요합니다.
- `/api/area/popular`는 TourAPI 원본이라 `id`가 없어 상세 이동이 안 됩니다.
  지금은 우리 DB 목록과 **이름으로 매칭**해 매칭된 항목만 ⓘ 아이콘으로 이동시킵니다.
  백엔드에 `placeId` 추가를 요청하면 이 우회가 없어집니다.
- 관광지 상세 화면의 지도는 아직 자리표시입니다(지도 탭에는 연동 완료).
- `GET /api/area/{placeId}` 응답에 **찜 여부 필드가 없습니다.** 그래서 상세 화면의
  하트는 들어갈 때 항상 빈 상태로 시작하고, 눌러야 실제 상태가 반영됩니다.
  응답에 `favorited`(boolean)를 추가해 주면 `SpotDetail.jsx`가 바로 받아 씁니다
  (`data?.favorited ?? data?.isFavorite`로 이미 방어적으로 읽고 있음).
- 구글 로그인 버튼은 명세 대기 중이라 UI만 있습니다.
- **링크만 있고 화면이 없는 경로**: 로그인 화면의 `/find-account`,
  홈 헤더 알림 버튼의 `/notifications`.
- `src/pages/SetlogViewer.jsx`(분할화면 뷰어)와 `src/api.js`는 현재
  어디서도 import 하지 않는 보류 파일입니다. 촬영 흐름은
  `Camera → CameraResult`로 통일되어 있습니다.
