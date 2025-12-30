import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccountStore } from "@/stores/account";
import { getManager, subscribeManagerUpdate } from "@/services/shared";
import { Homework } from "@/services/shared/homework";
import { useHomeworkForWeek, updateHomeworkIsDone } from "@/database/useHomework";
import { generateId } from "@/utils/generateId";
import { error } from '@/utils/logger/logger';

export const useHomeworkData = (selectedWeek: number, alert: any) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [homework, setHomework] = useState<Record<string, Homework>>({});

  const subjects = useAccountStore(state => 
    state.accounts.find(a => a.id === state.lastUsedAccount)?.customisation?.subjects
  );

  const store = useAccountStore.getState();
  const account = store.accounts.find(acc => acc.id === store.lastUsedAccount);
  
  const services = useMemo(() => account?.services?.map((s: any) => s.id) ?? [], [account]);
  
  const rawCache = useHomeworkForWeek(selectedWeek, refreshTrigger);

  const homeworksFromCache = useMemo(() => {
    return rawCache.filter(h => services.includes(h.createdByAccount) || h.custom === true);
  }, [rawCache, services]);

  const fetchHomeworks = useCallback(async (managerToUse = getManager()) => {
    try {
      const result: Homework[] = managerToUse ? await managerToUse.getHomeworks(selectedWeek) : [];
      const merged: Record<string, Homework> = {};

      homeworksFromCache.forEach(hw => {
        merged[hw.id] = hw;
      });

      result.forEach(hw => {
        const id = generateId(hw.subject + hw.content + hw.createdByAccount + hw.dueDate.toDateString());
        if (!merged[id] || !merged[id].custom) {
          merged[id] = { ...hw, id: hw.id ?? id };
        }
      });

      setHomework(prev => {
        const prevKeys = Object.keys(prev);
        const mergedKeys = Object.keys(merged);
        if (prevKeys.length === mergedKeys.length && 
            mergedKeys.every(key => prev[key]?.isDone === merged[key]?.isDone)) {
          return prev;
        }
        return merged;
      });

    } catch (e) {
      error("Fetch error", String(e));
      const fb: Record<string, Homework> = {};
      homeworksFromCache.forEach(hw => { fb[hw.id] = hw; });
      setHomework(fb);
    }
  }, [selectedWeek, homeworksFromCache]);

  useEffect(() => {
    fetchHomeworks();
    setRefreshTrigger(prev => prev + 1);
  }, [selectedWeek, subjects]);

  useEffect(() => {
    const unsubscribe = subscribeManagerUpdate(() => fetchHomeworks());
    return () => unsubscribe();
  }, [fetchHomeworks]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHomeworks();
    setIsRefreshing(false);
  }, [fetchHomeworks]);

  const setAsDone = useCallback(async (item: Homework, done: boolean) => {
    try {
      const manager = getManager();
      if (manager && !item.custom) {
        await manager.setHomeworkCompletion(item, done);
      }

      await updateHomeworkIsDone(item.id, done);
      
      setHomework(prev => ({
        ...prev,
        [item.id]: { ...(prev[item.id] ?? item), isDone: done }
      }));
      
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert.showAlert({
        title: "Erreur",
        message: "Impossible de mettre à jour l'état du devoir.",
        color: "#D60046",
      });
    }
  }, [alert]);

  return {
    homework,
    homeworksFromCache,
    isRefreshing,
    handleRefresh,
    setAsDone,
  };
};