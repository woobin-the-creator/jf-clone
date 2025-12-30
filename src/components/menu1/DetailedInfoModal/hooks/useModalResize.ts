import { useState, useRef, useCallback } from "react";

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;

// 기본 크기 - 최대화 상태
const getDefaultSize = () => ({
  width: Math.floor(window.innerWidth * 0.95),
  height: Math.floor(window.innerHeight * 0.9),
});

export function useModalResize() {
  const DEFAULT_SIZE = getDefaultSize();
  const [modalSize, setModalSize] = useState(DEFAULT_SIZE);
  const [isResizing, setIsResizing] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<React.CSSProperties["cursor"]>("default");
  const [activeCursor, setActiveCursor] = useState<React.CSSProperties["cursor"]>("default");

  const modalRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(
    null
  );

  // 리사이즈 커서 계산
  const getCursorStyle = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const edge = 10;
    const isLeft = x < edge;
    const isRight = x > rect.width - edge;
    const isTop = y < edge;
    const isBottom = y > rect.height - edge;

    if (isTop && isLeft) return "nw-resize";
    if (isTop && isRight) return "ne-resize";
    if (isBottom && isLeft) return "sw-resize";
    if (isBottom && isRight) return "se-resize";
    if (isTop) return "n-resize";
    if (isBottom) return "s-resize";
    if (isLeft) return "w-resize";
    if (isRight) return "e-resize";
    return "default";
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isResizing) return;
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest(".modal-header") || target.closest(".sidebar")) {
        setCursorStyle("default");
        return;
      }
      setCursorStyle(getCursorStyle(e));
    },
    [isResizing, getCursorStyle]
  );

  const toHandle = (cursor: string): ResizeHandle => {
    switch (cursor) {
      case "n-resize":
        return "n";
      case "s-resize":
        return "s";
      case "e-resize":
        return "e";
      case "w-resize":
        return "w";
      case "ne-resize":
        return "ne";
      case "nw-resize":
        return "nw";
      case "se-resize":
        return "se";
      case "sw-resize":
        return "sw";
      default:
        return null;
    }
  };

  const handleBorderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest(".modal-header") || target.closest(".sidebar"))
        return;

      const cursor = getCursorStyle(e);
      const handle = toHandle(cursor);
      if (!handle) return;

      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setActiveCursor(cursor as React.CSSProperties["cursor"]);

      if (modalRef.current) {
        modalRef.current.style.userSelect = "none";
      }

      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: modalSize.width,
        height: modalSize.height,
      };

      const handleMouseMoveResize = (ev: MouseEvent) => {
        if (!resizeStartRef.current || !handle) return;
        const deltaX = ev.clientX - resizeStartRef.current.x;
        const deltaY = ev.clientY - resizeStartRef.current.y;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;

        if (handle.includes("e")) newWidth = resizeStartRef.current.width + deltaX;
        if (handle.includes("w")) newWidth = resizeStartRef.current.width - deltaX;
        if (handle.includes("s")) newHeight = resizeStartRef.current.height + deltaY;
        if (handle.includes("n")) newHeight = resizeStartRef.current.height - deltaY;

        const minW = 700;
        const minH = 500;
        const maxW = Math.floor(window.innerWidth * 0.95);
        const maxH = Math.floor(window.innerHeight * 0.9);

        newWidth = Math.max(minW, Math.min(newWidth, maxW));
        newHeight = Math.max(minH, Math.min(newHeight, maxH));

        setModalSize({ width: newWidth, height: newHeight });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        setActiveCursor("default");
        resizeStartRef.current = null;

        if (modalRef.current) {
          modalRef.current.style.userSelect = "text";
        }

        document.removeEventListener("mousemove", handleMouseMoveResize);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMoveResize);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [modalSize, getCursorStyle]
  );

  const handleMouseLeave = useCallback(() => {
    setCursorStyle("default");
  }, []);

  const resetSize = useCallback(() => {
    setModalSize(getDefaultSize());
  }, []);

  return {
    modalRef,
    modalSize,
    isResizing,
    cursorStyle: isResizing ? activeCursor : cursorStyle,
    handleMouseMove,
    handleBorderMouseDown,
    handleMouseLeave,
    resetSize,
  };
}
