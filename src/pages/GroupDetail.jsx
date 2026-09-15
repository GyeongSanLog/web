import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchGroupInfo,
  fetchGroupClips,
  withdrawFromGroup,
  fetchMyLetters,
  fetchLetter,
} from "../api/groups";
import { fetchMyInfo } from "../api/member";
import SlotGrid from "../components/SlotGrid";
import SectionTitle from "../components/SectionTitle";
import {
  TRIP_BEFORE,
  TRIP_ENDED,
  getTripStatus,
  formatSlotLabel,
  formatShortDate,
  formatShortDateTime,
} from "../utils/trip";

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null); // 그룹정보 + 멤버 + 초대코드
  const [myId, setMyId] = useState(null); // 내 userId (편지 발신자 제외용)
  const [clips, setClips] = useState([]); // 실제 클립(셋로그 촬영본) 목록
  const [letters, setLetters] = useState([]); // 받은 편지 목록 (writerNickname, createdAt만 포함)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  // 편지 내용 조회 모달 상태
  const [openLetterId, setOpenLetterId] = useState(null);
  const [openLetterContent, setOpenLetterContent] = useState(null);
  const [loadingLetterContent, setLoadingLetterContent] = useState(false);

  // 클립 재생 모달 상태
  const [openClip, setOpenClip] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetchGroupInfo(groupId),
      fetchMyInfo(),
      fetchGroupClips(groupId),
      fetchMyLetters(groupId),
    ])
      .then(([infoRes, myInfoRes, clipsRes, lettersRes]) => {
        setInfo(infoRes);
        setMyId(myInfoRes.id);
        setClips(clipsRes ?? []);
        setLetters(lettersRes ?? []);
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [groupId, navigate]);

  function handleCopyInviteCode() {
    if (!info?.inviteCode) return;
    setCopyFailed(false);

    // clipboard API는 https가 아니거나 브라우저가 막으면 아예 없을 수 있음.
    // 예전엔 실패해도 console.error만 찍어서, 사용자는 "복사됨!"이 안 뜨는
    // 것만 보고 이유를 알 수 없었음 → 코드를 직접 복사할 수 있게 안내.
    if (!navigator.clipboard?.writeText) {
      setCopyFailed(true);
      return;
    }

    navigator.clipboard
      .writeText(info.inviteCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => setCopyFailed(true));
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    setWithdrawError("");

    try {
      await withdrawFromGroup(groupId);
      navigate("/gallery");
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      setWithdrawError(err.message || "그룹 탈퇴에 실패했어요");
      setWithdrawing(false);
    }
  }

  async function handleOpenLetter(letterId) {
    // 여행 종료 전에는 버튼 자체가 화면에 없지만, 방어적으로 한 번 더 체크
    if (!info || getTripStatus(info.startAt, info.endAt) !== TRIP_ENDED) return;

    setOpenLetterId(letterId);
    setOpenLetterContent(null);
    setLoadingLetterContent(true);
    try {
      const detail = await fetchLetter(groupId, letterId);
      setOpenLetterContent(detail);
    } catch (err) {
      setOpenLetterContent({ error: err.message || "편지를 불러올 수 없어요" });
    } finally {
      setLoadingLetterContent(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-[#FDFAF4] px-5 pt-6">
        <div className="w-2/3 h-4 rounded gs-skeleton mb-5" />
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-lg gs-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="h-full bg-[#FDFAF4] flex flex-col items-center justify-center px-5">
        <p className="text-sm text-[#8C8274] mb-4">{error || "정보를 불러올 수 없어요"}</p>
        <button onClick={() => navigate("/gallery")} className="text-sm text-[#8B4A26] font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  const members = info.members ?? [];
  // 여행 상태(시작 전 / 진행 중 / 종료됨) - SlotGrid와 동일한 기준(utils/trip)
  const tripStatus = getTripStatus(info.startAt, info.endAt);
  const isTripEnded = tripStatus === TRIP_ENDED;

  return (
    // 바깥 래퍼는 스크롤하지 않고 "위치 기준"만 잡는다 (relative).
    // 스크롤은 안쪽 div가 담당하고, 모달들은 스크롤 컨테이너 바깥에 형제로 둔다.
    //
    // 왜 이렇게 바꿨나: 예전엔 스크롤 컨테이너 자체가 relative였고 모달이
    // 그 안의 absolute inset-0이었음. overflow-auto 안의 absolute 요소는
    // 콘텐츠와 함께 스크롤되므로, 페이지 맨 아래에 있는 "그룹 탈퇴하기"를
    // 누르면 확인 모달이 저 위쪽에 렌더링돼서 아무 반응 없는 것처럼 보였음.
    <div className="h-full relative">
      <div className="h-full overflow-y-auto bg-[#FDFAF4] pb-8">
        <div className="px-5 pt-6">

          {/* 헤더 */}
          <div className="flex items-center gap-2.5 mb-3">
            <button
              onClick={() => navigate("/gallery")}
              className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center shrink-0 gs-press"
              aria-label="뒤로가기"
            >
              <ArrowLeftIcon />
            </button>
            <div>
              <p className="font-brand text-[18px] font-bold text-[#2A2420]">{info.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[11px] text-[#8C8274]">
                  {formatShortDate(info.startAt)} ~ {formatShortDate(info.endAt)} · {members.length}명 참여
                </p>
                <MemberAvatars members={members} />
              </div>
            </div>
          </div>

          {/* 초대코드 */}
          <button
            onClick={handleCopyInviteCode}
            className="w-full flex items-center justify-between bg-gradient-to-r from-[#F8EEDC] to-[#F3E5CC] border border-[#EBDCC4] rounded-2xl px-3.5 py-3 gs-press gs-rise"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6B6156]">초대코드</span>
              <span className="text-[13px] font-medium text-[#2A2420] tracking-wide select-all">
                {info.inviteCode}
              </span>
            </div>
            <span className="text-[11px] text-[#8B4A26] font-medium">
              {copied ? "복사됨!" : "복사하기"}
            </span>
          </button>

          {copyFailed ? (
            <p className="text-[11px] text-[#8C8274] mt-2 mb-6 px-1">
              자동 복사가 안 돼요. 위 코드를 길게 눌러 직접 복사해주세요.
            </p>
          ) : (
            <div className="mb-6" />
          )}

          {/* 시간대별 셋로그 그리드 - 한 번에 한 시간대만, 멤버 수만큼 칸 표시 */}
          <SlotGrid
            startAt={info.startAt}
            endAt={info.endAt}
            members={members}
            clips={clips}
            myId={myId}
            groupId={groupId}
            onOpenClip={setOpenClip}
          />

          {/* 받은 편지 - 여행이 끝난 뒤에만 공개 */}
          <div className="mt-7">
            <SectionTitle tone="#B04A46">받은 편지</SectionTitle>
          </div>
          {!isTripEnded ? (
            <div className="flex flex-col items-center gap-1.5 py-9 bg-[#F8F3E9] border border-[#EFE4D2] rounded-2xl">
              <span className="w-11 h-11 rounded-full bg-[#F6ECDD] flex items-center justify-center gs-float">
                <LockIcon />
              </span>
              <p className="text-xs text-[#6B6156] mt-1">
                여행이 끝나면 편지를 확인할 수 있어요
              </p>
              <p className="text-[11px] text-[#8C8274]">
                {/* 시작 전인 여행에 "진행중"이라고 뜨던 문구를 상태별로 분리 */}
                {tripStatus === TRIP_BEFORE
                  ? `${formatShortDate(info.startAt)}에 여행이 시작돼요`
                  : `${formatShortDate(info.endAt)}까지 여행 진행중`}
              </p>
            </div>
          ) : letters.length === 0 ? (
            <p className="text-xs text-[#8C8274] py-4">아직 남겨진 편지가 없어요</p>
          ) : (
            <div className="flex flex-col gap-2 gs-stagger">
              {letters.map((letter) => (
                <button
                  key={letter.letterId}
                  onClick={() => handleOpenLetter(letter.letterId)}
                  className="bg-[#FFFCF6] border border-[#EBE0CE] rounded-2xl p-3 flex items-center gap-2.5 text-left gs-press hover:bg-[#FBF5EA]"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C2685C] to-[#9C4640] flex items-center justify-center text-xs text-white font-medium shrink-0">
                    {letter.writerNickname?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-xs text-[#2A2420]">{letter.writerNickname}님이 남긴 편지</p>
                    <p className="text-[11px] text-[#8C8274] mt-0.5">
                      {formatShortDateTime(letter.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 그룹 탈퇴 */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#DCCFB6] to-transparent mt-8 mb-4" />
          <button
            onClick={() => {
              setWithdrawError("");
              setShowWithdrawConfirm(true);
            }}
            className="text-[13px] text-[#d70015] font-medium"
          >
            그룹 탈퇴하기
          </button>

        </div>
      </div>

      {/* --- 모달들: 스크롤 컨테이너 바깥에 둬서 항상 화면 정중앙에 뜨게 함 --- */}

      {/* 클립 재생 모달 */}
      {openClip && (
        <div
          className="absolute inset-0 bg-[#1A1008]/75 flex items-center justify-center px-8 z-20 gs-fade-in"
          onClick={() => setOpenClip(null)}
        >
          <div
            className="w-full max-w-[280px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
              {openClip.videoUrl ? (
                <video
                  src={openClip.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  영상을 불러올 수 없어요
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              {/* 며칠짜리 여행에서 "17:00"만 보이면 몇 일인지 알 수 없어서
                  그리드 라벨과 같은 "9.2 17:00" 형식으로 통일 */}
              <p className="text-[13px] text-white">
                {openClip.nickname} · {formatSlotLabel(info.startAt, openClip.slotIndex)}
              </p>
              <button
                onClick={() => setOpenClip(null)}
                className="text-[13px] text-white/70"
              >
                닫기
              </button>
            </div>
            {openClip.comment && (
              <p className="text-[12px] text-white/80 mt-1 px-1">{openClip.comment}</p>
            )}
          </div>
        </div>
      )}

      {/* 편지 내용 모달 */}
      {openLetterId && (
        <div
          className="absolute inset-0 bg-[#2A1A0C]/45 flex items-center justify-center px-8 z-20 gs-fade-in"
          onClick={() => setOpenLetterId(null)}
        >
          <div
            className="w-full bg-[#FFFCF6] border border-[#EBE0CE] rounded-2xl p-5 gs-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingLetterContent ? (
              <div className="py-6 text-center text-sm text-[#8C8274]">불러오는 중...</div>
            ) : openLetterContent?.error ? (
              <p className="text-sm text-[#d70015] py-4">{openLetterContent.error}</p>
            ) : (
              <>
                <p className="text-[13px] font-medium text-[#2A2420] mb-1">
                  {openLetterContent?.writerNickname}님의 편지
                </p>
                <p className="text-[11px] text-[#8C8274] mb-4">
                  {formatShortDateTime(openLetterContent?.createdAt)}
                </p>
                <p className="text-sm text-[#2A2420] leading-relaxed whitespace-pre-wrap">
                  {openLetterContent?.content}
                </p>
              </>
            )}
            <button
              onClick={() => setOpenLetterId(null)}
              className="w-full h-11 rounded-xl bg-[#F4EFE6] text-[14px] text-[#2A2420] font-medium mt-5"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 탈퇴 확인 모달 */}
      {showWithdrawConfirm && (
        <div className="absolute inset-0 bg-[#2A1A0C]/45 flex items-center justify-center px-8 z-20 gs-fade-in">
          <div className="w-full bg-[#FFFCF6] border border-[#EBE0CE] rounded-2xl p-5 gs-scale-in">
            <p className="text-[15px] font-medium text-[#2A2420] mb-1.5">
              정말 탈퇴하시겠어요?
            </p>
            <p className="text-[13px] text-[#6B6156] mb-4">
              리더는 그룹에 혼자 남았을 때만 탈퇴할 수 있어요.
              탈퇴 후에는 되돌릴 수 없어요.
            </p>

            {withdrawError && (
              <p className="text-[13px] text-[#d70015] mb-3">{withdrawError}</p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowWithdrawConfirm(false)}
                disabled={withdrawing}
                className="flex-1 h-11 rounded-xl bg-[#F4EFE6] text-[14px] text-[#2A2420] font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 h-11 rounded-xl bg-[#d70015] text-[14px] text-white font-medium disabled:opacity-50"
              >
                {withdrawing ? "탈퇴 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 멤버 프로필 이미지를 겹쳐서 보여주는 작은 아바타 그룹.
 * profileImageUrl이 없으면 닉네임 첫 글자로 대체.
 * 최대 4명까지만 보여주고, 나머지는 "+N"으로 표시.
 */
function MemberAvatars({ members }) {
  if (members.length === 0) return null;

  const visibleMembers = members.slice(0, 4);
  const extraCount = members.length - visibleMembers.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visibleMembers.map((m) => (
        <div
          key={m.userId}
          className="w-4 h-4 rounded-full bg-[#F6ECDD] border border-[#FDFAF4] flex items-center justify-center overflow-hidden shrink-0"
        >
          {m.profileImageUrl ? (
            <img src={m.profileImageUrl} alt={m.nickname} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[7px] text-[#8B4A26] font-medium">
              {m.nickname?.[0] ?? "?"}
            </span>
          )}
        </div>
      ))}
      {extraCount > 0 && (
        <span className="text-[9px] text-[#8C8274] pl-2">+{extraCount}</span>
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

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="#8C8274" strokeWidth="1.7" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#8C8274" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}