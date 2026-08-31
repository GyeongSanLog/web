import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMyInfo, updateMyInfo } from "../api/member";
import { ProfileAvatar } from "./MyPage";

const inputClass =
  "w-full h-11 rounded-[10px] bg-[#f5f5f7] border border-[#e5e5ea] px-3.5 text-[13px] text-[#1c1c1e] placeholder-[#98989d] outline-none focus:border-[#6F4A2C] transition-colors";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(location.state?.user ?? null);
  const [loading, setLoading] = useState(!location.state?.user);
  const [nickname, setNickname] = useState(location.state?.user?.nickname ?? "");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) return;
    fetchMyInfo()
      .then((data) => {
        setUser(data);
        setNickname(data.nickname);
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        setError(err.message || "회원 정보를 불러오지 못했습니다");
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  // 페이지 나갈 때 미리보기용으로 만든 objectURL은 안 지우면 계속 메모리에 남아있음
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const nicknameEmpty = nickname.trim().length === 0;
  const nicknameChanged = user && nickname.trim() !== user.nickname;
  const canSubmit = !nicknameEmpty && (nicknameChanged || imageFile);

  const handleSave = async () => {
    if (!canSubmit || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      // name(실명)은 이 화면에서 직접 고치는 값은 아니지만, 서버가 요청 바디에
      // nickname/name/resetProfileImage를 다 요구하고 name이 비어있으면 400을 내서
      // 기존 값 그대로 실어 보냄
      await updateMyInfo({
        nickname: nickname.trim(),
        name: user.name,
        profileImageFile: imageFile,
        resetProfileImage: false,
      });
      navigate("/mypage", { replace: true });
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      setError(err.message || "저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white px-6 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#1c1c1e]"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-base font-medium text-[#1c1c1e]">프로필 수정</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#f5f5f7] animate-pulse mb-4" />
            <div className="w-40 h-11 rounded-[10px] bg-[#f5f5f7] animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20"
                aria-label="프로필 사진 변경"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="프로필 사진 미리보기"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#6F4A2C]"
                  />
                ) : (
                  <ProfileAvatar user={user} size={80} />
                )}
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#6F4A2C] border-2 border-white flex items-center justify-center text-white text-xs">
                  +
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
              <p className="mt-2 text-xs text-[#98989d]">사진을 눌러 변경</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#6e6e73] mb-1.5">닉네임</p>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="셋로그에 표시될 이름"
                  className={`${inputClass} ${nicknameEmpty ? "border-[#d70015]" : ""}`}
                />
                {nicknameEmpty && (
                  <p className="mt-1 text-xs text-[#d70015]">
                    닉네임은 비워둘 수 없어요
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-[#6e6e73] mb-1.5">이메일</p>
                <div className={`${inputClass} flex items-center text-[#98989d]`}>
                  {user?.email}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-[#d70015] mt-4">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!canSubmit || submitting}
              className={`w-full h-12 rounded-xl text-sm font-medium mt-8 transition-colors ${
                canSubmit && !submitting
                  ? "bg-[#6F4A2C] text-white hover:bg-[#5c3d24]"
                  : "bg-[#e5e5ea] text-[#98989d]"
              }`}
            >
              {submitting ? "저장 중..." : "저장하기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 19l-7-7 7-7"
        stroke="#1c1c1e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
