import { useTheme } from '@react-navigation/native';
import { t } from 'i18next';
import React, { useMemo } from 'react';
import { Platform, Dimensions, View } from 'react-native';
import { router } from "expo-router";

import { getDateRangeOfWeek, getWeekNumberFromDate } from '@/database/useHomework';
import ChipButton from '@/ui/components/ChipButton';
import Search from '@/ui/components/Search';
import TabHeader from '@/ui/components/TabHeader';
import TabHeaderTitle from '@/ui/components/TabHeaderTitle';
import Stack from '@/ui/components/Stack';
import AnimatedPressable from '@/ui/components/AnimatedPressable';
import * as Papicons from '@getpapillon/papicons';

export type SortMethod = 'date' | 'subject' | 'done';

interface TasksHeaderProps {
  defaultWeek: number;
  selectedWeek: number;
  onToggleWeekPicker: () => void;
  setHeaderHeight: (height: number) => void;
  setShowUndoneOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setSortMethod: React.Dispatch<React.SetStateAction<SortMethod>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  sortMethod: SortMethod;
  shouldCollapseHeader: boolean;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({
  defaultWeek,
  selectedWeek,
  onToggleWeekPicker,
  setHeaderHeight,
  setShowUndoneOnly,
  setSortMethod,
  setSearchTerm,
  sortMethod,
  shouldCollapseHeader,
}) => {
  const { colors } = useTheme();

  const sortingOptions = useMemo(
    () => [
      { label: t('Tasks_Sorting_Methods_DueDate'), value: "date", icon: "calendar" },
      { label: t('Tasks_Sorting_Methods_Subject'), value: "subject", icon: "font" },
      { label: t('Tasks_Sorting_Methods_Done'), value: "done", icon: "check" },
    ],
    []
  );

  const activeSortLabel = sortingOptions.find(s => s.value === sortMethod)?.label;
  const menuTitle = (activeSortLabel || t("Tasks_Sort_Default"));

  return (
    <TabHeader
      onHeightChanged={setHeaderHeight}
      title={
        <TabHeaderTitle
          leading={t('Tasks_Week')}
          subtitle={selectedWeek === defaultWeek ? t('Tasks_ThisWeek') : undefined}
          number={getWeekNumberFromDate(getDateRangeOfWeek(selectedWeek, new Date().getFullYear()).start).toString()}
          color='#C54CB3'
          onPress={onToggleWeekPicker}
          height={56}
        />
      }
      trailing={
        <ChipButton
          onPressAction={({ nativeEvent }) => {
            const actionId = nativeEvent.event;
            if (actionId === 'only-undone') {
              setShowUndoneOnly(prev => !prev);
            } else if (actionId.startsWith("sort:")) {
              setSortMethod(actionId.replace("sort:", "") as SortMethod);
            }
          }}
          actions={[
            {
              title: t('Task_Sorting_Title'),
              subactions: sortingOptions.map((method) => ({
                title: method.label,
                id: "sort:" + method.value,
                state: (sortMethod === method.value ? 'on' : 'off'),
                image: Platform.select({
                  ios:
                    method.value === 'date'
                      ? "calendar"
                      : method.value === 'subject'
                        ? "character"
                        : "checkmark.circle"
                }),
                imageColor: colors.text,
              })),
              displayInline: true
            }
          ]}
          icon="filter"
          chevron
        >
          {menuTitle}
        </ChipButton>
      }
      bottom={
        <Stack
          direction="horizontal"
          gap={10}
          vAlign="center"
          style={{ width: Dimensions.get("window").width - 32, marginTop: 6 }}
        >
          <View style={{ flex: 1 }}>
            <Search
              placeholder={t('Tasks_Search_Placeholder')}
              color='#C54CB3'
              onTextChange={setSearchTerm}
              style={{ width: '100%' }}
            />
          </View>
          <AnimatedPressable
            onPress={() => router.push("/(modals)/create_task")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#C54CB320',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#C54CB340'
            }}
          >
            <Papicons.PenAlt size={22} color="#C54CB3" />
          </AnimatedPressable>
        </Stack>
      }
      shouldCollapseHeader={shouldCollapseHeader}
    />
  );
};

export default TasksHeader;