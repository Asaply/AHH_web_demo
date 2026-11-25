import { projectsSchema, propertiesSchema, servicesSchema, settingsSchema } from './schema';

/* Lo único que el panel puede escribir, además de fotos. */
export const contentFiles = {
  properties: { path: 'src/content/properties.json', schema: propertiesSchema },
  projects: { path: 'src/content/projects.json', schema: projectsSchema },
  settings: { path: 'src/content/settings.json', schema: settingsSchema },
  services: { path: 'src/content/services.json', schema: servicesSchema },
} as const;

export type ContentName = keyof typeof contentFiles;

export const isContentName = (name: string): name is ContentName => Object.hasOwn(contentFiles, name);
