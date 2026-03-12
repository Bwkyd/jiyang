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

  // 扫码枪自动识别：输入停顿超过 200ms 且有内容则自动提交
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setValue(val);

      if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
      if (val.trim()) {
        autoSubmitRef.current = setTimeout(() => {
          handleSubmit(val);
        }, 200);
      }
    },
    [handleSubmit]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
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
        onChange={handleChange}
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
