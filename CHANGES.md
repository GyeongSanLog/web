# 최종 점검 수정 내역 (2026-09-16)

`npm run build` ✓ / `npm run lint` ✓ 0 problems

## 적용 방법

1. 기존 프로젝트의 `src/`, `public/`, `index.html`, `.env.example`을 이 압축의 것으로 **통째로 교체**
2. `src/api.js`는 이 압축에 없음 — 기존 프로젝트에서 **직접 삭제** (죽은 목데이터 파일)
3. `.env`는 이 압축에 포함하지 않았으니 기존 것 그대로 유지
4. `node_modules`는 건드릴 필요 없음 (package.json 변경 없음)

## 🔴 반드시 고쳐야 했던 것

| # | 파일 | 내용 |
|---|---|---|
| 1 | `pages/AccountDelete.jsx` | 실제로 탈퇴되는데 "준비 중"이라고 뜨던 것 → 재확인 모달 + 완료 화면 + 로그인 이동 + 에러 표시 |
| 2 | `pages/CameraResult.jsx` | 영상 없이(카메라 거부·새로고침) 저장 가능하던 것 → 버튼 비활성 + 안내 |
| 3 | `api/auth.js`, `api/member.js`, `utils/notificationStorage.js`(신규), `context/NotificationsContext.jsx` | 로그아웃/탈퇴 시 알림 목록·FCM 토큰 캐시 미삭제 → 정리 + 메모리 상태 리셋 이벤트 |
| 3+ | `api/client.js`, `context/NotificationsContext.jsx` | 로그인 직후 FCM 토큰이 서버에 안 올라가던 것 → `setTokens`가 이벤트를 쏘고 Provider가 재동기화 |

## 🟠 특정 상황에서 터지던 것

| # | 파일 | 내용 |
|---|---|---|
| 4 | `api/client.js` | 동시 401 → 재발급 경쟁 → 강제 로그아웃 → 진행 중 재발급 Promise 공유 |
| 5 | `api/groups.js`, `pages/Gallery.jsx` | 시작 전 그룹이 "지난 여행"에 뜨던 것 → "예정된 여행" 섹션 분리 |
| 6 | `pages/Gallery.jsx` | 그룹 썸네일(imageUrl) 미표시 → 진행중/예정/지난 타일 모두 표시 |
| 7 | `api/areas.js`, `pages/SpotDetail.jsx` | 찜 초기 상태 항상 빈 하트 → 찜 목록 조회로 확인 (`isAreaFavorited`, 백엔드에 `favorited` 필드 요청 권장) |
| 8 | `pages/MyPage.jsx` | 소셜 로그인 사용자에게 비밀번호 메뉴 노출 → `provider`가 kakao/google 등이면 숨김 |
| 9 | `pages/CameraResult.jsx` | 편지 전송 실패를 사용자에게 안 알림 → 완료 모달에 실패 안내 |

## 🟡 다듬기

| # | 파일 | 내용 |
|---|---|---|
| 10 | `pages/Signup.jsx` | 동작 없는 프로필 사진 "+" 버튼 제거, 안내 문구로 대체. 가입 후 `replace` 이동 |
| 11 | `pages/SpotDetail.jsx` | "슬라이드 1/N"만 있고 넘길 수 없던 것 → 스와이프 슬라이더 + 점 인디케이터 |
| 12 | `pages/Signup.jsx`, `pages/PasswordChange.jsx` | placeholder "영문+숫자+특수문자" → 실제 검증(8자 이상)과 일치 |
| 13 | `pages/Camera.jsx`, `pages/CameraResult.jsx`, `utils/videoOverlay.js` | 디버그 `console.log` 37개 제거 (에러 로그는 유지) |
| 14 | `pages/Camera.jsx`, `api/groups.js`, `utils/videoOverlay.js` | iOS 사파리(mp4) 대응 — 지원 포맷으로 녹화하고 Blob 타입/파일 확장자를 실제 포맷에 맞춤 |
| 15 | `App.jsx`, `pages/EmptyStatePage.jsx` | `/` 진입 시 토큰 있으면 홈으로. 404(`*`) 라우트 추가 |
| 16 | `index.html` | `lang="ko"` |
| 17 | `.env.example` | Firebase 키 7개 전부 기재 (잘려 있던 것 복구) |
| 18 | `public/logo192.png`(신규) | 서비스워커가 참조하던 알림 아이콘 생성 (favicon.svg 기반) |
| 19 | `src/api.js` 삭제, `api/groups.js` | 죽은 목데이터 정리 (`fetchGroupSessions`는 SetlogViewer용으로 유지) |
| 20 | `utils/kakao.js` | SDK 로드 실패 시 캐시 안 풀리던 것 → 실패하면 다음 클릭에 재시도 |
| 21 | `pages/Camera.jsx` | 서로 모순되던 타임존 주석 정리 |
| 22 | `pages/GroupNew.jsx` | 과거 날짜 선택 차단(`min`), 서버 에러 메시지 표시, `AUTH_EXPIRED` 처리 |
| – | `components/BottomNav.jsx` | + 버튼의 `AUTH_EXPIRED` 처리 누락 보완 |
| – | `pages/Search.jsx` | 에러 화면 "다시 시도"가 동작하지 않던 것 수정 (같은 조건 재검색) |

## Lint 정리 (react-hooks/set-state-in-effect, react-refresh)

- `App.jsx`: `/spots/:id`, `/gallery/:groupId`를 `key`로 감싸 파라미터 변경 시 재마운트 → `SpotDetail`, `GroupDetail`, `SetlogViewer`에서 effect 내 동기 setState 제거
- `pages/Gallery.jsx`, `pages/Search.jsx`, `pages/OauthKakao.jsx`: 로딩/에러를 파생 값 또는 초기 state로 전환
- `context/`: Provider(`NotificationsContext.jsx`) / 컨텍스트 객체(`notifications-context.js`) / 훅(`useNotifications.js`) 세 파일로 분리 → `Home.jsx`, `Notifications.jsx`의 import 경로 변경
- `public/firebase-messaging-sw.js`: `/* global */` 선언

## 23번 — 확인 필요 (코드 변경 없음)

`createGroup`이 `endAt`을 `"YYYY-MM-DDT23:59:59"`(타임존 없음)로 보냄. 서버가 이걸 UTC로 저장하고 `Z`를 붙여 돌려주면 여행 종료 판정이 9시간 밀림. 그룹 생성 후 `GET /api/group` 응답의 `endAt` 문자열 끝에 `Z`가 붙어 있는지 확인 — 붙어 있고 시각이 `14:59:59Z`처럼 밀려 있으면 백엔드 확인 필요.

## 백엔드에 요청할 것 (프론트만으로 해결 불가)

- `PlaceDetailResponse`에 `favorited: boolean` 추가 → `isAreaFavorited` 임시 조회 제거 가능
- 알림 이력 조회 API → 현재 알림 목록은 기기 로컬 저장
- 비밀번호 분실 재설정 / 아이디 찾기 API → `FindAccount.jsx`와 로그인 화면의 주석 처리된 버튼 복구 가능
- `MemberProfileResponse.provider`의 실제 값 확인 (MyPage 비밀번호 메뉴 숨김 조건)
