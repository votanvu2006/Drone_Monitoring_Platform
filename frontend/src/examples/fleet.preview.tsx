import type { ExampleDefinition } from '../app/examples';
import DroneFleetView from '../features/drones/DroneFleetView';

const fleetExample = {
  id: 'drones', title: 'Drones', activeNav: 'Drones', component: DroneFleetView,
  contentHasMain: true,
} satisfies ExampleDefinition;
export default fleetExample;
