import { useState, useEffect, useRef } from "react";
import {
  fetchGroupInfo,
  retryMerge,
  MERGE_NOT_STARTED,
  MERGE_PROCESSING,
  MERGE_DONE,
  MERGE_FAILED,
} from "../api/groups";
import SectionTitle from "./SectionTitle";

// 병합 중일 때 서버에 상태를 다시 물어보는 간격 (5초)
const POLL_INTERVAL_MS = 5000;

// 폴링을 포기하는 횟수. 5초 x 120 = 약 10분.
// 이게 없으면, 서버가 어떤 이유로 병합을 영영 시작하지 않는 그룹(예: 클립이
// 하나도 없는 지난 여행)의 화면을 열어둔 동안 5초마다 영원히 서버를 두드린다.
const MAX_POLL_COUNT = 120;

// "다시 만들기"를 누른 뒤, 서버가 아직 FAILED를 들고 있어도 무시하는 시간.
// retry는 202(접수)만 주고 실제 상태 변경은 백그라운드에서 일어나므로,
// 바로 다음 폴링이 아직 FAILED를 돌려줘서 화면이 실패로 되돌아갈 수 있다.
const RETRY_GRACE_MS = 20000;

/**
 * 공유용 병합 영상 섹션.
 *
 * 서버가 여행 종료 후 멤버들의 클립을 자동으로 하나의 영상으로 합쳐주고,
 * 그 진행 상태를 그룹 상세의 mergeStatus로 알려줌:
 *
 *   NOT_STARTED → PROCESSING → DONE (mergedVideoUrl에 영상 주소가 채워짐)
 *                           ↘ FAILED (retryMerge로 다시 시도)
 *
 * props:
 *   groupId          - 그룹 id (폴링/재시도용)
 *   groupName        - 저장 파일명, 공유 제목에 사용
 *   isTripEnded      - 여행이 끝났는지 (끝나기 전엔 잠금 화면)
 *   initialStatus    - GroupDetail이 이미 받아온 mergeStatus (첫 렌더용)
 *   initialVideoUrl  - GroupDetail이 이미 받아온 mergedVideoUrl (첫 렌더용)
 *   onAuthExpired    - 토큰이 완전히 만료됐을 때 호출 (로그인 화면으로 보내기)
 */
