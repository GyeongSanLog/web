// ============================================================
// 영상에 자막/시간대를 합성(burn-in)하는 유틸
//
// 동작 방식 (Canvas + MediaRecorder 재녹화):
// 1. 원본 영상을 <video>로 재생
// 2. 매 프레임을 <canvas>에 그리고, 그 위에 시간/자막 텍스트를 얹음
// 3. canvas.captureStream()으로 새 영상 스트림을 만들고
//    원본 오디오 트랙을 합쳐서 MediaRecorder로 다시 녹화
// 4. 재생이 끝나면 합성된 Blob을 반환
//
// 별도 라이브러리(ffmpeg.wasm 등) 없이 브라우저 표준 API만 사용.
// 2초짜리 짧은 클립이라 처리 시간도 영상 길이만큼(약 2초)만 걸림.
//
// 브라우저가 captureStream/MediaRecorder를 지원하지 않으면
// 원본 영상을 그대로 반환한다(합성 없이 업로드는 되도록).
// ============================================================

/**
 * 캔버스 폭에 맞춰 텍스트를 여러 줄로 나눔.
 * (자막이 길면 한 줄에 다 안 들어가므로)
 */
function wrapText(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let current = "";

  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * 캔버스 중앙에 시간대와 자막을 그림.
 * 어떤 배경에서도 읽히도록 검은 외곽선 + 그림자를 함께 적용.
 */
function drawOverlay(ctx, width, height, { timeLabel, caption }) {
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = Math.round(width * 0.012);
  ctx.shadowOffsetY = Math.round(width * 0.004);

  // --- 시간대 (자막 위에, 조금 작게) ---
  const timeSize = Math.round(width * 0.075);
  ctx.font = `600 ${timeSize}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;

  // 자막이 있으면 시간을 위로 올려서 자리를 비워줌
  const maxTextWidth = width * 0.82;
  let captionLines = [];
  let captionSize = 0;
  let lineHeight = 0;

  if (caption) {
    captionSize = Math.round(width * 0.062);
    lineHeight = Math.round(captionSize * 1.35);
    ctx.font = `500 ${captionSize}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    captionLines = wrapText(ctx, caption, maxTextWidth);
  }

  const captionBlockHeight = captionLines.length * lineHeight;
  const gap = caption ? Math.round(width * 0.03) : 0;
  const totalHeight = timeSize + gap + captionBlockHeight;
  let cursorY = centerY - totalHeight / 2 + timeSize / 2;

  // 시간대 그리기
  ctx.font = `600 ${timeSize}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  ctx.lineWidth = Math.max(2, Math.round(timeSize * 0.09));
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText(timeLabel, centerX, cursorY);
  ctx.fillText(timeLabel, centerX, cursorY);

  // 자막 그리기
  if (captionLines.length) {
    cursorY += timeSize / 2 + gap + lineHeight / 2;
    ctx.font = `500 ${captionSize}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    ctx.lineWidth = Math.max(2, Math.round(captionSize * 0.09));

    captionLines.forEach((line, i) => {
      const y = cursorY + i * lineHeight;
      ctx.strokeText(line, centerX, y);
      ctx.fillText(line, centerX, y);
    });
  }

  ctx.restore();
}

/**
 * 녹화에 쓸 mimeType을 브라우저 지원 여부에 따라 고름.
 * (사파리는 webm을 못 만드는 경우가 있어 mp4로 폴백)
 */
function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

/**
 * capturedAt(ISO 문자열)을 "14:32" 형태로 변환
 */
/**
 * capturedAt(ISO 문자열)을 "14:32" 형태로 변환.
 *
 * 주의: new Date(capturedAt).getHours()를 쓰지 않음. capturedAt은
 * "한국시간 값에 Z만 붙인" 편법 형식(Camera.jsx의 toLocalIsoString 참고)
 * 이라, Date로 파싱하면 그 Z를 진짜 UTC로 오인해서 브라우저 로컬
 * 타임존 기준으로 다시 변환해버려 시:분이 어긋남(9시간 밀림).
 * 그래서 문자열에서 시:분 부분을 직접 텍스트로 추출함 — 이렇게 하면
 * 서버에 보낸 값과 화면에 보여주는 값이 항상 정확히 일치함.
 */
