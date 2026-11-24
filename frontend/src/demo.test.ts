import { describe, it, expect, beforeEach } from 'vitest';
import { loadDB, resetDB } from './data/demo';
import i18n from './i18n';

describe('OneMed front-end demo data', () => {
  beforeEach(() => { resetDB(); });

  it('seeds all six roles and realistic patient data', () => {
    const db = loadDB();
    const roles = new Set(db.users.map(u => u.role));
    expect([...roles].sort()).toEqual(['admin','doctor','hospital_admin','lab_staff','patient','pharmacy']);
    expect(db.patients.length).toBeGreaterThanOrEqual(2);
    expect(db.patients[0].bloodGroup).toMatch(/^[ABO][+-]$/);
    expect(db.patients[0].allergies.length).toBeGreaterThan(0);
    expect(db.records.length).toBeGreaterThan(5);
    expect(db.guidelines.length).toBeGreaterThan(3);
  });

  it('keeps emergency privacy flags and QR tokens consistent', () => {
    const db = loadDB();
    for (const p of db.emergencyProfiles) {
      expect(p.token).toMatch(/^em-/);
      expect(db.patients.some(x => x.id === p.patientId)).toBe(true);
      expect(typeof p.settings.showBloodType).toBe('boolean');
    }
  });

  it('has bilingual translations for key screens', () => {
    expect(i18n.getResource('en','translation','dashboard')).toBe('Dashboard');
    expect(i18n.getResource('ar','translation','dashboard')).toBe('لوحة التحكم');
    expect(i18n.getResource('ar','translation','callEmergency')).toContain('١٢٣');
  });
});
