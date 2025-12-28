import { Course as SharedCourse } from '@/services/shared/timetable';
import { File, Directory, Paths } from 'expo-file-system';
import { parseICalString } from './parsers/ical-event-parser';
import { detectProvider } from './ical-utils';
import { getAllIcals, updateProviderIfUnknown } from './ical-database';
import { convertMultipleEvents } from './event-converter';
import { filterEventsByWeek } from './event-filter';

export interface ICalEvent {
  uid: string;
  summary?: string;
  description?: string;
  dtstart?: Date;
  dtend?: Date;
  location?: string;
  allday?: boolean;
  organizer?: string;
}

export interface ParsedICalData {
  events: ICalEvent[];
  calendarName?: string;
  isADE: boolean;
  isHyperplanning: boolean;
  provider?: string;
  url?: string;
}

const cacheDir = new Directory(Paths.cache, 'ical_cache');

const lastFetchTimes: Record<string, number> = {};

export async function fetchAndParseICal(url: string, icalId: string, forceRefresh = false): Promise<ParsedICalData> {
  if (!cacheDir.exists) cacheDir.create();
  const icalFile = new File(cacheDir, `${icalId}.ics`);
  let icalString: string | null = null;

  const now = Date.now();
  const lastFetch = lastFetchTimes[icalId] || 0;
  const shouldFetch = forceRefresh || (now - lastFetch > 300000);

  if (!shouldFetch && icalFile.exists) {
    icalString = icalFile.textSync();
  } 
  else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        icalString = await response.text();
        if (!icalFile.exists) icalFile.create();
        icalFile.write(icalString);
        lastFetchTimes[icalId] = now;
      }
    } catch (error) {
      console.log(`[iCal Service] Réseau indisponible ou timeout, fallback cache.`);
    }
  }

  if (!icalString && icalFile.exists) {
    icalString = icalFile.textSync();
  }

  if (!icalString) {
    throw new Error(`Aucune donnée disponible pour l'iCal ${icalId}`);
  }

  const { events, metadata } = parseICalString(icalString);
  const { isADE, isHyperplanning, provider } = detectProvider(metadata.prodId);

  return {
    events,
    calendarName: metadata.calendarName,
    isADE,
    isHyperplanning,
    provider,
    url
  };
}

export async function getICalEventsForWeek(weekStart: Date, weekEnd: Date, forceRefresh = false): Promise<SharedCourse[]> {
  const icals = await getAllIcals();
  const allEvents: SharedCourse[] = [];

  for (const ical of icals) {
    try {
      const parsedData = await fetchAndParseICal(ical.url, ical.id, forceRefresh);
      
      if (!ical.provider || ical.provider === 'unknown') {
        await updateProviderIfUnknown(ical, parsedData.provider || 'unknown');
      }

      const weekEvents = filterEventsByWeek(parsedData.events, weekStart, weekEnd);
      const convertedEvents = convertMultipleEvents(weekEvents, {
        icalId: ical.id,
        icalTitle: ical.title,
        isADE: parsedData.isADE,
        isHyperplanning: parsedData.isHyperplanning,
        intelligentParsing: (ical as any).intelligentParsing || false
      });

      allEvents.push(...convertedEvents);
    } catch (error) {
      console.error(`[iCal Service] Failed for "${ical.title}":`, error);
    }
  }

  return allEvents;
}