import type { ExampleDefinition } from '../../app/examples';
import { AlertsPreview } from './AlertsPreview';

const alertsPreview: ExampleDefinition = {
  id: 'alerts', title: 'Alerts', component: AlertsPreview, standalone: true,
  states: ['list', 'detail-active', 'detail-resolved', 'detail'],
};
export default alertsPreview;
