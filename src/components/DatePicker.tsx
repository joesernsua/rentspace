import { useMemo, useState } from "react";

type DatePickerProps = {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
};

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return "dd/mm/yyyy";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function DatePicker({ label, value, min, onChange }: DatePickerProps) {
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [visibleMonth]);

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date));
    setOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    if (!min || toIsoDate(today) >= min) selectDate(today);
  };

  return (
    <div className="relative border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors dark:border-white/10 dark:text-slate-400 md:border-b-0 md:border-r">
      {label}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex w-full items-center justify-between gap-3 text-left text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none dark:text-white"
      >
        <span className={value ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-500"}>{formatDate(value)}</span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-base dark:bg-white/10" aria-hidden="true">▣</span>
      </button>

      {open && (
        <div className="absolute left-1/2 top-[calc(100%+0.55rem)] z-40 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:shadow-black/30" role="dialog" aria-label={`${label} calendar`}>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Previous month">←</button>
            <p className="font-bold text-slate-900 dark:text-white">{visibleMonth.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</p>
            <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Next month">→</button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {weekdays.map((day, index) => <span key={`${day}-${index}`} className="py-2 text-xs font-bold text-slate-400">{day}</span>)}
            {days.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const isoDate = toIsoDate(date);
              const selected = isoDate === value;
              const disabled = Boolean(min && isoDate < min);
              return (
                <button
                  key={isoDate}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(date)}
                  className={`aspect-square rounded-full text-xs transition-colors ${selected ? "bg-indigo-600 font-bold text-white" : disabled ? "cursor-not-allowed text-slate-300 dark:text-slate-600" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="rounded-full px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Clear</button>
            <button type="button" onClick={goToToday} className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
