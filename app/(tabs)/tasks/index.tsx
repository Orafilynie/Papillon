import React, { useState, useEffect } from 'react';
import { StyleSheet, View, DeviceEventEmitter } from 'react-native';

import TasksHeader from './components/TasksHeader';
import TasksList from './components/TasksList';
import WeekPicker from './components/WeekPicker';
import { useHomeworkData } from './hooks/useHomeworkData';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useWeekSelection } from './hooks/useWeekSelection';

import { useAlert } from "@/ui/components/AlertProvider";

const TasksView: React.FC = () => {
  const alert = useAlert();
  const [headerHeight, setHeaderHeight] = useState(0);

  const {
    defaultWeek,
    selectedWeek,
    showWeekPicker,
    onSelectWeek,
    setShowWeekPicker,
    toggleWeekPicker,
  } = useWeekSelection();

  const {
    homework,
    homeworksFromCache,
    isRefreshing,
    handleRefresh,
    setAsDone,
  } = useHomeworkData(selectedWeek, alert);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("refreshHomework", () => {
      handleRefresh();
    });

    return () => subscription.remove();
  }, [handleRefresh]);

  const {
    searchTerm,
    setSearchTerm,
    setShowUndoneOnly,
    setSortMethod,
    sortMethod,
    collapsedGroups,
    toggleGroup,
    sections,
  } = useTaskFilters(homeworksFromCache, homework);

  return (
    <View style={styles.container}>
      {showWeekPicker && (
        <WeekPicker
          selectedWeek={selectedWeek}
          onSelectWeek={onSelectWeek}
          onClose={() => setShowWeekPicker(false)}
        />
      )}
      <View style={styles.container}>
        <TasksHeader
          defaultWeek={defaultWeek}
          selectedWeek={selectedWeek}
          onToggleWeekPicker={toggleWeekPicker}
          setHeaderHeight={setHeaderHeight}
          setShowUndoneOnly={setShowUndoneOnly}
          setSortMethod={setSortMethod}
          setSearchTerm={setSearchTerm}
          sortMethod={sortMethod}
          shouldCollapseHeader={false}
        />

        <TasksList
          sections={sections}
          headerHeight={headerHeight}
          searchTerm={searchTerm}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          sortMethod={sortMethod}
          homework={homework}
          setAsDone={setAsDone}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TasksView;