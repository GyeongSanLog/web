// ============================================================
// 마이페이지(회원 정보) 관련 API
// ============================================================

import { BASE_URL, authFetch } from "./client";

async function extractErrorMessage(res, fallback) {
  try {
    const body = await res.json();
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}

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
 * 회원 탈퇴
 * 지금은 화면 흐름만 먼저 만들어두고, 실제로 계정을 지우진 않음.
 */
export async function deleteMyAccount() {
  // TODO: 명세 확정되면 대략 이런 모양이 될 듯
  // const res = await authFetch(`${BASE_URL}/api/member/me`, { method: "DELETE" });
  // if (!res.ok) throw new Error(await extractErrorMessage(res, "회원 탈퇴에 실패했습니다"));
  // clearTokens();
}
