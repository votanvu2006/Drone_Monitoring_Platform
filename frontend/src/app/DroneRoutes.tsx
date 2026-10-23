import { useNavigate, useParams } from 'react-router';
import DroneInventoryPage from '../features/drones/inventory/DroneInventoryPage';
import DroneDetailPage from '../features/drones/detail/DroneDetailPage';

export function DroneInventoryRoute() {
  const navigate = useNavigate();
  return <DroneInventoryPage onViewDetails={code => navigate('/drones/' + encodeURIComponent(code))} />;
}
export function DroneDetailRoute() {
  const { droneCode = '' } = useParams();
  const navigate = useNavigate();
  return <DroneDetailPage droneCode={droneCode} onBack={() => navigate('/drones')} />;
}