export function formatTimeLabel(capturedAt) {
  if (!capturedAt) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  // "2026-09-05T22:15:00.000Z" 형태에서 "T" 다음의 시:분만 뽑음
  const match = capturedAt.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  // 혹시 형식이 다르면 최후의 수단으로 Date 파싱 (기존 방식)
  const d = new Date(capturedAt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 영상에 시간대/자막을 합성한 새 Blob을 반환.
 *
 * @param {Blob} videoBlob - 원본 영상
 * @param {object} options
 * @param {string} options.caption - 정중앙에 넣을 자막 (없으면 시간만)
 * @param {string} options.capturedAt - 촬영 시각 (ISO 문자열)
 * @returns {Promise<Blob>} 합성된 영상. 실패하거나 미지원이면 원본을 그대로 반환.
 */
export async function burnOverlayIntoVideo(videoBlob, { caption = "", capturedAt } = {}) {
  if (!videoBlob) return videoBlob;

  const timeLabel = formatTimeLabel(capturedAt);
  const objectUrl = URL.createObjectURL(videoBlob);
  console.log("[burnOverlay] 시작", { blobSize: videoBlob.size, blobType: videoBlob.type });

  try {
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true; // 오디오 트랙이 없어도 재생 중 실수로 소리가 새지 않도록 안전장치
    video.playsInline = true;

    // 메타데이터(가로/세로 크기, 길이)가 준비될 때까지 대기
    console.log("[burnOverlay] 메타데이터 대기 시작");
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("영상을 읽을 수 없습니다"));
    });
    console.log("[burnOverlay] 메타데이터 로드됨", {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
    });

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      console.warn("[burnOverlay] videoWidth/Height가 0 - 원본 반환");
      return videoBlob;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 브라우저가 합성에 필요한 API를 지원하지 않으면 원본 그대로 사용
    if (
      typeof canvas.captureStream !== "function" ||
      typeof MediaRecorder === "undefined"
    ) {
      console.warn("이 브라우저는 영상 합성을 지원하지 않아 원본을 업로드합니다");
      return videoBlob;
    }

    const canvasStream = canvas.captureStream(30);
    console.log("[burnOverlay] canvasStream 생성됨 (영상만, 무음)");

    // 셋로그 클립은 소리가 필요 없어서, 오디오 트랙은 아예 합성하지 않음.
    // (애초에 Camera.jsx에서 audio: false로 녹화하기 때문에 원본에도
    // 오디오 트랙이 없지만, 혹시 남아있더라도 여기서 의도적으로 제외함)

    const mimeType = pickMimeType();
    console.log("[burnOverlay] 선택된 mimeType:", mimeType || "(기본값)");
    const recorder = new MediaRecorder(
      canvasStream,
      mimeType ? { mimeType } : undefined
    );
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingDone = new Promise((resolve) => {
      recorder.onstop = () => {
        console.log("[burnOverlay] recorder onstop, chunk 개수:", chunks.length);
        resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
      };
    });

    recorder.start();
    console.log("[burnOverlay] recorder.start() 호출됨, state:", recorder.state);

    // 프레임마다 원본 영상 + 오버레이를 캔버스에 그림
    let rafId = null;
    let frameCount = 0;
    const renderFrame = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, width, height);
      drawOverlay(ctx, width, height, { timeLabel, caption: caption.trim() });
      frameCount += 1;
      rafId = requestAnimationFrame(renderFrame);
    };

    console.log("[burnOverlay] video.play() 호출 직전");
    await video.play();
    console.log("[burnOverlay] video.play() 완료, paused:", video.paused);
    renderFrame();

    // 영상이 끝나면 녹화 종료 (혹시 onended가 안 불릴 경우를 대비해 타임아웃도 같이 검)
    console.log("[burnOverlay] onended 대기 시작");
    await Promise.race([
      new Promise((resolve) => {
        video.onended = () => {
          console.log("[burnOverlay] video onended 발생");
          resolve();
        };
      }),
      new Promise((resolve) => {
        // 영상 길이 + 여유 1초, duration을 못 읽는 경우를 대비해 최대 5초 상한
        const timeoutMs = Number.isFinite(video.duration)
          ? video.duration * 1000 + 1000
          : 5000;
        setTimeout(() => {
          console.warn("[burnOverlay] onended 타임아웃 - 강제로 다음 단계 진행", { timeoutMs });
          resolve();
        }, timeoutMs);
      }),
    ]);

    if (rafId) cancelAnimationFrame(rafId);
    console.log("[burnOverlay] 렌더링된 프레임 수:", frameCount);

    // 마지막 프레임이 확실히 담기도록 한 프레임 더 그린 뒤 정지
    ctx.drawImage(video, 0, 0, width, height);
    drawOverlay(ctx, width, height, { timeLabel, caption: caption.trim() });

    console.log("[burnOverlay] recorder.stop() 호출, state:", recorder.state);
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    const result = await recordingDone;
    console.log("[burnOverlay] 합성 완료", { size: result.size, type: result.type });

    // 합성 결과가 비정상이면(0바이트 등) 원본을 사용
    return result && result.size > 0 ? result : videoBlob;
  } catch (err) {
    console.error("자막 합성 실패, 원본 영상을 업로드합니다:", err);
    return videoBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}