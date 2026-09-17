import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { fetchGroupInfo, uploadClip, writeLetter } from "../api/groups";
import { fetchMyInfo } from "../api/member";
import { burnOverlayIntoVideo, formatTimeLabel } from "../utils/videoOverlay";

export default function CameraResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const {
    videoUrl = null,
    videoBlob = null,
    poster = null,
    capturedAt = null,
  } = location.state || {};

  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [caption, setCaption] = useState(""); // 영상에 올라갈 고정자막 (clip.comment로 전송)
  const [letter, setLetter] = useState(""); // 특정 멤버에게 보내는 편지 (writeLetter로 전송)
  const [uploading, setUploading] = useState(false);
  const [composing, setComposing] = useState(false); // 자막 합성 중
  const [uploadDone, setUploadDone] = useState(false);
  const [letterFailed, setLetterFailed] = useState(false); // 클립은 저장됐지만 편지만 실패한 경우
  const [error, setError] = useState("");

  // 영상 없이는 저장할 수 없음. videoBlob이 없는 경우는 두 가지:
  //   1) 카메라 권한 거부 → Camera.jsx가 goNext(null, null)로 넘김
  //   2) 이 화면에서 새로고침 → location.state가 사라짐
  // 예전엔 이 상태에서도 저장 버튼이 눌려서 uploadClip이
  // formData.append("file", null)을 실행했고, 이건 파일이 아니라 "null"이라는
  // 문자열 4글자를 붙이는 거라 서버가 400을 내거나 깨진 파일이 저장됐음.
  const canSave = Boolean(videoBlob);

  // 영상에 함께 박힐 촬영 시간 (예: "14:32")
  const timeLabel = formatTimeLabel(capturedAt);

  // 그룹 멤버 목록 (편지 받을 사람 선택용). 나 자신은 목록에서 제외
  // ("자기 자신에게는 편지를 남길 수 없다"는 서버 규칙과 맞춤).
  useEffect(() => {
    Promise.all([fetchGroupInfo(groupId), fetchMyInfo()])
      .then(([info, myInfo]) => {
        const others = (info.members ?? []).filter((m) => m.userId !== myInfo.id);
        setMembers(others);
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        console.error("멤버 목록 로드 실패:", err);
      })
      .finally(() => setLoadingMembers(false));
  }, [groupId, navigate]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const selected = members.find((m) => m.userId === selectedId) || null;

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  async function handleSave() {
    if (uploading || !canSave) return;
    setError("");
    setLetterFailed(false);
    setUploading(true);

    try {
      // 1) 촬영 시간과 자막을 영상에 합성한 뒤 업로드.
      //    합성이 실패하거나 브라우저가 지원하지 않으면 원본이 그대로 반환됨.
      //    comment로도 자막 텍스트를 함께 보내둠(검색/표시용).
      setComposing(true);
      const finalBlob = await burnOverlayIntoVideo(videoBlob, {
        caption: caption.trim(),
        capturedAt,
      });
      setComposing(false);

      await uploadClip({
        groupId,
        videoBlob: finalBlob,
        comment: caption.trim() || undefined,
        capturedAt,
      });

      // 2) 받는 사람을 선택했고 편지 내용도 있을 때만 편지 전송.
      //    클립 업로드와는 독립적인 동작이라, 편지 전송이 실패해도
      //    클립 저장 자체는 이미 완료된 것으로 처리하되, 사용자에게는 알려준다.
      //    (예전엔 console.error만 찍고 "업로드 완료"로 넘어가서, 정성껏 쓴
      //     편지가 조용히 사라졌음 — 같은 사람에게 이미 보낸 경우 409 등)
      let letterOk = true;
      if (selectedId && letter.trim()) {
        try {
          await writeLetter(groupId, {
            receiverId: selectedId,
            content: letter.trim(),
          });
        } catch (letterErr) {
          if (letterErr.message === "AUTH_EXPIRED") {
            navigate("/login");
            return;
          }
          letterOk = false;
          setLetterFailed(true);
          setError(letterErr.message || "편지를 전송하지 못했어요");
        }
      }

      setUploadDone(true);
      setTimeout(
        () => {
          // replace: true — 촬영/결과 화면(이미 끝난 단계)이 히스토리에 남아있으면
          // 그룹상세에서 뒤로가기 눌렀을 때 거기로 돌아가버리는 문제가 있어서 대체함
          navigate(`/gallery/${groupId}`, { replace: true });
        },
        letterOk ? 1200 : 2600 // 편지 실패 안내는 읽을 시간을 조금 더 줌
      );
    } catch (err) {
      setComposing(false);
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      setError(err.message || "업로드에 실패했어요");
      setUploading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* 헤더 */}
      <div className="shrink-0 pt-10 px-5 pb-3 flex items-center justify-between border-b border-[#EFE7D9]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#F4EFE6] flex items-center justify-center shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-[15px] font-medium text-[#2A2420]">영상 확인</p>
        </div>
        {/* 다시 찍기 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[13px] text-[#8B4A26] font-medium"
        >
          <RetakeIcon />
          다시 찍기
        </button>
      </div>

      {/* 스크롤 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        {/* 영상 미리보기 */}
        <div className="relative rounded-2xl overflow-hidden bg-[#2A2420] aspect-[3/4] mb-6">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={poster || undefined}
              playsInline
              onEnded={() => setPlaying(false)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : poster ? (
            <img
              src={poster}
              alt="촬영 미리보기"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <PlaceholderPlay />
              <p className="text-xs text-white/70 leading-relaxed">
                촬영된 영상이 없어요.
                <br />
                다시 찍기를 눌러 촬영해주세요
              </p>
            </div>
          )}

          {/* 재생 버튼 오버레이 */}
          {videoUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
              aria-label={playing ? "일시정지" : "재생"}
            >
              {!playing && (
                <span className="w-14 h-14 rounded-full bg-black/45 backdrop-blur flex items-center justify-center">
                  <PlayIcon />
                </span>
              )}
            </button>
          )}

          {/* 합성 미리보기 - 실제 저장될 영상과 동일하게 시간+자막을 정중앙에 표시 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-1.5 pointer-events-none">
            <p className="text-white text-2xl font-semibold drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)]">
              {timeLabel}
            </p>
            {caption.trim() && (
              <p className="text-white text-center text-lg font-medium leading-snug drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)]">
                {caption}
              </p>
            )}
          </div>

          <span className="absolute top-3 left-3 text-[11px] text-white bg-black/45 px-2 py-1 rounded-full">
            셋로그 · 2초
          </span>
        </div>

        {/* 고정자막 입력 */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-medium text-[#2A2420]">고정자막</p>
          <span className="text-[11px] text-[#8C8274]">{caption.length}/40</span>
        </div>
        <input
          value={caption}
          maxLength={40}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="영상에 남길 짧은 한마디 (선택)"
          className="w-full h-11 rounded-xl bg-[#F4EFE6] border border-[#E6DDCD] px-3.5 text-sm text-[#2A2420] placeholder:text-[#A99C89] outline-none focus:border-[#8B4A26]"
        />
        <p className="text-[11px] text-[#8C8274] mt-1.5 mb-7">
          촬영 시간({timeLabel})과 자막이 영상 정중앙에 함께 저장돼요
        </p>

        {/* 사람 선택 */}
        <p className="text-base font-medium text-[#2A2420] mb-1">
          누구에게 편지를 남길까요?
        </p>
        <p className="text-xs text-[#8C8274] mb-3.5">
          편지는 여행이 끝난 뒤에 받는 사람만 볼 수 있어요
        </p>

        {loadingMembers ? (
          <div className="flex gap-3 mb-7">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-14 h-14 rounded-full gs-skeleton shrink-0" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-[#8C8274] mb-7">
            함께 여행 중인 멤버가 없어요
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 mb-7 scrollbar-hide">
            {members.map((m) => {
              const active = m.userId === selectedId;
              return (
                <button
                  key={m.userId}
                  onClick={() => setSelectedId(active ? null : m.userId)}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden text-base font-medium transition-all ${
                      active
                        ? "bg-[#8B4A26] text-white ring-2 ring-[#8B4A26] ring-offset-2"
                        : "bg-[#F6ECDD] text-[#8B4A26]"
                    }`}
                  >
                    {m.profileImageUrl ? (
                      <img src={m.profileImageUrl} alt={m.nickname} className="w-full h-full object-cover" />
                    ) : (
                      m.nickname?.[0] ?? "?"
                    )}
                  </span>
                  <span
                    className={`text-[11px] ${
                      active ? "text-[#8B4A26] font-medium" : "text-[#8C8274]"
                    }`}
                  >
                    {m.nickname}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 편지 입력 */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-medium text-[#2A2420]">편지 남기기</p>
          <span className="text-[11px] text-[#8C8274]">
            {letter.length}/200
          </span>
        </div>
        <textarea
          value={letter}
          maxLength={200}
          onChange={(e) => setLetter(e.target.value)}
          placeholder={
            selected
              ? `${selected.nickname}님에게 전하고 싶은 말을 적어보세요`
              : "받을 사람을 먼저 선택해주세요"
          }
          disabled={!selectedId}
          className="w-full h-32 rounded-2xl bg-[#F4EFE6] border border-[#E6DDCD] p-4 text-sm text-[#2A2420] placeholder:text-[#A99C89] resize-none outline-none focus:border-[#8B4A26] disabled:opacity-60"
        />
        {selectedId && !letter.trim() && (
          <p className="text-[11px] text-[#8C8274] mt-1.5">
            편지를 남기려면 내용을 함께 입력해주세요
          </p>
        )}

        {!canSave && (
          <p className="text-xs text-[#d70015] mt-3">
            영상이 없어서 저장할 수 없어요. 다시 찍기를 눌러주세요.
          </p>
        )}
        {error && !letterFailed && (
          <p className="text-xs text-[#d70015] mt-3">{error}</p>
        )}
      </div>

      {/* 하단 저장 버튼 */}
      <div className="shrink-0 px-5 pt-3 pb-6 border-t border-[#EFE7D9] bg-white">
        <button
          onClick={handleSave}
          disabled={uploading || !canSave}
          className="w-full h-12 rounded-2xl bg-[#8B4A26] text-white text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed gs-press"
        >
          {composing
            ? "영상 만드는 중..."
            : uploading
            ? "업로드 중..."
            : "저장하기"}
        </button>
      </div>

      {/* 업로드 완료 */}
      {uploadDone && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#2A1A0C]/30 px-8">
          <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-8 py-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-[#F6ECDD] flex items-center justify-center">
              <CheckIcon />
            </div>
            <p className="text-sm font-medium text-[#2A2420]">업로드 완료</p>
            {letterFailed && (
              <p className="text-xs text-[#d70015] leading-relaxed whitespace-pre-line">
                영상은 저장됐지만 편지는 전송되지 않았어요
                {error ? `\n(${error})` : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="white" />
    </svg>
  );
}

function PlaceholderPlay() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#4b4b4b" strokeWidth="1.4" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="#4b4b4b" />
    </svg>
  );
}

function RetakeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M4 12a8 8 0 1 1 2.3 5.6" stroke="#8B4A26" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 20v-4h4" stroke="#8B4A26" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#8B4A26" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}