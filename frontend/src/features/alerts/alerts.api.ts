import { getAllApiPages } from '../../lib/api';
import { buildAlertView, compareAlertPriority, type AlertRecord, type AlertViewModel } from './alerts.data';

type AlertResponse = {
  alert_code: string; title: string; drone_code: string; mission_code: string;
  message: string; severity: AlertRecord['severity']; source_group: AlertRecord['sourceGroup'];
  detected_at: string; resolution_note: string | null;
};

export async function loadAlerts(droneCode?: string, missionCode?: string): Promise<AlertViewModel[]> {
  const params = new URLSearchParams();
  if (droneCode) params.set('droneCode', droneCode);
  if (missionCode) params.set('missionCode', missionCode);
  const query = params.toString();
  const rows = await getAllApiPages<AlertResponse>('/alerts' + (query ? '?' + query : ''));
  return rows.map(row => buildAlertView({
    alertCode: row.alert_code, title: row.title, droneCode: row.drone_code,
    missionCode: row.mission_code, problemDescription: row.message,
    severity: row.severity, sourceGroup: row.source_group,
    detectedAt: row.detected_at, resolutionNote: row.resolution_note,
  })).sort(compareAlertPriority);
}
