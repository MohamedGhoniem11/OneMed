import { describe, it, expect } from 'vitest';
import { navByRole, roleHome, searchTarget, roleLabelKey, navItemsFor } from './nav';

describe('role navigation map', () => {
  it('covers all six roles with unique in-app routes', () => {
    expect(Object.keys(navByRole).sort()).toEqual(['admin','doctor','hospital_admin','lab_staff','patient','pharmacy']);
    for (const [role, items] of Object.entries(navByRole)) {
      const paths = items.map(i => i.to);
      expect(new Set(paths).size).toBe(paths.length);
      expect(paths.every(p => p.startsWith('/app'))).toBe(true);
      expect(roleHome[role as keyof typeof roleHome]).toMatch(/^\/app/);
      expect(searchTarget[role as keyof typeof searchTarget]).toMatch(/^\/app/);
    }
  });

  it('adds a shared notifications route once for quick navigation', () => {
    const items = navItemsFor('patient');
    expect(items.filter(i => i.to === '/app/notifications')).toHaveLength(1);
    expect(roleLabelKey('lab_staff')).toBe('labStaff');
  });
});