export default function MergedVideoSection({
  groupId,
  groupName,
  isTripEnded,
  initialStatus,
  initialVideoUrl,
  onAuthExpired,
}) {
  // 상태를 GroupDetail에서 "받아오지" 않고 여기서 따로 들고 있는 이유:
  // 병합 중에는 5초마다 이 섹션의 상태만 바뀌는데, 그때마다 GroupDetail 전체가
  // 다시 그려지면 셋로그 그리드/편지 목록까지 불필요하게 깜빡이기 때문.
  const [status, setStatus] = useState(initialStatus ?? MERGE_NOT_STARTED);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? "");

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState(""); // 저장/공유 결과 안내
  const [showManualLink, setShowManualLink] = useState(false); // 자동 저장 실패 시 직접 열 링크
  const [videoError, setVideoError] = useState(false); // <video> 로드 실패
  const [videoReloadKey, setVideoReloadKey] = useState(0); // 영상 강제 다시 불러오기용
  const [pollGaveUp, setPollGaveUp] = useState(false); // 너무 오래 기다려 폴링 중단됨
  const [refreshing, setRefreshing] = useState(false); // 수동 새로고침 중

  // 콜백을 ref에 담아두는 이유: useEffect의 의존성에 콜백을 직접 넣으면
  // 부모가 다시 그려질 때마다 새 함수가 만들어져 폴링 타이머가 계속 리셋됨.
  const onAuthExpiredRef = useRef(onAuthExpired);
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired;
  }, [onAuthExpired]);

  const pollCountRef = useRef(0); // 지금까지 폴링한 횟수
  const ignoreFailedUntilRef = useRef(0); // 이 시각 전까지는 FAILED를 무시
  const cachedFileRef = useRef(null); // 한 번 받아둔 영상 파일 (공유에 재사용)

  // ----------------------------------------------------------
  // 서버에서 최신 상태 한 번 가져오기 (폴링과 수동 새로고침이 공용)
  // ----------------------------------------------------------
  async function loadStatusOnce() {
    const info = await fetchGroupInfo(groupId);
    const next = info.mergeStatus ?? MERGE_NOT_STARTED;

    // 다시 만들기 직후의 유예 시간 동안은 FAILED를 무시한다.
    // (서버가 재병합을 아직 시작하지 않아 옛 상태를 돌려주는 경우)
    if (next === MERGE_FAILED && Date.now() < ignoreFailedUntilRef.current) {
      return;
    }

    setStatus(next);
    setVideoUrl(info.mergedVideoUrl ?? "");
  }

  // ----------------------------------------------------------
  // 폴링: 여행이 끝났고, 아직 결과가 안 나온 상태일 때만 5초마다 조회
  //
  // NOT_STARTED도 폴링 대상인 이유: 여행이 막 끝난 직후엔 서버가 아직
  // 병합을 시작하지 않았을 수 있어서, 화면을 켜둔 채 기다리면 자동으로
  // PROCESSING → DONE으로 넘어가는 걸 보여주려는 것.
  // DONE / FAILED / 알 수 없는 값은 더 이상 안 바뀌므로 폴링하지 않는다.
  // ----------------------------------------------------------
  const isWaiting =
    isTripEnded && (status === MERGE_NOT_STARTED || status === MERGE_PROCESSING);
  const shouldPoll = isWaiting && !pollGaveUp;

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false; // 화면을 떠난 뒤 도착한 응답으로 setState 하지 않도록

    const runPoll = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLL_COUNT) {
        if (!cancelled) setPollGaveUp(true); // 타이머는 cleanup에서 정리됨
        return;
      }

      try {
        await loadStatusOnce();
      } catch (err) {
        if (cancelled) return;
        if (err.message === "AUTH_EXPIRED") {
          onAuthExpiredRef.current?.();
        }
        // 그 외 일시적인 네트워크 오류는 무시하고 다음 주기에 다시 시도
      }
    };

    const timer = setInterval(() => {
      // 다른 탭을 보고 있거나 화면이 꺼져 있으면 건너뛴다.
      // (보이지도 않는 화면 때문에 데이터와 배터리를 쓰지 않도록)
      if (document.hidden) return;
      runPoll();
    }, POLL_INTERVAL_MS);

    // 다른 앱을 보다가 돌아왔을 때 다음 주기(최대 5초)를 기다리지 않고 바로 확인
    const handleVisibilityChange = () => {
      if (!document.hidden) runPoll();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // cleanup: 상태가 바뀌어 shouldPoll이 false가 되거나, 화면을 떠날 때 정리
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // loadStatusOnce는 매 렌더마다 새로 만들어지지만, 의존성에 넣으면 타이머가
    // 계속 리셋되므로 일부러 제외함 (안에서 쓰는 값은 항상 최신 state를 읽음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll, groupId]);

  // ----------------------------------------------------------
  // 수동 새로고침 (오래 기다려 폴링이 멈췄거나, 알 수 없는 상태일 때)
  // ----------------------------------------------------------
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadStatusOnce();
      pollCountRef.current = 0;
      setPollGaveUp(false); // 다시 자동 확인 시작
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpiredRef.current?.();
    } finally {
      setRefreshing(false);
    }
  }

  // ----------------------------------------------------------
  // 다시 만들기 (FAILED일 때만 버튼이 보임)
  // ----------------------------------------------------------
  async function handleRetry() {
    setRetrying(true);
    setRetryError("");
    try {
      await retryMerge(groupId);

      // 접수(202)되면 서버가 곧 PROCESSING으로 바꿈. 화면을 먼저 "제작 중"으로
      // 바꾸고, 잠시 동안은 폴링이 FAILED를 돌려줘도 무시한다.
      ignoreFailedUntilRef.current = Date.now() + RETRY_GRACE_MS;
      pollCountRef.current = 0;
      setPollGaveUp(false);
      setStatus(MERGE_PROCESSING);
      setVideoUrl("");
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        onAuthExpiredRef.current?.();
        return;
      }
      setRetryError(err.message || "영상 다시 만들기에 실패했어요");
    } finally {
      setRetrying(false);
    }
  }

  // ----------------------------------------------------------
  // 저장하기
  //
  // fetch로 영상을 받아서 blob: 주소로 만든 뒤 <a download>로 저장한다.
  // 그냥 <a href={영상주소} download>를 쓰지 않는 이유: download 속성은
  // "다른 도메인" 주소(S3 등)에는 브라우저가 무시하고 그냥 페이지 이동을 함.
  //
  // 영상 서버가 CORS를 허용하지 않으면 fetch가 막히는데, 이때 window.open으로
  // 새 탭을 여는 건 소용없다 — await 뒤라서 "사용자가 방금 누름" 권한이
  // 이미 사라졌고 팝업 차단에 걸린다. 그래서 화면에 진짜 링크(<a>)를
  // 띄워서 사용자가 직접 누르게 한다.
  // ----------------------------------------------------------
  async function handleSave() {
    if (!videoUrl || saving) return;
    setSaving(true);
    setActionMessage("");
    setShowManualLink(false);

    try {
      // 이미 받아둔 파일이 있으면 재사용 (공유하기가 미리 받아뒀을 수 있음)
      const file = cachedFileRef.current ?? (await downloadAsFile(videoUrl, groupName));
      cachedFileRef.current = file;

      const blobUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 다운로드가 시작될 시간을 준 뒤 메모리 해제
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      setActionMessage("저장을 시작했어요. 다운로드 폴더를 확인해보세요");
    } catch {
      setShowManualLink(true);
      setActionMessage("자동 저장이 막혔어요. 아래 링크로 영상을 열어 저장해주세요");
    } finally {
      setSaving(false);
    }
  }

  // ----------------------------------------------------------
  // 공유하기 (모바일 공유 시트)
  //
  // ⚠️ 이 함수는 절대 await을 거치고 나서 navigator.share를 부르면 안 된다.
  // navigator.share는 "사용자가 방금 버튼을 눌렀다"는 권한이 있어야 동작하는데,
  // 그 권한은 잠깐만 유지된다. 영상을 fetch로 받는 동안(몇 초~수십 초)
  // 권한이 사라져서, 특히 iOS 사파리에서는 공유 시트가 아예 안 뜬다.
  // (사파리는 await 한 번만 해도 권한을 잃는다)
  //
  // 그래서:
  //   - 미리 받아둔 파일이 있으면 → 파일 공유 (사진첩 저장 가능)
  //   - 없으면 → 영상 "링크"를 즉시 공유하고, 파일은 뒤에서 미리 받아둔다
  //     (그래서 다음번에 누르면 파일로 공유됨)
  // 두 경우 모두 await 없이 곧바로 navigator.share를 호출한다.
  // ----------------------------------------------------------
  function handleShare() {
    if (!videoUrl) return;
    setActionMessage("");
    setShowManualLink(false);

    const title = `${groupName ?? "경산로그"} 여행 영상`;

    // 공유 기능 자체가 없는 환경(주로 데스크톱) → 링크 복사
    // clipboard도 같은 "방금 눌렀음" 권한이 필요하므로 여기서 바로 호출한다.
    if (!navigator.share) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(videoUrl)
          .then(() => setActionMessage("영상 링크를 복사했어요"))
          .catch(() => setActionMessage("링크 복사에 실패했어요. 저장하기를 이용해주세요"));
      } else {
        setActionMessage("이 브라우저에서는 공유가 어려워요. 저장하기를 이용해주세요");
      }
      return;
    }

    const cached = cachedFileRef.current;

    // 1) 파일이 준비돼 있으면 파일 공유 (await 없이 즉시)
    if (cached && navigator.canShare?.({ files: [cached] })) {
      navigator.share({ files: [cached], title }).catch(handleShareError);
      return;
    }

    // 2) 아직 없으면 링크 공유를 즉시 하고, 파일은 백그라운드로 받아둔다
    navigator.share({ title, url: videoUrl }).catch(handleShareError);
    prefetchFile();
  }

  function handleShareError(err) {
    if (err?.name === "AbortError") return; // 사용자가 공유 시트를 그냥 닫음
    setActionMessage("공유에 실패했어요. 저장하기를 이용해주세요");
  }

  /**
   * 영상 파일을 미리 받아서 캐시에 넣어둔다 (실패해도 조용히 무시).
   * 다음에 공유하기를 누르면 파일 공유가 되어 사진첩 저장까지 가능해진다.
   */
  function prefetchFile() {
    if (cachedFileRef.current) return;
    downloadAsFile(videoUrl, groupName)
      .then((file) => {
        cachedFileRef.current = file;
      })
      .catch(() => {
        // CORS 등으로 막히면 링크 공유만 계속 쓰면 됨
      });
  }

  // ----------------------------------------------------------
  // 화면
  //
  // 조건을 if/else if로 끝까지 이어서, 어떤 값이 와도 빈 화면이 나오지 않게 함.
  // (예전엔 status가 예상 밖의 값이면 제목만 남고 내용이 통째로 사라졌음)
  // ----------------------------------------------------------
  let body;

  if (!isTripEnded) {
    body = (
      <StateBox icon={<LockIcon />} title="여행이 끝나면 영상이 만들어져요">
        모두의 순간이 하나의 영상으로 합쳐져요
      </StateBox>
    );
  } else if (status === MERGE_DONE) {
    body = (
      <>
        {!videoUrl || videoError ? (
          // 상태는 DONE인데 주소가 비어 있거나 영상을 못 불러오는 경우
          <div className="flex flex-col items-center gap-1.5 py-8 bg-[#F8F3E9] border border-[#EFE4D2] rounded-2xl">
            <span className="w-11 h-11 rounded-full bg-[#F6ECDD] flex items-center justify-center">
              <WarningIcon />
            </span>
            <p className="text-xs text-[#6B6156] mt-1">영상을 불러올 수 없어요</p>
            {videoUrl && (
              <button
                onClick={() => {
                  setVideoError(false);
                  setVideoReloadKey((k) => k + 1); // <video>를 새로 만들어 다시 시도
                }}
                className="mt-2 text-[12px] text-[#8B4A26] font-medium"
              >
                다시 불러오기
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden bg-black gs-rise">
            {/* controls: 재생/일시정지/전체화면 등 기본 컨트롤 표시
                playsInline: iOS에서 영상이 자동으로 전체화면으로 튀지 않게 함
                preload="metadata": 첫 프레임과 길이만 미리 받아 데이터 절약 */}
            <video
              key={videoReloadKey}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
              className="w-full max-h-[420px] bg-black"
            />
          </div>
        )}

        {videoUrl && !videoError && (
          <div className="flex gap-2.5 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-[#8B4A26] text-[14px] text-white font-medium flex items-center justify-center gap-1.5 gs-press disabled:opacity-50"
            >
              <DownloadIcon />
              {saving ? "저장 중..." : "저장하기"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 h-11 rounded-xl bg-[#F6ECDD] border border-[#EBDCC4] text-[14px] text-[#8B4A26] font-medium flex items-center justify-center gap-1.5 gs-press"
            >
              <ShareIcon />
              공유하기
            </button>
          </div>
        )}

        {actionMessage && (
          <p className="text-[11px] text-[#6B6156] mt-2 px-1">{actionMessage}</p>
        )}

        {/* 자동 저장이 막혔을 때: window.open은 팝업 차단에 걸리므로
            사용자가 직접 누를 수 있는 진짜 링크를 보여준다 */}
        {showManualLink && videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1.5 px-1 text-[12px] text-[#8B4A26] font-medium underline"
          >
            새 탭에서 영상 열기
          </a>
        )}
      </>
    );
  } else if (status === MERGE_FAILED) {
    body = (
      <div className="flex flex-col items-center gap-1.5 py-8 px-4 bg-[#FBF1EF] border border-[#F0D9D5] rounded-2xl">
        <span className="w-11 h-11 rounded-full bg-[#F8E3DF] flex items-center justify-center">
          <WarningIcon />
        </span>
        <p className="text-xs text-[#2A2420] mt-1">영상을 만들지 못했어요</p>
        <p className="text-[11px] text-[#8C8274] text-center">
          다시 시도하면 처음부터 다시 만들어요
        </p>
        {retryError && (
          <p className="text-[12px] text-[#d70015] mt-1 text-center">{retryError}</p>
        )}
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="mt-3 h-10 px-5 rounded-xl bg-[#8B4A26] text-[13px] text-white font-medium gs-press disabled:opacity-50"
        >
          {retrying ? "요청 중..." : "다시 만들기"}
        </button>
      </div>
    );
  } else if (pollGaveUp) {
    // 10분 넘게 기다렸는데도 안 끝남 → 자동 확인을 멈추고 수동 새로고침으로 전환
    body = (
      <div className="flex flex-col items-center gap-1.5 py-8 px-4 bg-[#F8F3E9] border border-[#EFE4D2] rounded-2xl">
        <span className="w-11 h-11 rounded-full bg-[#F6ECDD] flex items-center justify-center">
          <WarningIcon />
        </span>
        <p className="text-xs text-[#6B6156] mt-1">생각보다 오래 걸리고 있어요</p>
        <p className="text-[11px] text-[#8C8274] text-center">
          자동 확인을 잠시 멈췄어요. 아래 버튼으로 다시 확인할 수 있어요
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-3 h-10 px-5 rounded-xl bg-[#F6ECDD] border border-[#EBDCC4] text-[13px] text-[#8B4A26] font-medium gs-press disabled:opacity-50"
        >
          {refreshing ? "확인 중..." : "새로고침"}
        </button>
      </div>
    );
  } else if (status === MERGE_PROCESSING) {
    body = (
      <StateBox icon={<Spinner />} title="영상을 만들고 있어요">
        클립이 많으면 몇 분 걸릴 수 있어요. 이 화면을 열어두면 완성 시 자동으로 나타나요
      </StateBox>
    );
  } else if (status === MERGE_NOT_STARTED) {
    body = (
      <StateBox icon={<Spinner />} title="곧 영상 제작이 시작돼요">
        잠시만 기다려주세요
      </StateBox>
    );
  } else {
    // 서버가 나중에 새로운 상태값을 추가해도 화면이 비어버리지 않도록 하는 안전망
    body = (
      <div className="flex flex-col items-center gap-1.5 py-8 px-4 bg-[#F8F3E9] border border-[#EFE4D2] rounded-2xl">
        <span className="w-11 h-11 rounded-full bg-[#F6ECDD] flex items-center justify-center">
          <WarningIcon />
        </span>
        <p className="text-xs text-[#6B6156] mt-1">영상 상태를 확인할 수 없어요</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-3 h-10 px-5 rounded-xl bg-[#F6ECDD] border border-[#EBDCC4] text-[13px] text-[#8B4A26] font-medium gs-press disabled:opacity-50"
        >
          {refreshing ? "확인 중..." : "새로고침"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-7">
      <SectionTitle tone="#8B4A26">공유용 영상</SectionTitle>
      {body}
    </div>
  );
}

/* ------------------------------------------------------------
 * 영상 주소 → File 객체로 내려받기
 * ------------------------------------------------------------
 * fetch로 영상 전체를 받아서 File로 만든다. 저장(<a download>)과
 * 파일 공유(navigator.share)가 둘 다 "실제 파일"을 필요로 해서 공용으로 씀.
 *
 * 영상 서버(S3 등)가 CORS를 허용하지 않으면 여기서 에러가 나고,
 * 호출한 쪽에서 링크 공유 / 직접 열기 링크로 대체함.
 */
async function downloadAsFile(url, groupName) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("영상 다운로드 실패");

  const blob = await res.blob();

  // 확장자: Blob의 실제 타입 → 없으면 URL 확장자 → 그래도 없으면 mp4
  const ext = getVideoExtension(blob.type, url);
  const type = blob.type || (ext === "webm" ? "video/webm" : "video/mp4");

  // 파일명에 쓸 수 없는 문자(/ \ : * ? " < > |)는 제거
  const safeName =
    (groupName ?? "경산로그").replace(/[\\/:*?"<>|]/g, "").trim() || "경산로그";

  return new File([blob], `${safeName}_여행영상.${ext}`, { type });
}

function getVideoExtension(mimeType, url) {
  if (/webm/i.test(mimeType)) return "webm";
  if (/quicktime/i.test(mimeType)) return "mov";
  if (/mp4/i.test(mimeType)) return "mp4";

  // 쿼리스트링(?이후)을 떼고 URL 끝의 확장자를 확인
  const match = url.split("?")[0].match(/\.(mp4|webm|mov)$/i);
  return match ? match[1].toLowerCase() : "mp4";
}

/* ------------------------------------------------------------
 * 공용 상태 박스 (잠금/대기/제작중 화면 공통 모양)
 * ------------------------------------------------------------ */
function StateBox({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-9 px-4 bg-[#F8F3E9] border border-[#EFE4D2] rounded-2xl">
      <span className="w-11 h-11 rounded-full bg-[#F6ECDD] flex items-center justify-center">
        {icon}
      </span>
      <p className="text-xs text-[#6B6156] mt-1">{title}</p>
      <p className="text-[11px] text-[#8C8274] text-center">{children}</p>
    </div>
  );
}

/* --- 아이콘 --- */

// animate-spin은 Tailwind 기본 클래스라 별도 CSS 없이 회전함
function Spinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#EBDCC4" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#8B4A26" strokeWidth="2.5" strokeLinecap="round" />
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

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 4l9 16H3L12 4z" stroke="#B04A46" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="#B04A46" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="#B04A46" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 15V4m0 0L8 8m4-4l4 4M6 13v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}