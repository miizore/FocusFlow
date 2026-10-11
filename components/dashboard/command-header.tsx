"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  temperature: number;
  weatherCode: number;
  condition: string;
};

function decodeWeatherCode(code: number): string {
  if (code === 0) return "晴朗 CLEAR";
  if ([1, 2, 3].includes(code)) return "多云 CLOUDY";
  if ([45, 48].includes(code)) return "薄雾 FOG";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "阵雨 RAIN";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "降雪 SNOW";
  if ([95, 96, 99].includes(code)) return "雷雨 STORM";
  return "微风 BREEZE";
}

export function CommandHeader() {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          weekday: "long",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=22.31&longitude=114.17&current=temperature_2m,weather_code"
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.current) return;
        const temp = Math.round(data.current.temperature_2m);
        const code = Number(data.current.weather_code ?? 0);
        setWeather({
          temperature: temp,
          weatherCode: code,
          condition: decodeWeatherCode(code),
        });
      } catch (e) {
        if (!cancelled) {
          setWeather({
            temperature: 24,
            weatherCode: 0,
            condition: "晴朗 CLEAR",
          });
        }
      }
    }
    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-5">
      {/* Left: Dynamic Clock & Date */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="size-2 bg-[#002FA7]" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            SYSTEM CLOCK // ASIA-PACIFIC (UTC+8)
          </span>
        </div>
        <div className="font-mono text-5xl md:text-6xl font-bold tracking-tight text-white tabular-nums">
          {timeStr || "00:00:00"}
        </div>
        <div className="font-mono text-xs text-zinc-400 mt-1 uppercase tracking-wider">
          {dateStr}
        </div>
      </div>

      {/* Right: Weather Minimal Text Display */}
      <div className="border border-zinc-800 bg-black p-3 shrink-0 flex flex-col justify-between min-w-[220px]">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider border-b border-zinc-900 pb-1.5 mb-2">
          <span>ATMOSPHERE METRICS</span>
          <span className="text-zinc-600">22.31°N 114.17°E</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono text-2xl font-bold text-white tabular-nums">
            {weather ? `${weather.temperature}°C` : "--°C"}
          </div>
          <div className="font-mono text-xs text-blue-400 uppercase tracking-wide">
            {weather ? weather.condition : "CONNECTING..."}
          </div>
        </div>
        <div className="mt-2 text-[10px] font-mono text-zinc-600">
          LOCATION // HONG KONG (REGIONAL NODE)
        </div>
      </div>
    </div>
  );
}
