"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  Upload,
  Camera,
  RotateCcw,
  Lock,
  Globe,
  Clock,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";
import { Button, Alert, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  challengeInstructions: string;
  durationSecs?: number;
  onSuccess: (result: { submission_id: string; visibility: string }) => void;
}

export function VideoRecorderModal({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  challengeInstructions,
  durationSecs = 10,
  onSuccess,
}: VideoRecorderModalProps) {
  const [tab, setTab] = useState<"record" | "upload">("record");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  // Camera recording state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  // Restart camera manually on retries
  const restartCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      setStream(newStream);
      setCameraError(null);
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = newStream;
      }
    } catch (err: unknown) {
      console.warn("[VideoRecorder] Camera access denied or unavailable:", err);
      setCameraError("Camera or microphone access was denied or is not available. You can upload a recorded video file instead.");
    }
  }, [stream]);

  useEffect(() => {
    let cancelled = false;
    if (isOpen && tab === "record" && !recordedBlob) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        })
        .then((newStream) => {
          if (cancelled) {
            newStream.getTracks().forEach((t) => t.stop());
            return;
          }
          setStream(newStream);
          setCameraError(null);
          if (videoLiveRef.current) {
            videoLiveRef.current.srcObject = newStream;
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          console.warn("[VideoRecorder] Camera access denied or unavailable:", err);
          setCameraError("Camera or microphone access was denied or is not available. You can upload a recorded video file instead.");
        });
    }
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, tab, recordedBlob, stopCamera]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── Camera Recording Actions ────────────────────────────────────────────────
  const handleStartRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    setRecordingSeconds(0);
    setError(null);

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopCamera();
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= durationSecs + 2) {
            handleStopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error("[VideoRecorder] MediaRecorder error:", err);
      setError("Unable to start video recording on this browser. Try uploading a video file.");
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleResetRecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordingSeconds(0);
    void restartCamera();
  };

  // ── File Upload Action ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, WebM, QuickTime).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Video file size exceeds the 50MB limit.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // ── Submit Video ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const videoToSend = tab === "record" ? recordedBlob : selectedFile;
    if (!videoToSend) {
      setError("Please record or select a video first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("challenge_id", challengeId);
      formData.append("visibility", visibility);
      formData.append("duration_seconds", String(durationSecs));
      formData.append("video", videoToSend, `challenge_${challengeId}.webm`);

      const res = await fetch("/api/challenges/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit challenge video.");
      }

      onSuccess({
        submission_id: data.submission_id,
        visibility: data.visibility || visibility,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-recorder-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B24]/60 animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-[32px] border-2 border-[#EADBC8] shadow-[0_6px_0_#EADBC8] p-6 sm:p-7 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-10 h-10 rounded-full bg-[#FFC23D] border-2 border-[#E9A912] flex items-center justify-center text-[#1E1B24]">
                <Camera className="w-4 h-4" />
              </span>
              <h2 id="video-recorder-title" className="font-display font-bold text-xl text-[#1E1B24]">
                Record Challenge Video
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6E6878]">
              {challengeTitle} ({durationSecs}s)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-11 h-11 rounded-full bg-[#F5EADC] flex items-center justify-center hover:bg-[#EADBC8] text-[#1E1B24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt reminder */}
        <div className="p-4 rounded-[18px] bg-[#FFC23D]/30 border-2 border-[#E9A912] text-sm text-[#1E1B24] mb-4">
          <span className="font-display font-bold text-[#1E1B24] block mb-0.5">Your Task:</span>
          {challengeInstructions}
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Mode Selector Tabs */}
        {!previewUrl && (
          <div className="flex rounded-full bg-[#F5EADC] p-1.5 mb-4 text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setTab("record");
                setError(null);
              }}
              className={cn(
                "flex-1 min-h-[44px] rounded-full flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                tab === "record" ? "bg-white text-[#1E1B24] shadow-[0_2px_0_#EADBC8]" : "text-[#6E6878] hover:text-[#1E1B24]"
              )}
            >
              <Video className="w-3.5 h-3.5" /> Camera
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("upload");
                stopCamera();
                setError(null);
              }}
              className={cn(
                "flex-1 min-h-[44px] rounded-full flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                tab === "upload" ? "bg-white text-[#1E1B24] shadow-[0_2px_0_#EADBC8]" : "text-[#6E6878] hover:text-[#1E1B24]"
              )}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
          </div>
        )}

        {/* ── Viewport Area ── */}
        <div className="relative rounded-[22px] overflow-hidden bg-[#0F0D14] aspect-4/3 flex items-center justify-center border-2 border-[#EADBC8] mb-4">
          {previewUrl ? (
            /* Video Preview Player */
            <video
              ref={videoPreviewRef}
              src={previewUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : tab === "record" ? (
            /* Live Camera View */
            cameraError ? (
              <div className="p-6 text-center text-white">
                <AlertTriangle className="w-8 h-8 text-[#FFC23D] mx-auto mb-2" />
                <p className="text-sm text-white/90 mb-3">{cameraError}</p>
                <Button variant="secondary" size="sm" onClick={() => setTab("upload")}>
                  Switch to Upload
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoLiveRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-xs font-mono font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    {recordingSeconds}s / {durationSecs}s
                  </div>
                )}
              </>
            )
          ) : (
            /* File Upload Input View */
            <div className="p-6 text-center text-white flex flex-col items-center">
              <Upload className="w-10 h-10 text-[#FFC23D] mb-3 animate-bounce" />
              <p className="text-base font-display font-bold mb-1">Choose a video file</p>
              <p className="text-xs text-white/70 mb-4">MP4, WebM, or MOV up to 50MB</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-full bg-[#FF5A3C] text-white text-sm font-bold shadow-[0_4px_0_#C9381F] transition-transform active:translate-y-[2px]">
                  Select Video
                </span>
              </label>
            </div>
          )}
        </div>

        {/* ── Record / Preview Controls ── */}
        <div className="flex items-center justify-between gap-3 mb-5">
          {!previewUrl && tab === "record" && !cameraError && (
            <div className="w-full flex items-center justify-center gap-3">
              {isRecording ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 min-h-[48px] px-7 rounded-full bg-[#FF5A3C] text-white text-sm font-bold shadow-[0_4px_0_#C9381F] active:translate-y-[2px] active:shadow-[0_2px_0_#C9381F] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1B24]"
                >
                  <span className="w-3 h-3 rounded-xs bg-white" /> Stop Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={!stream}
                  className="flex items-center gap-2 min-h-[48px] px-7 rounded-full bg-[#FF5A3C] text-white text-sm font-bold shadow-[0_4px_0_#C9381F] active:translate-y-[2px] active:shadow-[0_2px_0_#C9381F] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1B24]"
                >
                  <span className="w-3 h-3 rounded-full bg-red-400" /> Start Recording
                </button>
              )}
            </div>
          )}

          {previewUrl && (
            <button
              type="button"
              onClick={handleResetRecord}
              className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-[#F5EADC] text-sm font-bold text-[#1E1B24] hover:bg-[#EADBC8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-record / Change
            </button>
          )}
        </div>

        {/* ── Visibility Choice & Story Disclaimer ── */}
        {previewUrl && (
          <div className="border-t-2 border-[#EADBC8] pt-4 mb-5">
            <label className="block font-display text-base font-bold text-[#1E1B24] mb-2">
              Choose Story Visibility:
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "flex flex-col items-start p-4 min-h-[44px] rounded-[18px] border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  visibility === "private"
                    ? "border-[#FF5A3C] bg-[#FFF6EC] shadow-[0_3px_0_#FF5A3C]"
                    : "border-[#EADBC8] bg-white hover:bg-[#FFF6EC]"
                )}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#1E1B24] mb-1">
                  <Lock className="w-3.5 h-3.5 text-[#FF5A3C]" />
                  <span>Private Story</span>
                </div>
                <p className="text-xs text-[#6E6878] leading-snug">
                  Only the match winner (1-time view) and your accepted friends.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex flex-col items-start p-4 min-h-[44px] rounded-[18px] border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  visibility === "public"
                    ? "border-[#FF5A3C] bg-[#FFF6EC] shadow-[0_3px_0_#FF5A3C]"
                    : "border-[#EADBC8] bg-white hover:bg-[#FFF6EC]"
                )}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#1E1B24] mb-1">
                  <Globe className="w-3.5 h-3.5 text-[#FF5A3C]" />
                  <span>Public Story</span>
                </div>
                <p className="text-xs text-[#6E6878] leading-snug">
                  Visible to the EVOAIQU community on your profile and story feed.
                </p>
              </button>
            </div>

            {/* 24-Hour Expiry & Retention Notice */}
            <div className="flex items-start gap-2 p-3 rounded-[18px] bg-[#EEEBFF] border-2 border-[#D7D0FF] text-xs text-[#1E1B24]">
              <Clock className="w-4 h-4 text-[#5B49D6] shrink-0 mt-0.5" />
              <span>
                <strong>24-Hour Story Retention:</strong> Your video will automatically expire and its media will be permanently deleted after 24 hours. You control visibility at all times.
              </span>
            </div>
          </div>
        )}

        {/* ── Submit / Cancel Footer ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting} className="min-h-[44px]">
            Cancel
          </Button>

          {previewUrl && (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={submitting}
              className="min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-white mr-1.5" /> Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Post to Story
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
