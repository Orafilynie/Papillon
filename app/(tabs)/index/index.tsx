import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, DeviceEventEmitter } from 'react-native';
import Wallpaper from './atoms/Wallpaper';
import HomeHeader from './atoms/HomeHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeTopBar from './atoms/HomeTopBar';
import HomeTimeTableWidget from './widgets/timetable';
import { Papicons } from '@getpapillon/papicons';
import { t } from 'i18next';
import { LegendList } from '@legendapp/list';
import { useHomeData } from './hooks/useHomeData';
import HomeWidget, { HomeWidgetItem } from './components/HomeWidget';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAccountStore } from '@/stores/account';

import { getHomeworksFromCache, getWeekNumberFromDate, updateHomeworkIsDone } from '@/database/useHomework';
import { getManager, subscribeManagerUpdate } from '@/services/shared';
import { Homework } from '@/services/shared/homework';
import CompactTask from '@/ui/components/CompactTask';
import { getSubjectName } from '@/utils/subjects/name';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectEmoji } from '@/utils/subjects/emoji';
import { normalizeSubject } from "@/utils/subjects/normalize";

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const accounts = useAccountStore((state) => state.accounts);
  const router = useRouter();

  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const weekNumber = getWeekNumberFromDate(new Date());

  useEffect(() => {
    if (accounts.length === 0) {
      router.replace("/(onboarding)/welcome");
    }
  }, [accounts.length]);

  useHomeData();

  const fetchHomeworks = useCallback(async () => {
    try {
      const manager = getManager();
      const cachedCurrent = await getHomeworksFromCache(weekNumber);
      const cachedNext = await getHomeworksFromCache(weekNumber + 1);
      let all = [...cachedCurrent, ...cachedNext];

      if (manager) {
        const currentWeek = await manager.getHomeworks(weekNumber);
        const nextWeek = await manager.getHomeworks(weekNumber + 1);
        const ids = new Set(all.map(h => h.id));
        [...currentWeek, ...nextWeek].forEach(hw => {
          if (!ids.has(hw.id)) all.push(hw);
        });
      }

      const sorted = all.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const nonDone = sorted.filter(hw => !hw.isDone);
      const toShow = nonDone.length > 0 ? nonDone : sorted;
      setHomeworks(toShow.slice(0, 3));
    } catch (e) {
      console.error("Erreur fetchHomeworks:", e);
    }
  }, [weekNumber]);

  const handleSetDone = useCallback(async (homework: Homework) => {
    try {
      const manager = getManager();
      const newStatus = !homework.isDone;
      if (manager && !homework.custom) await manager.setHomeworkCompletion(homework, newStatus);
      await updateHomeworkIsDone(homework.id, newStatus);
      setHomeworks(prev => prev.map(hw => hw.id === homework.id ? { ...hw, isDone: newStatus } : hw));
      DeviceEventEmitter.emit("refreshHomework");
    } catch (e) {
      console.error("Erreur handleSetDone:", e);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchHomeworks(); }, [fetchHomeworks]));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refreshHomework", () => { fetchHomeworks(); });
    return () => sub.remove();
  }, [fetchHomeworks]);

  useEffect(() => {
    const unsubscribe = subscribeManagerUpdate(() => { setTimeout(() => fetchHomeworks(), 100); });
    return () => unsubscribe();
  }, [fetchHomeworks]);

  const renderHomeworks = useCallback(() => {
    const store = useAccountStore.getState();
    const account = store.accounts.find(a => a.id === store.lastUsedAccount);
    const customSubjects = account?.customisation?.subjects || {};

    return (
      <View style={{ paddingHorizontal: 12, paddingBottom: 16, gap: 10 }}>
        {homeworks.map((item) => {
          const target = normalizeSubject(item.subject);
          const foundKey = Object.keys(customSubjects).find(key =>
            normalizeSubject(key) === target ||
            normalizeSubject(customSubjects[key].name) === target
          );
          const customData = foundKey ? customSubjects[foundKey] : null;

          return (
            <CompactTask
              key={item.id}
              setHomeworkAsDone={() => handleSetDone(item)}
              subject={customData?.name || getSubjectName(item.subject)}
              color={customData?.color || getSubjectColor(item.subject)}
              emoji={customData?.emoji || getSubjectEmoji(item.subject)}
              description={item.content.replace(/<[^>]*>/g, "")}
              dueDate={new Date(item.dueDate)}
              done={item.isDone}
              onPress={() => router.push({
                pathname: "/(modals)/tasks/task",
                params: {
                  id: item.id,
                  subject: item.subject,
                  content: item.content,
                  dueDate: new Date(item.dueDate).getTime().toString(),
                  isDone: item.isDone ? "true" : "false",
                  custom: item.custom ? "true" : "false",
                  createdByAccount: item.createdByAccount,
                  attachments: JSON.stringify(item.attachments || [])
                }
              })}
            />
          );
        })}
      </View>
    );
  }, [homeworks, router, handleSetDone]);

  const renderTimeTable = useCallback(() => <HomeTimeTableWidget />, []);

  const data: HomeWidgetItem[] = useMemo(() => [
    { icon: <Papicons name={"Calendar"} />, title: t("Home_Widget_NextCourses"), redirect: "(tabs)/calendar", render: renderTimeTable },
    ...(homeworks.length > 0 ? [{ icon: <Papicons name={"Tasks"} />, title: t("Tab_Tasks"), redirect: "/(tabs)/tasks", buttonLabel: homeworks.length > 3 ? `${homeworks.length - 3}+` : t("Home_See_All_Tasks"), render: renderHomeworks }] : []),
  ], [renderTimeTable, renderHomeworks, homeworks.length]);

  return (
    <>
      <Wallpaper /><HomeTopBar />
      <LegendList
        renderItem={({ item }) => <HomeWidget item={item} />}
        keyExtractor={(item) => item.title}
        ListHeaderComponent={<HomeHeader />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + bottomTabBarHeight + 20, paddingHorizontal: 16 }}
        data={data}
      />
    </>
  );
};

export default HomeScreen;