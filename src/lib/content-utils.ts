import type { Project, PropertyStatus } from './schema';

/* Utilidades sin zod: los componentes del panel corren en el navegador y no
   deben cargar los schemas. */

export const statusLabel: Record<PropertyStatus, string> = {
  disponible: 'En venta',
  apartado: 'Apartada',
  vendido: 'Vendida',
};

export const categoryLabels: Record<Project['category'], string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  remodelacion: 'Remodelación',
};

export const photoUrl = (dir: string, name: string, small = false) => `${dir}/${name}${small ? '-sm' : ''}.jpg`;
