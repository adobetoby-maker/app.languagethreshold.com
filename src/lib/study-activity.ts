import type { Core30Log } from "./core30-plan";
export interface StudyDevice {
  user_id: string;
  device_id: string;
  seconds: Record<string, number>;
  lessons: Record<string, string>;
  practice_days?: string[];
}
export function summarizeStudyActivity(rows: StudyDevice[]) {
  const seconds: Record<string, number> = {};
  const lessons: Record<string, string> = {};
  for (const row of rows) {
    for (const [day, value] of Object.entries(row.seconds)) {
      if (Number.isFinite(value) && value >= 0) seconds[day] = (seconds[day] ?? 0) + value;
    }
    for (const [id, day] of Object.entries(row.lessons)) lessons[id] = lessons[id] ? [lessons[id], day].sort()[0] : day;
  }
  return { seconds, lessons, practiceDays: [...new Set(rows.flatMap(row=>row.practice_days ?? []))] };
}
export function studyStreak(seconds: Record<string, number>, lessons: Record<string,string>, today: string, goalMinutes = 10, practiceDays: string[] = []) {
  const days = new Set([...practiceDays,...Object.entries(seconds).filter(([,n]) => n >= goalMinutes * 60).map(([d]) => d), ...Object.values(lessons)]);
  const day = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) day.setUTCDate(day.getUTCDate()-1);
  let count=0;
  while (days.has(day.toISOString().slice(0,10))) { count++; day.setUTCDate(day.getUTCDate()-1); }
  return count;
}

export function lessonDates(log: Core30Log) {
  const result: Record<string,string>={};
  const scopedLessons=new Set<string>();
  for (const [scope,module] of Object.entries(log ?? {})) {
    try { const parsed=JSON.parse(scope);if(parsed[0] === "core30") for(const id of Object.keys(module.lessons ?? {})) scopedLessons.add(`${parsed[2]}:${id}`); } catch { /* legacy */ }
  }
  for (const [scope,module] of Object.entries(log ?? {})) {
    let moduleID=scope;let pair:string|null=null;
    try { const parsed=JSON.parse(scope);if (parsed[0] === "core30") {moduleID=parsed[2];pair=`${parsed[3]}:${parsed[4]}`;} } catch { /* legacy module key */ }
    for (const [id,lesson] of Object.entries(module.lessons ?? {})) {
      if (!lesson.masteredAt || (!pair && scopedLessons.has(`${moduleID}:${id}`))) continue;
      const date=new Date(lesson.masteredAt);
      if (!Number.isFinite(+date)) continue;
      const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      const key=pair ? `core60:${pair}:${moduleID}:${id}` : `web:${moduleID}:${id}`;
      result[key]=result[key] ? [result[key],day].sort()[0] : day;
    }
  }
  return result;
}
