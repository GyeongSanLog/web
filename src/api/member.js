// ============================================================
// 마이페이지(회원 정보) 관련 API
// ============================================================

import { BASE_URL, authFetch, clearTokens, getRefreshToken } from "./client";

async function extractErrorMessage(res, fallback) {
  try {
    const body = await res.json();
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 회원 정보 조회
 * GET /api/member/me
 */
export async function fetchMyInfo() {
  const res = await authFetch(`${BASE_URL}/api/member/me`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(
      await extractErrorMessage(res, "회원 정보를 불러오지 못했습니다"),
    );
  }

  return res.json();
}

/**
 * 회원 정보 수정
 * PATCH /api/member/me
 */
export async function updateMyInfo({
  nickname,
  name,
  profileImageFile,
  resetProfileImage = false,
}) {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify({ nickname, name, resetProfileImage })], {
      type: "application/json",
    }),
  );
  if (profileImageFile) {
    formData.append("profileImage", profileImageFile);
  }

  const res = await authFetch(`${BASE_URL}/api/member/me`, {
    method: "PATCH",
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("이미 사용중인 닉네임이에요");
    }
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(
      await extractErrorMessage(res, "회원 정보 수정에 실패했습니다"),
    );
  }

  return res.json();
}

/**
 * 비밀번호 변경
 * PATCH /api/member/me/password
 */
export async function changeMyPassword({ currentPassword, newPassword }) {
  const res = await authFetch(`${BASE_URL}/api/member/me/password`, {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("현재 비밀번호가 일치하지 않습니다");
    }
    throw new Error(
      await extractErrorMessage(res, "비밀번호 변경에 실패했습니다"),
    );
  }
}

/**
 * FCM 토큰 등록
 * PATCH /api/member/me/fcm-token — 푸시 알림을 받을 기기 토큰을 등록/갱신.
 * 로그인 후와 토큰 갱신 시 호출.
 *
 * 주의: 아직 Firebase 프로젝트 설정 전이라, fcmToken 값 자체를 얻어올
 * 방법이 없음. Firebase 프로젝트 생성 + FCM 웹 설정(VAPID 키 등) +
 * firebase.js 같은 초기화 파일이 먼저 필요함. 이 함수는 그 값을 받아서
 * 서버에 등록하는 부분만 미리 구현해둔 것.
 *
 * Request body: { fcmToken }
 * Response 204: 등록 성공 (바디 없음)
 */
export async function updateFcmToken(fcmToken) {
  const res = await authFetch(`${BASE_URL}/api/member/me/fcm-token`, {
    method: "PATCH",
    body: JSON.stringify({ fcmToken }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(await extractErrorMessage(res, "알림 설정에 실패했습니다"));
  }
}

/**
 * 회원 탈퇴
 * DELETE /api/member/me — 계정을 탈퇴 처리한다(소프트 삭제)
 *
 * Request body: { refreshToken } — 필수
 * Response 204: 탈퇴 성공 (바디 없음)
 * Response 409: 다른 멤버가 있는 그룹의 리더라 탈퇴 불가
 *
 * 성공하면 로컬 토큰도 정리해서 로그아웃 상태로 전환.
 * 화면 쪽에서는 성공 후 로그인 페이지 등으로 navigate 처리 필요.
 */
export async function deleteMyAccount() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("AUTH_EXPIRED");

  const res = await authFetch(`${BASE_URL}/api/member/me`, {
    method: "DELETE",
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("다른 멤버가 있는 그룹의 리더는 탈퇴할 수 없어요");
    }
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(
      await extractErrorMessage(res, "회원 탈퇴에 실패했습니다"),
    );
  }

  // 204라 응답 바디 없음 — json 파싱하지 않음
  clearTokens();
}