import type { ExampleDefinition } from '../app/examples';
import DroneFleetView from '../features/drones/DroneFleetView';

export default {
  id: 'drones', title: 'Drones', activeNav: 'Drones', component: DroneFleetView,
  contentHasMain: true,
} satisfies ExampleDefinition;
