import React, { useState, useRef, useMemo } from 'react';
import { View, TextInput, Alert, Platform, DeviceEventEmitter } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { router } from "expo-router";
import * as Papicons from '@getpapillon/papicons';
import { MenuView } from "@react-native-menu/menu";
import { t } from "i18next";

import TableFlatList from "@/ui/components/TableFlatList";
import Typography from "@/ui/components/Typography";
import Stack from "@/ui/components/Stack";
import Icon from "@/ui/components/Icon";
import Calendar, { CalendarRef } from "@/ui/components/Calendar";
import { useAccountStore } from "@/stores/account";
import { addHomeworkToDatabase } from "@/database/useHomework";
import uuid from "@/utils/uuid/uuid";
import { getSubjectEmoji } from '@/utils/subjects/emoji';
import { getSubjectName } from '@/utils/subjects/name';
import AnimatedPressable from '@/ui/components/AnimatedPressable';

export default function CreateTaskModal() {
  const { colors } = useTheme();
  const calendarRef = useRef<CalendarRef>(null);

  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [selectedSubject, setSelectedSubject] = useState<{ id: string, name: string, emoji: string } | null>(null);

  const accountStore = useAccountStore();
  const account = accountStore.accounts.find(a => a.id === accountStore.lastUsedAccount);

  const subjectActions = useMemo(() => {
    const subjects = Object.entries(account?.customisation?.subjects ?? {}).map(([id, data]) => ({
      id: id,
      title: data.name || id,
    }));
    const sorted = subjects.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    return sorted.length > 0 ? sorted : [{ id: 'none', title: t("Subjects_None_Configured") }];
  }, [account]);

  const handleSave = async () => {
    if (!content.trim() || !selectedSubject) {
      Alert.alert(t("Create_Task_Error_Title"), t("Create_Task_Error_Message"));
      return;
    }

    const generatedId = uuid();
    const newTask = {
      id: generatedId,
      homeworkId: generatedId,
      subject: selectedSubject.id,
      content: content.trim(),
      dueDate: dueDate,
      isDone: false,
      attachments: [],
      evaluation: false,
      custom: true,
      createdByAccount: account?.id || "custom",
    };

    try {
      await addHomeworkToDatabase([newTask as any]);
      DeviceEventEmitter.emit("refreshHomework");
      router.back();
    } catch (e) {
      Alert.alert(t("Error"), t("Create_Task_Save_Error"));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack direction="horizontal" vAlign="center" style={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 20 : 40, justifyContent: 'space-between' }}>
        <AnimatedPressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Papicons.ArrowLeft size={24} color={colors.text} />
        </AnimatedPressable>
        <Typography variant="header">{t("Create_Task_Title")}</Typography>
        <AnimatedPressable onPress={handleSave} style={{ backgroundColor: colors.primary, padding: 8, borderRadius: 20 }}>
          <Papicons.Check size={24} color="white" />
        </AnimatedPressable>
      </Stack>

      <TableFlatList
        ignoreHeaderHeight={true}
        sections={[
          {
            title: t("Configuration"),
            items: [
              {
                title: t("Create_Task_Subject"),
                description: selectedSubject ? `${selectedSubject.emoji} ${selectedSubject.name}` : t("Create_Task_Subject_Placeholder"),
                leading: <Icon papicon opacity={0.5}><Papicons.Newspaper /></Icon>,
                content: (
                  <MenuView
                    title={t("Create_Task_Subject_Placeholder")}
                    onPressAction={({ nativeEvent }) => {
                      const subjectId = nativeEvent.event;
                      const subjectData = account?.customisation?.subjects[subjectId];
                      setSelectedSubject({
                        id: subjectId,
                        name: subjectData?.name || getSubjectName(subjectId),
                        emoji: subjectData?.emoji || getSubjectEmoji(subjectId)
                      });
                    }}
                    actions={subjectActions}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  >
                    <View style={{ height: 60, width: '100%' }} />
                  </MenuView>
                )
              },
              {
                title: t("Create_Task_DueDate"),
                description: dueDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
                leading: <Icon papicon opacity={0.5}><Papicons.Calendar /></Icon>,
                onPress: () => calendarRef.current?.toggle()
              }
            ]
          },
          {
            title: t("Modal_Task_Description"),
            items: [{
              content: (
                <TextInput
                  multiline
                  placeholder={t("Create_Task_Content_Placeholder")}
                  placeholderTextColor={colors.text + "40"}
                  value={content}
                  onChangeText={setContent}
                  style={{ color: colors.text, padding: 10, minHeight: 120, fontFamily: 'medium', fontSize: 16, textAlignVertical: 'top' }}
                />
              )
            }]
          }
        ]}
      />
      <Calendar ref={calendarRef} date={dueDate} onDateChange={setDueDate} color={colors.primary} />
    </View>
  );
}