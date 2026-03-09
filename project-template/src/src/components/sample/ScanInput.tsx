"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ScanInputProps {
  onScan: (skuCode: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ScanInput({ onScan, disabled, loading }: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 页面加载后自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (skuCode: string) => {
      const trimmed = skuCode.trim();
      if (!trimmed) return;

      // 防抖：100ms 内多次触发只执行一次
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onScan(trimmed);
        setValue("");
        // 重新聚焦
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 100);
    },
    [onScan]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(value);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder="扫码或输入 SKU 编码..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="text-lg h-12 pr-10"
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
