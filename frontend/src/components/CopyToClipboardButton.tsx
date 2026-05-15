import { useState } from "react";

type CopyToClipboardButtonProps = {
  value: string;
  disabled?: boolean;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyToClipboardButton({
  value,
  disabled = false,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
}: CopyToClipboardButtonProps) {
  const [didCopy, setDidCopy] = useState(false);

  async function handleCopy() {
    if (!value || disabled) {
      return;
    }

    await navigator.clipboard.writeText(value);

    setDidCopy(true);

    window.setTimeout(() => {
      setDidCopy(false);
    }, 1500);
  }

  return (
    <button
      type="button"
      disabled={disabled || !value}
      onClick={handleCopy}
      className={`cursor-pointer rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-slate-400 transition hover:border-emerald-300/40 hover:bg-white/10 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-slate-400 ${className}`}
    >
      {didCopy ? copiedLabel : label}
    </button>
  );
}
