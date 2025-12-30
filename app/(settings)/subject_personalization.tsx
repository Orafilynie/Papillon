import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";

import { useAccountStore } from "@/stores/account";
import AnimatedPressable from "@/ui/components/AnimatedPressable";
import Icon from "@/ui/components/Icon";
import Item, { Leading, Trailing } from "@/ui/components/Item";
import List from "@/ui/components/List";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import { NativeHeaderPressable, NativeHeaderSide } from "@/ui/components/NativeHeader";
import { Trash2 } from "lucide-react-native";

export default function SubjectPersonalization() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const accounts = useAccountStore((state) => state.accounts);
  const lastUsedAccount = useAccountStore((state) => state.lastUsedAccount);
  const store = useAccountStore.getState();

  const account = accounts.find((a) => a.id === lastUsedAccount);
  const subjects = Object.entries(account?.customisation?.subjects ?? {})
    .map(([id, data]) => {
      return {
        id,
        name: data.name || id,
        emoji: data.emoji || "🤓",
        color: data.color || "#D6502B",
      };
    })
    .filter(item => item.id.trim().length > 0 || item.name.trim().length > 0)
    .sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

  const resetAllSubjects = () => {
    Alert.alert(
      t("Settings_Subjects_Reset_Title"),
      t("Settings_Subjects_Reset_Message"),
      [
        { text: t("CANCEL_BTN"), style: "cancel" },
        {
          text: t("Settings_Subjects_Reset_Button"),
          style: "destructive",
          onPress: () => {
            store.setSubjects({});
          },
        },
      ]
    );
  };

  const deleteSubject = (id: string, name: string) => {
    Alert.alert(
      "Supprimer la personnalisation",
      `Voulez-vous supprimer définitivement "${name}" ?`,
      [
        { text: t("CANCEL_BTN"), style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            const currentSubjects = { ...account?.customisation?.subjects };

            const cleanedSubjects = Object.keys(currentSubjects)
              .filter(key => key !== id && key !== name)
              .reduce((obj, key) => {
                obj[key] = currentSubjects[key];
                return obj;
              }, {} as any);

            store.setSubjects(cleanedSubjects);

            setTimeout(() => {
              store.setSubjects(cleanedSubjects);
            }, 100);
          },
        },
      ]
    );
  };

  function renderItem(emoji: string, name: string, id: string, color: string) {
    return (
      <Item key={id}>
        <Leading>
          <Stack
            backgroundColor={color + "20"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography style={{ fontSize: 25, lineHeight: 32 }}>
              {emoji}
            </Typography>
          </Stack>
        </Leading>
        <Typography variant={"title"}>
          {name}
        </Typography>
        <Trailing>
          <AnimatedPressable
            onPress={() => {
              router.push({
                pathname: "/(settings)/edit_subject",
                params: { id, emoji, color, name }
              })
            }}
            onLongPress={() => deleteSubject(id, name)}
            style={{
              borderRadius: 20,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 8,
              paddingRight: 10,
              height: 35,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 5,
            }}
          >
            <Papicons name={"PenAlt"} color={colors.text + "7F"} />
            <Typography color={"secondary"}>
              Modifier
            </Typography>
          </AnimatedPressable>
        </Trailing>
      </Item>
    )
  }

  return (
    <>
      <NativeHeaderSide side="Right">
        <NativeHeaderPressable onPress={() => resetAllSubjects()}>
          <Icon>
            <Trash2 size={24} color={colors.notification} />
          </Icon>
        </NativeHeaderPressable>
      </NativeHeaderSide>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        contentInsetAdjustmentBehavior={"always"}
      >
        {subjects.length > 0 ? (
          <List>
            {subjects.map(item => renderItem(item.emoji, item.name, item.id, item.color))}
          </List>
        ) : (
          <Stack hAlign="center" vAlign="center" margin={16} gap={16}>
            <View style={{ alignItems: "center" }}>
              <Icon papicon opacity={0.5} size={32} style={{ marginBottom: 3 }}>
                <Papicons name={"Card"} />
              </Icon>
              <Typography variant="h4" color="text" align="center">
                {t("Settings_Subjects_None_Title")}
              </Typography>
              <Typography variant="body2" color="secondary" align="center">
                {t("Settings_Subjects_None_Description")}
              </Typography>
            </View>
          </Stack>
        )}
      </ScrollView>
    </>
  );
};