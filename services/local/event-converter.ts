import { Course as SharedCourse, CourseType } from '@/services/shared/timetable';
import { ICalEvent } from './ical';
import { parseADEDescription } from './parsers/ade-parser';
import { parseHyperplanningDescription, isHyperplanningDescription } from './parsers/hyperplanning-parser';

interface ConversionContext {
  icalId: string;
  icalTitle: string;
  isADE: boolean;
  isHyperplanning: boolean;
  intelligentParsing: boolean;
}

export function convertICalEventToSharedCourse(event: ICalEvent, context: ConversionContext): SharedCourse {
  let teacher = 'Inconnu';
  let group = 'Inconnu';
  let type = 'Activité';

  if (context.intelligentParsing && event.description) {
    if (context.isHyperplanning || isHyperplanningDescription(event.description)) {
      const parsed = parseHyperplanningDescription(event.description);
      if (parsed) {
        teacher = parsed.teacher || event.organizer || teacher;
        group = parsed.group || group;
        type = parsed.type || type;
      }
    } else if (context.isADE) {
      const parsed = parseADEDescription(event.description);
      if (parsed) {
        teacher = parsed.teacher || event.organizer || teacher;
        group = parsed.groups?.join(', ') || parsed.group || group;
        type = parsed.type || type;
      }
    }
  }

  return {
    id: event.uid,
    subject: (event.summary || 'Sans titre').trim(),
    type: CourseType.ACTIVITY,
    from: event.dtstart || new Date(),
    to: event.dtend || new Date((event.dtstart?.getTime() || Date.now()) + 3600000),
    additionalInfo: type !== 'Activité' ? type : (event.description || ''),
    room: event.location || 'N/A',
    teacher,
    group,
    backgroundColor: '#4CAF50',
    status: undefined,
    customStatus: context.icalTitle,
    url: '',
    createdByAccount: `ical_${context.icalId}`
  };
}

export function convertMultipleEvents(events: ICalEvent[], context: ConversionContext): SharedCourse[] {
  return events.map(event => convertICalEventToSharedCourse(event, context));
}