import { useEffect, useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";
import { useApp } from "@/state/app-state";
import { studyStreak, summarizeStudyActivity, lessonDates, type StudyDevice } from "@/lib/study-activity";
const empty = { rows: [] as StudyDevice[], owner: "", goal:10 };
let snapshot=empty;
const listeners=new Set<()=>void>();
function publish(value: typeof empty) { snapshot=value;for (const listener of listeners) listener(); }
export function useStudyCloud() {
  const { user }=useAuth();
  const value=useSyncExternalStore((listener)=>{listeners.add(listener);return ()=>{listeners.delete(listener);};},()=>snapshot,()=>empty);
  return value.owner === user?.id ? value.rows : empty.rows;
}
export function useStudyCloudSync(readDays: ()=>Record<string,number>, readGoal: ()=>number, applyGoal: (goal:number)=>void) {
  const { user,isCurrentUser }=useAuth();
  const { state }=useApp();
  const latestState=useRef(state);latestState.current=state;
  useEffect(()=>{
    publish(empty);
    if (!user || !state.hydrated) return;
    const owner=user.id;
    let stopped=false,busy=false;
    const sync=async()=>{
      if (busy || stopped || !isCurrentUser(owner)) return;
      busy=true;
      try {
        const pendingGoal=localStorage.getItem(`lt.study-goal.pending.${owner}`);
        if (pendingGoal && [5,10,15,20].includes(Number(pendingGoal))) {
          const saved=await supabase.from("study_activity_preferences" as never).upsert({user_id:owner,goal_minutes:Number(pendingGoal)} as never);
          if (saved.error) throw saved.error;
          if (localStorage.getItem(`lt.study-goal.pending.${owner}`) === pendingGoal) localStorage.removeItem(`lt.study-goal.pending.${owner}`);
        }
        const goalResult=await supabase.from("study_activity_preferences" as never).select("goal_minutes").eq("user_id",owner).maybeSingle();
        if (stopped || !isCurrentUser(owner)) return;
        if (!goalResult.error && goalResult.data) applyGoal((goalResult.data as {goal_minutes:number}).goal_minutes);
        else if (!goalResult.error) await supabase.from("study_activity_preferences" as never).upsert({user_id:owner,goal_minutes:readGoal()} as never,{onConflict:"user_id",ignoreDuplicates:true});
        const key=`lt.study-contribution.v1.${owner}`;
        const raw=localStorage.getItem(key);
        const current=readDays();
        // Existing device-local minutes have no account provenance: start from a baseline,
        // rather than uploading another learner's historical study time.
        const local: {device:string;baseline:Record<string,number>;seconds:Record<string,number>} = raw ? JSON.parse(raw) : {device:crypto.randomUUID(),baseline:current,seconds:{}};
        const lastOwner=localStorage.getItem("lt.study-contribution.owner");
        if (lastOwner !== owner) {
          local.baseline=Object.fromEntries(Object.entries(current).map(([day,value])=>[day,value-(local.seconds[day] ?? 0)]));
          localStorage.setItem("lt.study-contribution.owner",owner);
        }
        for (const [day,value] of Object.entries(current)) local.seconds[day]=Math.max(local.seconds[day] ?? 0,value-(local.baseline[day] ?? 0));
        localStorage.setItem(key,JSON.stringify(local));
        const {data,error}=await supabase.rpc("sync_study_activity" as never,{p_device_id:local.device,p_seconds:local.seconds,p_lessons:lessonDates(latestState.current.core30Log),p_practice_days:latestState.current.practiceStreak.practiceDates} as never);
        if (error) throw error;
        if (!stopped && isCurrentUser(owner)) publish({owner,rows:data as StudyDevice[],goal:readGoal()});
      } catch { /* Remains on this account's device queue; retry on timer/online/focus. */ }
      finally { busy=false; }
    };
    const changeGoal=(event:Event)=>{
      const minutes=(event as CustomEvent<number>).detail;
      if (isCurrentUser(owner) && [5,10,15,20].includes(minutes)) { localStorage.setItem(`lt.study-goal.pending.${owner}`,String(minutes));void sync(); }
    };
    window.addEventListener("lt:study-goal",changeGoal);
    void sync();
    const timer=setInterval(()=>void sync(),30_000);
    window.addEventListener("online",sync);window.addEventListener("focus",sync);document.addEventListener("visibilitychange",sync);
    return ()=>{window.removeEventListener("lt:study-goal",changeGoal);stopped=true;clearInterval(timer);window.removeEventListener("online",sync);window.removeEventListener("focus",sync);document.removeEventListener("visibilitychange",sync);};
  },[user?.id,isCurrentUser,state.hydrated,readDays,readGoal,applyGoal,user]);
}
export { summarizeStudyActivity, lessonDates };

export function useSyncedStudyStreak(goalMinutes?:number) {
  const {state}=useApp();
  const rows=useStudyCloud();
  const activity=summarizeStudyActivity(rows);
  const date=new Date();
  const today=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const days={...activity.lessons};
  for (const day of state.practiceStreak.practiceDates) days[`legacy:${day}`]=day;
  return Math.max(state.practiceStreak.current,studyStreak(activity.seconds,days,today,goalMinutes ?? snapshot.goal,activity.practiceDays));
}

export function useSyncedStudyDates() {
  const {state}=useApp();
  const activity=summarizeStudyActivity(useStudyCloud());
  return [...new Set([...state.practiceStreak.practiceDates,...activity.practiceDays,...Object.values(activity.lessons),...Object.entries(activity.seconds).filter(([,value])=>value >= snapshot.goal*60).map(([day])=>day)])];
}
