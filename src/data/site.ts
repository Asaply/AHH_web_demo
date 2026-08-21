export const contact = {
  phone: '(614) 123 4567',
  phoneHref: 'tel:+526141234567',
  email: 'contacto@ahhconstruccion.mx',
  whatsapp: 'https://wa.me/526141234567',
  city: 'Chihuahua, Chihuahua, México',
  zip: 'C.P. 31200',
  hours: 'Lunes a viernes de 9:00 a 18:00 hrs',
};

export type Service = {
  num: string;
  slug: string;
  title: string;
  summary: string;
  short: string;
  points: string[];
  image: string;
  icon: 'home' | 'brush' | 'buildings' | 'blueprint';
};

export const services: Service[] = [
  {
    num: '01',
    slug: 'construccion',
    title: 'Construcción',
    summary: 'Proyectos residenciales y comerciales de alta calidad, de principio a fin.',
    short: 'Proyectos residenciales de alta calidad, de principio a fin.',
    points: ['Planeación y proyecto arquitectónico', 'Gestión de permisos', 'Construcción llave en mano', 'Supervisión y control de calidad'],
    image: '/img/servicio-construccion.jpg',
    icon: 'home',
  },
  {
    num: '02',
    slug: 'remodelacion',
    title: 'Remodelación',
    summary: 'Transformamos espacios para que vivas mejor cada día.',
    short: 'Transformamos espacios para que vivas mejor.',
    points: ['Remodelación integral', 'Actualización de acabados', 'Ampliaciones y redistribución', 'Mejoras funcionales y estéticas'],
    image: '/img/servicio-remodelacion.jpg',
    icon: 'brush',
  },
  {
    num: '03',
    slug: 'desarrollo-inmobiliario',
    title: 'Desarrollo Inmobiliario',
    summary: 'Creamos comunidades y oportunidades de inversión con visión a futuro.',
    short: 'Creamos comunidades y oportunidades de inversión.',
    points: ['Análisis de viabilidad', 'Gestión y desarrollo de proyectos', 'Urbanización y edificación', 'Comercialización de propiedades'],
    image: '/img/servicio-desarrollo.jpg',
    icon: 'buildings',
  },
  {
    num: '04',
    slug: 'diseno-y-planificacion',
    title: 'Diseño y Planificación',
    summary: 'Planeación inteligente para proyectos funcionales, estéticos y rentables.',
    short: 'Planeación inteligente para proyectos funcionales y rentables.',
    points: ['Diseño arquitectónico', 'Renderizado 3D', 'Presupuestos y programación', 'Asesoría personalizada'],
    image: '/img/servicio-diseno.jpg',
    icon: 'blueprint',
  },
];

export type Property = {
  slug: string;
  name: string;
  location: string;
  zone: string;
  type: string;
  beds: number;
  baths: number;
  area: number;
  parking: number;
  price: string;
  image: string;
};

export const properties: Property[] = [
  {
    slug: 'residencia-cumbres',
    name: 'Residencia Cumbres',
    location: 'Cumbres II, Chihuahua',
    zone: 'cumbres',
    type: 'casa',
    beds: 3,
    baths: 3.5,
    area: 230,
    parking: 2,
    price: '$6,950,000 MXN',
    image: '/img/propiedad-cumbres.jpg',
  },
  {
    slug: 'residencia-cordillera',
    name: 'Residencia Cordillera',
    location: 'Cordillera Residencial, Chihuahua',
    zone: 'cordillera',
    type: 'casa',
    beds: 4,
    baths: 4.5,
    area: 280,
    parking: 2,
    price: '$8,750,000 MXN',
    image: '/img/propiedad-cordillera.jpg',
  },
  {
    slug: 'residencia-san-francisco',
    name: 'Residencia San Francisco',
    location: 'San Francisco, Chihuahua',
    zone: 'san-francisco',
    type: 'casa',
    beds: 3,
    baths: 3,
    area: 210,
    parking: 2,
    price: '$5,950,000 MXN',
    image: '/img/propiedad-san-francisco.jpg',
  },
];

export type Project = {
  slug: string;
  name: string;
  category: 'residencial' | 'comercial' | 'remodelacion' | 'desarrollo';
  categoryLabel: string;
  location: string;
  image: string;
};

export const projects: Project[] = [
  { slug: 'residencia-cumbres', name: 'Residencia Cumbres', category: 'residencial', categoryLabel: 'Residencial', location: 'Chihuahua, Chihuahua', image: '/img/proyecto-cumbres.jpg' },
  { slug: 'remodelacion-cocina', name: 'Remodelación Integral — Cocina', category: 'remodelacion', categoryLabel: 'Remodelación', location: 'Chihuahua, Chihuahua', image: '/img/proyecto-cocina.jpg' },
  { slug: 'plaza-el-encino', name: 'Plaza Comercial El Encino', category: 'comercial', categoryLabel: 'Comercial', location: 'Chihuahua, Chihuahua', image: '/img/proyecto-plaza.jpg' },
  { slug: 'remodelacion-sala', name: 'Remodelación Residencial — Sala', category: 'remodelacion', categoryLabel: 'Remodelación', location: 'Chihuahua, Chihuahua', image: '/img/proyecto-sala.jpg' },
  { slug: 'residencia-san-francisco', name: 'Residencia San Francisco', category: 'residencial', categoryLabel: 'Residencial', location: 'Chihuahua, Chihuahua', image: '/img/proyecto-san-francisco.jpg' },
  { slug: 'oficinas-corporativas', name: 'Oficinas Corporativas', category: 'comercial', categoryLabel: 'Comercial', location: 'Chihuahua, Chihuahua', image: '/img/proyecto-oficinas.jpg' },
];

export const stats = [
  { value: '+150', label: 'Proyectos realizados', icon: 'buildings' },
  { value: '+10', label: 'Años de experiencia', icon: 'home' },
  { value: '+100', label: 'Clientes satisfechos', icon: 'users' },
  { value: '+30', label: 'Especialistas en el equipo', icon: 'helmet' },
];

export const values = [
  { title: 'Calidad', text: 'Utilizamos materiales y procesos de la más alta calidad.', icon: 'badge' },
  { title: 'Compromiso', text: 'Cumplimos lo que prometemos, en tiempo y forma.', icon: 'handshake' },
  { title: 'Innovación', text: 'Diseñamos soluciones modernas y funcionales para cada proyecto.', icon: 'bulb' },
  { title: 'Confianza', text: 'Construimos relaciones de largo plazo basadas en transparencia.', icon: 'shield' },
  { title: 'Sustentabilidad', text: 'Creamos proyectos responsables con el entorno y el futuro.', icon: 'leaf' },
];

export const features = [
  { title: 'Asesoría personalizada', text: 'Atención dedicada a tus necesidades y objetivos', icon: 'chat' },
  { title: 'Cotización sin compromiso', text: 'Presupuestos claros y transparentes sin costo', icon: 'quote' },
  { title: 'Calidad garantizada', text: 'Materiales y procesos de primera calidad', icon: 'badge' },
  { title: 'Entrega en tiempo', text: 'Cumplimos con los plazos establecidos', icon: 'calendar' },
];
