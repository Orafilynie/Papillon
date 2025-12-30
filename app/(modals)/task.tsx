import React, { useState, useMemo } from "react";
import { Alert } from "react-native";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { t } from "i18next";
import * as Papicons from "@getpapillon/papicons";

import ModalOverhead from "@/components/ModalOverhead";
import { updateHomeworkIsDone, deleteHomeworkFromDatabase, parseJsonArray } from "@/database/useHomework";
import { getManager } from "@/services/shared";
import AnimatedPressable from "@/ui/components/AnimatedPressable";
import Icon from "@/ui/components/Icon";
import Stack from "@/ui/components/Stack";
import TableFlatList from "@/ui/components/TableFlatList";
import { formatHTML } from "@/utils/format/html";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { getSubjectName } from "@/utils/subjects/name";
import { Attachment } from "@/services/shared/attachment";
import { Homework as SharedHomework } from "@/services/shared/homework";
import { NativeHeaderSide, NativeHeaderPressable } from "@/ui/components/NativeHeader";
import { useAccountStore } from "@/stores/account";

const Task = () => {
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const taskData = useMemo(() => ({
    subject: (params.subject as string) || "",
    content: (params.content as string) || "",
    dueDate: params.dueDate ? Number(params.dueDate) : Date.now(),
    isDone: String(params.isDone) === "true",
    id: (params.id as string) || (params.homeworkId as string) || "",
    custom: String(params.custom) === "true",
    createdByAccount: (params.createdByAccount as string) || "custom",
    attachments: (params.attachments as string) || "[]"
  }), [params]);

  const subjectInfo = useMemo(() => {
    const store = useAccountStore.getState();
    const currentAccount = store.accounts.find(a => a.id === store.lastUsedAccount);

    const customData = Object.values(currentAccount?.customisation?.subjects || {}).find(
      (s) => s.name === taskData.subject
    );

    return {
      color: getSubjectColor(taskData.subject),
      emoji: customData?.emoji || getSubjectEmoji(taskData.subject),
      name: getSubjectName(taskData.subject)
    };
  }, [taskData.subject]);

  const [isDone, setIsDone] = useState(taskData.isDone);
  const attachments = useMemo(() => parseJsonArray(taskData.attachments) as Attachment[], [taskData.attachments]);
  const dueDateObj = useMemo(() => new Date(taskData.dueDate), [taskData.dueDate]);

  const setAsDone = async (done: boolean) => {
    const manager = getManager();
    const sharedHw = { ...taskData, dueDate: dueDateObj, attachments } as unknown as SharedHomework;

    if (manager && !taskData.custom) {
      await manager.setHomeworkCompletion(sharedHw, done);
    }

    await updateHomeworkIsDone(taskData.id, done);
    setIsDone(done);

    const store = useAccountStore.getState();
    const currentAccount = store.accounts.find(a => a.id === store.lastUsedAccount);
    const currentSubjects = currentAccount?.customisation?.subjects || {};

    store.setSubjects({ ...currentSubjects });
  };

  const handleDelete = () => {
    Alert.alert(t("Task_Delete_Confirm_Title"), t("Task_Delete_Confirm_Message"), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: async () => {
          if (taskData.id) {
            await deleteHomeworkFromDatabase(taskData.id);

            const store = useAccountStore.getState();
            const currentAccount = store.accounts.find(a => a.id === store.lastUsedAccount);
            const currentSubjects = currentAccount?.customisation?.subjects || {};

            store.setSubjects({ ...currentSubjects });
            router.back();
          }
        }
      }
    ]);
  };

  return (
    <>
      {taskData.custom && (
        <NativeHeaderSide side="Right">
          <NativeHeaderPressable onPress={handleDelete}>
            <Icon papicon color={colors.notification}>
              <Papicons.Cross />
            </Icon>
          </NativeHeaderPressable>
        </NativeHeaderSide>
      )}

      <LinearGradient
        colors={[subjectInfo.color, colors.background]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300, zIndex: -9, opacity: 0.4 }}
      />

      <TableFlatList
        ListHeaderComponent={
          <ModalOverhead
            emoji={subjectInfo.emoji}
            subject={subjectInfo.name}
            subjectVariant="header"
            color={subjectInfo.color}
            date={dueDateObj}
            style={{ marginVertical: 24 }}
          />
        }
        sections={[
          {
            title: t("Modal_Task_Status"),
            papicon: <Papicons.Check />,
            items: [
              {
                title: isDone ? t("Task_Done") : t("Task_Undone"),
                leading: (
                  <AnimatedPressable onPress={() => setAsDone(!isDone)}>
                    <Stack
                      backgroundColor={isDone ? subjectInfo.color : undefined}
                      card
                      radius={100}
                      width={28}
                      height={28}
                      vAlign="center"
                      hAlign="center"
                      style={{ borderWidth: isDone ? 0 : 2, borderColor: colors.text + "20" }}
                    >
                      {isDone && <Papicons.Check size={22} color="white" />}
                    </Stack>
                  </AnimatedPressable>
                )
              }
            ]
          },
          {
            title: t("Modal_Task_Description"),
            papicon: <Papicons.List />,
            items: [{ title: formatHTML(taskData.content || ""), titleProps: { variant: "title", weight: "medium" } }]
          },
          attachments.length > 0 ? {
            title: t("Modal_Task_Attachments"),
            papicon: <Papicons.Link />,
            items: attachments.map((attachment: Attachment) => ({
              title: attachment.name || attachment.url,
              leading: <Icon papicon><Papicons.Link /></Icon>,
              onPress: () => WebBrowser.openBrowserAsync(attachment.url, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET
              })
            }))
          } : null,
          taskData.custom ? {
            title: t("Modal_Task_Options"),
            items: [
              {
                title: t("Modal_Task_Delete_Custom"),
                titleProps: { color: colors.notification },
                leading: <Icon papicon color={colors.notification}><Papicons.Cross /></Icon>,
                onPress: handleDelete
              }
            ]
          } : null
        ].filter(Boolean)}
        style={{ backgroundColor: "transparent" }}
      />
    </>
  );
};

export default Task;