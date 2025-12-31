import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { t } from "i18next";
import React, { useState, useMemo } from "react";
import { Alert, DeviceEventEmitter } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import ModalOverhead from "@/components/ModalOverhead";
import { updateHomeworkIsDone, deleteHomeworkFromDatabase, parseJsonArray } from "@/database/useHomework";
import { getManager } from "@/services/shared";
import AnimatedPressable from "@/ui/components/AnimatedPressable";
import Icon from "@/ui/components/Icon";
import Stack from "@/ui/components/Stack";
import TableFlatList from "@/ui/components/TableFlatList";
import { formatHTML } from "@/utils/format/html";
import { getAttachmentIcon } from "@/utils/news/getAttachmentIcon";
import { getSubjectColor, Colors } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { getSubjectName } from "@/utils/subjects/name";
import { normalizeSubject } from "@/utils/subjects/normalize";
import { useAccountStore } from "@/stores/account";
import { Attachment } from "@/services/shared/attachment";

const Task = () => {
  const params = useLocalSearchParams();
  const theme = useTheme();
  const colors = theme.colors;

  const task = useMemo(() => ({
    subject: (params.subject as string) || "",
    content: (params.content as string) || "",
    dueDate: params.dueDate ? Number(params.dueDate) : Date.now(),
    isDone: String(params.isDone) === "true",
    id: (params.id as string) || "",
    custom: String(params.custom) === "true",
    attachments: (params.attachments as string) || "[]",
    createdByAccount: (params.createdByAccount as string) || "",
  }), [params]);

  const [isDone, setIsDone] = useState(task.isDone);
  const attachments = useMemo(() => parseJsonArray(task.attachments) as Attachment[], [task.attachments]);

  const subjectInfo = useMemo(() => {
    const store = useAccountStore.getState();
    const account = store.accounts.find(a => a.id === store.lastUsedAccount);
    const customSubjects = account?.customisation?.subjects || {};
    const target = normalizeSubject(task.subject);
    const foundKey = Object.keys(customSubjects).find(key =>
      normalizeSubject(key) === target || normalizeSubject(customSubjects[key].name) === target
    );
    const customData = foundKey ? customSubjects[foundKey] : null;

    return {
      color: customData?.color || getSubjectColor(task.subject) || Colors[0],
      emoji: customData?.emoji || getSubjectEmoji(task.subject) || "📚",
      name: customData?.name || getSubjectName(task.subject)
    };
  }, [task.subject]);

  const handleEdit = () => {
    router.back();
    setTimeout(() => {
      router.push({
        pathname: "/(modals)/tasks/editor",
        params: {
          id: task.id,
          subject: task.subject,
          content: task.content,
          dueDate: task.dueDate.toString(),
          isDone: isDone ? "true" : "false",
          custom: "true",
          attachments: task.attachments
        }
      });
    }, 100);
  };

  const setAsDone = async (done: boolean) => {
    const manager = getManager();
    const sharedHw = { ...task, dueDate: new Date(task.dueDate), attachments } as any;
    if (manager && !task.custom) await manager.setHomeworkCompletion(sharedHw, done);
    await updateHomeworkIsDone(task.id, done);
    setIsDone(done);
    DeviceEventEmitter.emit("refreshHomework");
  };

  const handleDelete = () => {
    Alert.alert(t("Task_Delete_Confirm_Title"), t("Task_Delete_Confirm_Message"), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: async () => {
          await deleteHomeworkFromDatabase(task.id);
          DeviceEventEmitter.emit("refreshHomework");
          router.back();
        }
      }
    ]);
  };

  return (
    <>
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
            date={new Date(task.dueDate)}
            style={{ marginVertical: 24 }}
          />
        }
        sections={[
          {
            title: t("Modal_Task_Status"),
            icon: <Papicons name="Check" />,
            items: [{
              title: isDone ? t("Task_Done") : t("Task_Undone"),
              leading: (
                <AnimatedPressable onPress={() => setAsDone(!isDone)}>
                  <Stack
                    backgroundColor={isDone ? subjectInfo.color : undefined}
                    card radius={100} width={28} height={28} vAlign="center" hAlign="center"
                    style={{ borderWidth: isDone ? 0 : 2, borderColor: colors.text + "20" }}
                  >
                    {isDone && <Papicons name="check" size={22} color="white" />}
                  </Stack>
                </AnimatedPressable>
              )
            }]
          },
          {
            title: t("Modal_Task_Description"),
            icon: <Papicons name="List" />,
            items: [{
              title: formatHTML(task.content),
              titleProps: { variant: "title", weight: "medium" }
            }]
          },
          attachments.length > 0 ? {
            title: t("Modal_Task_Attachments"),
            icon: <Papicons name="Link" />,
            items: attachments.map((attachment) => ({
              title: attachment.name || attachment.url,
              titleProps: { nowrap: true },
              description: attachment.url,
              leading: <Icon><Papicons name={getAttachmentIcon(attachment)} /></Icon>,
              onPress: () => WebBrowser.openBrowserAsync(attachment.url)
            }))
          } : null,
          task.custom ? {
            title: t("Modal_Task_Options"),
            icon: <Papicons name="Archive" />,
            items: [
              {
                title: t("Modal_Task_Edit_Custom"),
                leading: <Icon><Papicons name="PenAlt" /></Icon>,
                onPress: handleEdit
              },
              {
                title: t("Modal_Task_Delete_Custom"),
                leading: <Icon><Papicons name="Cross" /></Icon>,
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