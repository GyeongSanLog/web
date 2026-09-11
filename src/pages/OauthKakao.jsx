import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { kakaoLogin } from "../api/auth";
import { getKakaoRedirectUrl } from "../utils/kakao";

/**
 * 카카오 로그인 콜백 페이지 (/oauth/kakao)
 *
 * Kakao.Auth.authorize()로 이동한 카카오 로그인이 끝나면,
 * 카카오가 이 경로로 "?code=인가코드" 형태의 쿼리스트링을 붙여서
 * 되돌려보낸다. 여기서 그 code를 꺼내 서버에 전달해 토큰을 발급받는다.
 */
export default function OauthKakao() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  // React StrictMode(개발 모드)에서 useEffect가 두 번 실행될 수 있는데,
  // 인가 코드는 1회용이라 두 번째 호출은 서버가 거부함. 중복 호출 방지.
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const kakaoError = params.get("error");

    if (kakaoError) {
      // 사용자가 카카오 로그인 동의 화면에서 취소한 경우 등
      setError("카카오 로그인이 취소됐어요");
      return;
    }

    if (!code) {
      setError("인가 코드를 받지 못했어요");
      return;
    }

    kakaoLogin({ authCode: code, redirectUrl: getKakaoRedirectUrl() })
      .then(() => {
        navigate("/home", { replace: true });
      })
      .catch((err) => {
        console.error("카카오 로그인 실패:", err);
        setError(err.message || "카카오 로그인에 실패했어요");
      });
  }, [navigate]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white px-6">
      {error ? (
        <>
          <p className="text-sm text-[#d70015] mb-4 text-center">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="text-sm text-[#6F4A2C] font-medium"
          >
            로그인 화면으로 돌아가기
          </button>
        </>
      ) : (
        <p className="text-sm text-[#6e6e73]">카카오 로그인 처리 중...</p>
      )}
    </div>
  );
}