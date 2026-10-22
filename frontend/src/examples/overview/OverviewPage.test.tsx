import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { buildOverviewSnapshot, overviewSnapshot } from '../../features/overview/overview.data';
import { alertSeeds, droneSeeds, flightSeeds, missionSeeds } from '../../data/seeds';

function show() { window.history.replaceState({}, '', '/?screen=overview'); return render(<App />); }
describe('canonical overview dashboard', () => {
  it('renders all four summary totals from the complete seed', () => {
    show();
    for (const [name,value] of [['Fleet status','5'],['Mission status','20'],['Active flights','0'],['Open alerts','6']]) {
      expect(within(screen.getByRole('region',{name})).getByText(value,{exact:true})).toBeVisible();
    }
    expect(screen.getByText('0 available · 0 in flight · 5 offline')).toBeVisible();
  });
  it('shows the real empty active-flight state and deterministic seed activity', () => {
    show(); expect(screen.getByRole('region',{name:'Active flight'})).toHaveTextContent('No active flights');
    for (const event of overviewSnapshot.recentActivity) expect(screen.getByText(event.title)).toBeVisible();
    expect(overviewSnapshot.recentActivity).toHaveLength(5);
  });
  it('keeps preview content standalone and inert', () => {
    const fetchSpy=vi.spyOn(globalThis,'fetch'); show();
    fireEvent.click(screen.getByRole('region',{name:'Open alerts'}));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('handles active records with missing relationships and entirely empty data', () => {
    const snapshot=buildOverviewSnapshot({drones:[],missions:[],alerts:[],flights:[{...flightSeeds[0],status:'FLYING'}]});
    expect(snapshot.flights.total).toBe(1);
    expect(snapshot.activeFlight?.droneName).toBe('Aircraft not recorded');
    expect(buildOverviewSnapshot({drones:[],missions:[],alerts:[],flights:[]}).recentActivity).toEqual([]);
    expect(overviewSnapshot.alerts.total).toBe(alertSeeds.filter(alert=>alert.status==='ACTIVE').length);
    expect(overviewSnapshot.fleet.total).toBe(droneSeeds.length);
    expect(overviewSnapshot.missions.total).toBe(missionSeeds.length);
  });
});
