import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression, PathOptions } from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import type { FlightZone, Waypoint } from '../types/api';
import 'leaflet/dist/leaflet.css';

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const fallbackCenter: LatLngExpression = [0, 0];

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const key = positions.map((position) => position.join(',')).join(';');
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || !key) return;
    const coordinates = key.split(';').map((position) => position.split(',').map(Number) as [number, number]);
    if (coordinates.length > 1) map.fitBounds(coordinates, { padding: [42, 42], maxZoom: 14 });
    else if (coordinates[0]) map.setView(coordinates[0], Math.max(map.getZoom(), 12));
    initialized.current = true;
  }, [map, key]);
  return null;
}

export function MapView({ waypoints = [], zones = [], trail = [], current }: {
  waypoints?: Waypoint[];
  zones?: FlightZone[];
  trail?: [number, number][];
  current?: { latitude: number; longitude: number; heading?: number } | null;
}) {
  const route = waypoints.map((point) => [point.latitude, point.longitude] as [number, number]);
  const center = route[0] || (current ? [current.latitude, current.longitude] as LatLngExpression : fallbackCenter);
  const zoneCollection = useMemo(() => ({ type: 'FeatureCollection' as const, features: zones }), [zones]);
  const zoneStyle = (feature?: Feature): PathOptions => {
    const properties = feature?.properties as FlightZone['properties'] | undefined;
    const restricted = properties?.zoneType === 'RESTRICTED';
    return { color: restricted ? '#ff6b6b' : '#52d6ac', fillColor: restricted ? '#ff6b6b' : '#52d6ac', weight: 1.2, fillOpacity: 0.09, dashArray: restricted ? '5 5' : undefined };
  };

  return <div className="map-frame"><MapContainer center={center} zoom={12} scrollWheelZoom className="map-canvas">
    <TileLayer url={tileUrl} attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} />
    {zones.length > 0 && <GeoJSON key={`zones-${zones.length}`} data={zoneCollection as unknown as FeatureCollection} style={zoneStyle} />}
    {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#76e0bb', weight: 3, opacity: 0.9, dashArray: '7 7' }} />}
    {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#f6c65b', weight: 3, opacity: 0.95 }} />}
    {waypoints.map((point) => <CircleMarker key={point.id} center={[point.latitude, point.longitude]} radius={5} pathOptions={{ color: '#101617', weight: 2, fillColor: '#76e0bb', fillOpacity: 1 }}><Tooltip>{point.waypointType} · {point.sequenceNumber}</Tooltip></CircleMarker>)}
    {current && <CircleMarker center={[current.latitude, current.longitude]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#f6c65b', fillOpacity: 1 }}><Tooltip direction="top">Current position{current.heading != null ? ` · ${Math.round(current.heading)}°` : ''}</Tooltip></CircleMarker>}
    <FitRoute positions={route.length > 1 ? route : current ? [[current.latitude, current.longitude]] : trail.length ? [trail[0]!] : []} />
  </MapContainer><div className="map-legend"><span><i className="legend-route" /> Planned route</span><span><i className="legend-trail" /> Flight path</span><span><i className="legend-allowed" /> Allowed zone</span><span><i className="legend-zone" /> Restricted zone</span></div><div className="map-attribution">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></div></div>;
}
