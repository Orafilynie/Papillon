import React, { memo, useMemo } from 'react';
import Reanimated from 'react-native-reanimated';

import { Homework } from "@/services/shared/homework";
import Task from "@/ui/components/Task";
import { PapillonAppearIn, PapillonAppearOut } from '@/ui/utils/Transition';
import { getSubjectName } from "@/utils/subjects/name";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { getSubjectColor } from "@/utils/subjects/colors";
import { normalizeSubject } from "@/utils/subjects/normalize";
import { useMagicPrediction } from '../hooks/useMagicPrediction';
import { router } from 'expo-router';

import { useAccountStore } from "@/stores/account";

interface TaskItemProps {
  item: Homework;
  index: number;
  setAsDone: (item: Homework, done: boolean) => void;
}

const TaskItem = memo(({ item, setAsDone }: TaskItemProps) => {
  const cleanContent = useMemo(() => item.content.replace(/<[^>]*>/g, ""), [item.content]);
  const magic = useMagicPrediction(cleanContent);

  const subjectSettings = useMemo(() => {
    const store = useAccountStore.getState();
    const account = store.accounts.find(a => a.id === store.lastUsedAccount);
    const customSubjects = account?.customisation?.subjects || {};

    const target = normalizeSubject(item.subject);

    const foundKey = Object.keys(customSubjects).find(key => {
      const s = customSubjects[key];
      return normalizeSubject(key) === target || normalizeSubject(s.name) === target;
    });

    const customData = foundKey ? customSubjects[foundKey] : null;

    return {
      name: customData?.name || getSubjectName(item.subject),
      emoji: customData?.emoji || getSubjectEmoji(item.subject),
      color: customData?.color || getSubjectColor(item.subject),
    };
  }, [item.subject]);

  return (
    <Reanimated.View
      style={{ marginBottom: 10 }}
      entering={PapillonAppearIn}
      exiting={PapillonAppearOut}
    >
      <Task
        subject={subjectSettings.name}
        emoji={subjectSettings.emoji}
        title={""}
        color={subjectSettings.color}
        description={item.content}
        date={new Date(item.dueDate)}
        completed={item.isDone}
        hasAttachments={item.attachments.length > 0}
        magic={magic}
        onToggle={() => setAsDone(item, !item.isDone)}
        onPress={() =>
          router.push({
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
          })
        }
      />
    </Reanimated.View>
  );
});

TaskItem.displayName = "TaskItem";
export default TaskItem;