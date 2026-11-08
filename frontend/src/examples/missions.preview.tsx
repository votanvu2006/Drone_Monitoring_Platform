import type { ExampleDefinition } from '../app/examples';
import MissionListPage from '../features/missions/list/MissionListPage';

const missionsExample = {
  id: 'missions',
  title: 'Missions',
  activeNav: 'Missions',
  component: () => <MissionListPage />,
  contentHasMain: true,
} satisfies ExampleDefinition;

export default missionsExample;
