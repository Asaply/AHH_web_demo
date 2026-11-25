import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import properties from './properties.json';
import projects from './projects.json';
import settings from './settings.json';
import services from './services.json';
import { projectsSchema, propertiesSchema, servicesSchema, settingsSchema } from '../lib/schema';

describe('contenido del repo', () => {
  it('pasa los schemas', () => {
    expect(() => propertiesSchema.parse(properties)).not.toThrow();
    expect(() => projectsSchema.parse(projects)).not.toThrow();
    expect(() => settingsSchema.parse(settings)).not.toThrow();
    expect(() => servicesSchema.parse(services)).not.toThrow();
  });

  it('las fotos listadas existen en public/', () => {
    for (const p of propertiesSchema.parse(properties)) {
      for (const name of p.photos) {
        expect(existsSync(`public${p.photoDir}/${name}.jpg`), `${p.slug}/${name}`).toBe(true);
        expect(existsSync(`public${p.photoDir}/${name}-sm.jpg`), `${p.slug}/${name}-sm`).toBe(true);
      }
    }
    for (const p of projectsSchema.parse(projects)) {
      if (p.image) expect(existsSync(`public${p.image}`), p.slug).toBe(true);
    }
  });
});
