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

export async function fetchAndParseICal(url: string, icalId: string, forceRefresh = false): Promise<ParsedICalData> {
  try {
    if (!cacheDir.exists) {
      cacheDir.create();
    }

    const icalFile = new File(cacheDir, `${icalId}.ics`);
    let icalString: string;

    if (icalFile.exists && !forceRefresh) {
      icalString = icalFile.textSync(); 
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      icalString = await response.text();
      
      if (!icalFile.exists) {
        icalFile.create();
      }
      icalFile.write(icalString);
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
  } catch (error) {
    console.error(`[iCal Service] Error:`, error);
    throw error;
  }
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