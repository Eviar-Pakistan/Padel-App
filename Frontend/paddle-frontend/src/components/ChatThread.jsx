import { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCheck,
  FaFile,
  FaMicrophone,
  FaPaperclip,
  FaPaperPlane,
  FaPause,
  FaPlay,
  FaStop,
  FaUsers,
} from "react-icons/fa";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isMine(msg, me) {
  if (me.kind === "owner") return String(msg.senderOwnerId) === String(me.id);
  return Number(msg.senderUserId) === Number(me.id);
}

function senderName(msg) {
  if (msg.senderOwner) return msg.senderOwner.organizationName || "Club";
  return msg.senderUser?.fullName || "Member";
}

function VoicePlayer({ src, durationSec }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const url = mediaUrl(src);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex min-w-[160px] items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
      >
        {playing ? <FaPause className="h-3 w-3" /> : <FaPlay className="h-3 w-3" />}
      </button>
      <div className="h-1 flex-1 rounded-full bg-white/25">
        <div className="h-1 w-1/3 rounded-full bg-white/80" />
      </div>
      <span className="text-[10px] text-white/70">
        {durationSec ? `${durationSec}"` : "voice"}
      </span>
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

function Bubble({ msg, mine }) {
  const url = mediaUrl(msg.mediaUrl);
  return (
    <div className={`mb-1.5 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-2.5 py-1.5 shadow ${
          mine
            ? "rounded-br-none bg-[#005c4b] text-white"
            : "rounded-bl-none bg-[#1f2c34] text-white"
        }`}
      >
        {!mine && (
          <p className="mb-0.5 text-[11px] font-semibold text-[#53bdeb]">
            {senderName(msg)}
          </p>
        )}
        {msg.type === "IMAGE" && url && (
          <img
            src={url}
            alt=""
            className="mb-1 max-h-56 w-full rounded-md object-cover"
          />
        )}
        {msg.type === "VIDEO" && url && (
          <video
            src={url}
            controls
            className="mb-1 max-h-56 w-full rounded-md bg-black"
          />
        )}
        {msg.type === "AUDIO" && url && (
          <div className="mb-1">
            <VoicePlayer src={msg.mediaUrl} durationSec={msg.durationSec} />
          </div>
        )}
        {msg.type === "FILE" && url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mb-1 flex items-center gap-2 rounded-md bg-black/20 px-2 py-2 text-sm"
          >
            <FaFile className="h-4 w-4 shrink-0" />
            <span className="truncate">{msg.fileName || "File"}</span>
          </a>
        )}
        {msg.text && (
          <p className="whitespace-pre-wrap text-[13.5px] leading-snug">{msg.text}</p>
        )}
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-white/55">
          {formatTime(msg.createdAt)}
          {mine && <FaCheck className="h-2.5 w-2.5" />}
        </p>
      </div>
    </div>
  );
}

export default function ChatThread({
  group,
  messages,
  me,
  onBack,
  onSend,
  sending,
  headerRight,
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submitText = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setText("");
    await onSend({ type: "TEXT", text: value });
  };

  const pickFile = (accept, type) => {
    setAttachOpen(false);
    const input = fileRef.current;
    if (!input) return;
    input.accept = accept;
    input.dataset.msgType = type;
    input.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const type = e.target.dataset.msgType || "FILE";
    await onSend({ type, file });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        );
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        await onSend({ type: "AUDIO", file, durationSec });
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const stopRecording = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b141a]">
      <header className="flex shrink-0 items-center gap-3 bg-[#1f2c34] px-3 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#2a3942]">
          {group.image ? (
            <img
              src={mediaUrl(group.image)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">
              <FaUsers className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{group.name}</p>
          <p className="truncate text-[11px] text-white/50">
            {group._count?.members != null
              ? `${group._count.members} members`
              : group.paddleOwner?.organizationName || "Group"}
          </p>
        </div>
        {headerRight}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/35">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} mine={isMine(msg, me)} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {attachOpen && (
        <div className="mx-3 mb-2 grid grid-cols-4 gap-2 rounded-2xl bg-[#1f2c34] p-3">
          <button
            type="button"
            onClick={() => pickFile("image/*", "IMAGE")}
            className="rounded-xl bg-pink-500/20 py-3 text-center text-[11px] font-medium text-pink-200"
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => pickFile("video/*", "VIDEO")}
            className="rounded-xl bg-orange-500/20 py-3 text-center text-[11px] font-medium text-orange-200"
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => pickFile(".pdf,.doc,.docx,.txt,.zip", "FILE")}
            className="rounded-xl bg-violet-500/20 py-3 text-center text-[11px] font-medium text-violet-200"
          >
            Document
          </button>
          <button
            type="button"
            onClick={() => setAttachOpen(false)}
            className="rounded-xl bg-white/10 py-3 text-center text-[11px] font-medium text-white/60"
          >
            Close
          </button>
        </div>
      )}

      <div className="flex shrink-0 items-end gap-2 bg-[#1f2c34] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setAttachOpen((v) => !v)}
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
        >
          <FaPaperclip className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
        <div className="min-w-0 flex-1 rounded-3xl bg-[#2a3942] px-3 py-2">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitText();
              }
            }}
            placeholder="Message"
            className="max-h-28 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </div>
        {text.trim() ? (
          <button
            type="button"
            disabled={sending}
            onClick={submitText}
            className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-50"
          >
            <FaPaperPlane className="h-3.5 w-3.5" />
          </button>
        ) : recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white"
          >
            <FaStop className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white"
          >
            <FaMicrophone className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
