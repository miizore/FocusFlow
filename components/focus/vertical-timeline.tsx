"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { FocusTimelineItem } from "@/app/actions/focus";
import { formatDuration } from "@/lib/focus-rules";
import { cn } from "@/lib/utils";

function formatDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function VerticalTimeline({
  timeline,
}: {
  timeline: FocusTimelineItem[];
}) {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDayKey(new Date())
  );
  const [currentLineTop, setCurrentLineTop] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const todayKey = formatDayKey(new Date());
  const isToday = selectedDate === todayKey;

  // Update current time indicator line top position (0 to 1440)
  useEffect(() => {
    if (!isToday) {
      setCurrentLineTop(null);
      return;
    }

    const updateIndicator = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      setCurrentLineTop(Math.min(1440, Math.max(0, minutes)));
    };

    updateIndicator();
    const interval = setInterval(updateIndicator, 1000);
    return () => clearInterval(interval);
  }, [isToday]);

  // Auto-scroll near current time indicator on initial load if today
  useEffect(() => {
    if (isToday && scrollContainerRef.current) {
      const now = new Date();
      const currentPx = now.getHours() * 60 + now.getMinutes();
      scrollContainerRef.current.scrollTop = Math.max(0, currentPx - 180);
    }
  }, [isToday, selectedDate]);

  // Filter sessions strictly matching selected date
  const filteredSessions = useMemo(() => {
    return timeline
      .map((item) => {
        const start = new Date(item.startedAt);
        const end = new Date(item.endedAt);
        const startDay = formatDayKey(start);
        return {
          ...item,
          start,
          end,
          startDay,
        };
      })
      .filter((item) => item.startDay === selectedDate);
  }, [timeline, selectedDate]);

  // Date navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDayKey(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDayKey(d));
  };

  const handleToday = () => {
    setSelectedDate(todayKey);
  };

  const totalMinutesThisDay = useMemo(() => {
    return Math.round(
      filteredSessions.reduce((acc, s) => acc + s.duration, 0) / 60
    );
  }, [filteredSessions]);

  return (
    <section className="flex w-96 shrink-0 flex-col border-l border-zinc-800 bg-black">
      {/* Top Header: Date Picker & Navigation */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-3 bg-zinc-950">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer"
            title="前一天"
          >
            <ChevronLeft className="size-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="h-7 border border-zinc-800 bg-black px-1.5 font-mono text-xs text-white outline-none cursor-pointer"
          />
          <button
            type="button"
            onClick={handleNextDay}
            className="p-1 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer"
            title="后一天"
          >
            <ChevronRight className="size-4" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={handleToday}
              className="px-1.5 py-0.5 font-mono text-[10px] text-blue-400 border border-blue-900/40 bg-[#002FA7]/10 hover:bg-[#002FA7]/20 transition-colors cursor-pointer"
            >
              TODAY
            </button>
          )}
        </div>

        <div className="font-mono text-xs text-zinc-400 tabular-nums">
          <span className="text-white font-bold">{totalMinutesThisDay}</span>
          <span className="text-[10px] text-zinc-500"> MINS</span>
        </div>
      </div>

      {/* Subheader: Session counts & Mode */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-1.5 bg-black text-[10px] font-mono text-zinc-500">
        <span>24H VERTICAL TIMELINE</span>
        <span>{filteredSessions.length} SESSIONS LOGGED</span>
      </div>

      {/* 24-Hour Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative bg-black select-none"
      >
        {/* 1440px Container: 24h * 60px/h = 1440px */}
        <div className="relative w-full h-[1440px]">
          {/* Background Hour Grid (00:00 to 23:00) */}
          {Array.from({ length: 24 }, (_, hour) => {
            const topPx = hour * 60;
            const padHour = String(hour).padStart(2, "0");
            return (
              <div
                key={hour}
                style={{ top: `${topPx}px` }}
                className="absolute left-0 right-0 h-[60px] border-t border-zinc-900 flex pointer-events-none"
              >
                {/* Left Ruler Label */}
                <div className="w-14 shrink-0 pl-2 pt-0.5 font-mono text-[10px] text-zinc-600">
                  {padHour}:00
                </div>
                {/* Horizontal Guide Line */}
                <div className="flex-1 border-b border-zinc-900/30" />
              </div>
            );
          })}

          {/* Absolute Focus Session Blocks */}
          {filteredSessions.map((session) => {
            const startHour = session.start.getHours();
            const startMinute = session.start.getMinutes();
            const topPx = startHour * 60 + startMinute;
            const durationInMinutes = Math.max(3, session.duration / 60);

            return (
              <div
                key={session.id}
                style={{
                  top: `${topPx}px`,
                  height: `${durationInMinutes}px`,
                }}
                className={cn(
                  "absolute left-14 right-3 z-10 border border-blue-600/80 bg-[#002FA7]/80 text-white p-1 overflow-hidden transition-all group hover:z-20 hover:border-white shadow-none"
                )}
                title={`${session.taskTitle} (${session.projectName})\n${session.start.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} ~ ${session.end.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} (${formatDuration(session.duration)})`}
              >
                <div className="flex items-center justify-between gap-1 leading-none">
                  <span className="font-mono text-[11px] font-semibold truncate">
                    {session.taskTitle}
                  </span>
                  <span className="font-mono text-[10px] text-blue-200 tabular-nums shrink-0">
                    {formatDuration(session.duration)}
                  </span>
                </div>
                {durationInMinutes >= 24 && (
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-300 mt-0.5 truncate">
                    <span className="truncate">{session.projectName}</span>
                    <span className="text-blue-200 shrink-0">
                      {session.start.toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Current Time Indicator Line (If selected date is today) */}
          {currentLineTop !== null && (
            <div
              style={{ top: `${currentLineTop}px` }}
              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
            >
              <div className="bg-[#BC0C0C] text-white font-mono text-[9px] px-1 py-0.2 shrink-0 leading-none">
                NOW
              </div>
              <div className="flex-1 h-[1px] bg-[#BC0C0C]" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
