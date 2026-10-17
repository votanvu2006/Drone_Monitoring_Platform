import type { ExampleDefinition } from '../../app/examples';
import { AlertsPage } from './AlertsPage';

export default {
  id: 'alerts', title: 'Alerts', activeNav: 'Alerts', component: AlertsPage,
  states: ['list', 'detail-active', 'detail-resolved'],
} satisfies ExampleDefinition;
