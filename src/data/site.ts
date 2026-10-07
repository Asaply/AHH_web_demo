export const brand = {
  name: 'AHH Construcción y Remodelación',
  slogan: 'Construimos calidad, transformamos espacios.',
  yearsOfExperience: 10,
};

/* PENDIENTE — el cliente aún no entregó su número. El que traía el sitio
   (614 123 4567) era inventado y se retiró; los CTA de WhatsApp y teléfono
   se ocultan solos mientras esto siga vacío. */
const phoneDigits = '';

export const contact = {
  phone: phoneDigits ? phoneDigits.replace(/^52(\d{3})(\d{3})(\d{4})$/, '($1) $2 $3') : '',
  phoneHref: phoneDigits ? `tel:+${phoneDigits}` : '',
  whatsapp: phoneDigits ? `https://wa.me/${phoneDigits}` : '',
  hasPhone: Boolean(phoneDigits),
  street: 'Calle 33 #1902',
  colonia: 'Col. Altavista',
  city: 'Chihuahua, Chihuahua, México',
  coverage: 'Chihuahua y todo el estado',
  hours: 'Abierto las 24 horas, todos los días',
};

/* El cuestionario de marca pide no publicar correo ("¿Cuentan con algún correo
   de contacto que quieran mostrar públicamente? No") y aún no existe Instagram. */
export const socials: { label: string; icon: string; href: string }[] = [];

export type Service = {
  num: string;
  slug: string;
  title: string;
  summary: string;
  short: string;
  points: string[];
  image: string;
  icon: 'home' | 'brush' | 'blueprint' | 'helmet';
};

export const services: Service[] = [
  {
    num: '01',
    slug: 'construccion',
    title: 'Construcción',
    summary: 'Obra nueva residencial y comercial, de la limpieza del terreno a la entrega.',
    short: 'Obra nueva residencial y comercial, de principio a fin.',
    points: ['Preliminares y movimiento de tierra', 'Cimentación y acero de refuerzo', 'Estructura, cimbra y losas', 'Albañilería y cerramientos'],
    image: '/img/servicio-construccion.jpg',
    icon: 'home',
  },
  {
    num: '02',
    slug: 'remodelacion',
    title: 'Remodelación',
    summary: 'Cocinas, baños e interiores completos, con acabados de proveedores reconocidos.',
    short: 'Cocinas, baños e interiores con acabados de calidad.',
    points: ['Cocinas integrales y baños', 'Pisos, recubrimientos y pintura', 'Carpintería, cancelería y tablaroca', 'Yeso y acabados finos'],
    image: '/img/servicio-remodelacion.jpg',
    icon: 'brush',
  },
  {
    num: '03',
    slug: 'ampliaciones',
    title: 'Ampliaciones',
    summary: 'El trabajo que más realizamos: crecer tu casa sin mudarte de ella.',
    short: 'Crecer tu casa sin tener que mudarte.',
    points: ['Cuartos y niveles adicionales', 'Estructura y losas nuevas', 'Techumbres y cubiertas', 'Terrazas, cocheras y exteriores'],
    image: '/img/servicio-ampliaciones.jpg',
    icon: 'blueprint',
  },
  {
    num: '04',
    slug: 'mantenimiento',
    title: 'Mantenimiento y reparaciones',
    summary: 'Filtraciones, humedad, instalaciones y todo lo que una obra necesita después.',
    short: 'Filtraciones, humedad, instalaciones y reparaciones.',
    points: ['Impermeabilización y filtraciones', 'Reparación de grietas y humedad', 'Plomería e instalación eléctrica', 'Mantenimiento general de inmuebles'],
    image: '/img/servicio-mantenimiento.jpg',
    icon: 'helmet',
  },
];

/* Catálogo completo entregado por el cliente. Los cuatro servicios de arriba son
   la puerta de entrada; esto es el alcance real, y se muestra en acordeón. */
export const catalog: { num: string; title: string; items: string[] }[] = [
  {
    num: '01',
    title: 'Preliminares y demoliciones',
    items: ['Limpieza de terreno', 'Trazo y nivelación', 'Despalme de terreno', 'Deshierbe', 'Demolición de muros', 'Demolición de pisos', 'Demolición de losas', 'Demolición de elementos de concreto', 'Retiro de escombro', 'Carga y acarreo de escombro', 'Excavación manual', 'Excavación con maquinaria', 'Relleno y compactación', 'Acarreo de materiales'],
  },
  {
    num: '02',
    title: 'Cimentación',
    items: ['Excavación para zapatas', 'Excavación para cimentación corrida', 'Plantilla de concreto', 'Zapata aislada', 'Zapata corrida', 'Zapata combinada', 'Dados de cimentación', 'Contratrabes', 'Cadenas de desplante', 'Muro de cimentación', 'Relleno de cepas', 'Impermeabilización de cimentación'],
  },
  {
    num: '03',
    title: 'Acero de refuerzo',
    items: ['Habilitado de varilla', 'Corte de varilla', 'Doblado de varilla', 'Armado de zapatas', 'Armado de columnas', 'Armado de trabes', 'Armado de cadenas', 'Armado de losas', 'Colocación de malla electrosoldada', 'Colocación de Armex', 'Colocación de estribos', 'Anclajes', 'Soldadura estructural'],
  },
  {
    num: '04',
    title: 'Cimbra',
    items: ['Cimbra para zapatas', 'Cimbra para columnas', 'Cimbra para castillos', 'Cimbra para trabes', 'Cimbra para cadenas', 'Cimbra para losas', 'Cimbra para escaleras', 'Descimbrado', 'Apuntalamiento'],
  },
  {
    num: '05',
    title: 'Estructura',
    items: ['Castillos de concreto armado', 'Columnas de concreto armado', 'Trabes', 'Cadenas de desplante', 'Cadenas de cerramiento', 'Losas macizas', 'Losas aligeradas', 'Losas con casetón', 'Losas de vigueta y bovedilla', 'Losas de concreto', 'Firmes de concreto', 'Pisos de concreto', 'Rampas de concreto'],
  },
  {
    num: '06',
    title: 'Albañilería',
    items: ['Muro de block', 'Muro de ladrillo', 'Muro de tabique', 'Levantamiento de muros', 'Junteo de block', 'Aplanado de cemento-arena', 'Aplanado fino', 'Zarpeo', 'Emboquillado', 'Resanes', 'Reparación de grietas', 'Cerramiento de vanos', 'Apertura de vanos', 'Tapado de puertas', 'Tapado de ventanas'],
  },
  {
    num: '07',
    title: 'Impermeabilización',
    items: ['Limpieza de azotea', 'Impermeabilización de losa', 'Impermeabilización acrílica', 'Impermeabilización prefabricada', 'Sellado de grietas', 'Tratamiento de juntas', 'Calafateo', 'Reparación de filtraciones', 'Aplicación de impermeabilizante', 'Impermeabilización de cimentación'],
  },
  {
    num: '08',
    title: 'Yeso y acabados',
    items: ['Aplicación de yeso', 'Yeso en muros', 'Boquillas', 'Esquineros', 'Resanes con yeso', 'Afinado de muros', 'Afinado de plafones', 'Pasta texturizada', 'Texturizado', 'Acabado fino', 'Acabado rústico'],
  },
  {
    num: '09',
    title: 'Pisos y recubrimientos',
    items: ['Colocación de piso cerámico', 'Colocación de porcelanato', 'Colocación de azulejo', 'Colocación de loseta', 'Colocación de zoclo', 'Preparación de superficie', 'Nivelación de piso', 'Adhesivo para piso', 'Boquilla', 'Desbaste', 'Pulido de concreto', 'Piso epóxico', 'Piso de concreto estampado'],
  },
  {
    num: '10',
    title: 'Pintura',
    items: ['Preparación de superficies', 'Sellador', 'Pintura vinílica', 'Pintura acrílica', 'Pintura exterior', 'Pintura interior', 'Pintura de plafones', 'Pintura de herrería', 'Pintura de puertas', 'Pintura de madera', 'Esmalte', 'Barniz', 'Resane y pintura', 'Aplicación de textura'],
  },
  {
    num: '11',
    title: 'Plomería y fontanería',
    items: ['Instalación de tubería hidráulica', 'Instalación de tubería sanitaria', 'Instalación de PVC', 'Instalación de CPVC', 'Instalación de PPR', 'Instalación de cobre', 'Instalación de drenaje', 'Colocación de registros', 'Colocación de coladeras', 'Instalación de muebles sanitarios', 'Instalación de lavabo', 'Instalación de fregadero', 'Instalación de WC', 'Instalación de regadera', 'Instalación de boiler', 'Instalación de tinaco', 'Instalación de bomba', 'Instalación de llaves y mezcladoras', 'Reparación de fugas', 'Destape de drenajes'],
  },
  {
    num: '12',
    title: 'Instalación eléctrica',
    items: ['Canalización', 'Colocación de tubería conduit', 'Cableado', 'Instalación de centros de carga', 'Instalación de pastillas termomagnéticas', 'Instalación de contactos', 'Instalación de apagadores', 'Instalación de luminarias', 'Instalación de lámparas', 'Instalación de ventiladores', 'Instalación de tierra física', 'Instalación de salidas eléctricas', 'Instalación de medidores', 'Reparación eléctrica', 'Mantenimiento eléctrico'],
  },
  {
    num: '13',
    title: 'Carpintería',
    items: ['Fabricación de puertas', 'Instalación de puertas', 'Closets', 'Cocinas integrales', 'Muebles de baño', 'Muebles de madera', 'Repisas', 'Pergolados', 'Marcos', 'Zoclos de madera', 'Reparación de carpintería'],
  },
  {
    num: '14',
    title: 'Herrería',
    items: ['Fabricación de puertas metálicas', 'Fabricación de ventanas', 'Protecciones', 'Barandales', 'Pasamanos', 'Rejas', 'Portones', 'Estructuras metálicas', 'Escaleras metálicas', 'Techumbres', 'Pergolados metálicos', 'Soldadura', 'Pintura de herrería'],
  },
  {
    num: '15',
    title: 'Cancelería y vidrio',
    items: ['Ventanas de aluminio', 'Puertas de aluminio', 'Puertas corredizas', 'Canceles de baño', 'Canceles de vidrio templado', 'Espejos', 'Vidrio sencillo', 'Vidrio templado', 'Mosquiteros', 'Reparación de cancelería'],
  },
  {
    num: '16',
    title: 'Tablaroca y sistemas ligeros',
    items: ['Muros de tablaroca', 'Plafones', 'Cajillos', 'Nichos', 'Muros divisorios', 'Falsos plafones', 'Aislamiento térmico y acústico', 'Reparación de tablaroca', 'Pintura de tablaroca'],
  },
  {
    num: '17',
    title: 'Cocinas y baños',
    items: ['Demolición de cocina', 'Construcción de cocina', 'Barra de cocina', 'Cubiertas', 'Instalación de tarja', 'Instalación de muebles', 'Remodelación de baño', 'Regadera', 'Nichos', 'Cancel de baño', 'Muebles de baño', 'Accesorios', 'Impermeabilización de baño'],
  },
  {
    num: '18',
    title: 'Exteriores',
    items: ['Banquetas', 'Andadores', 'Cocheras', 'Patios', 'Terrazas', 'Rampas', 'Pisos exteriores', 'Muros perimetrales', 'Bardas', 'Portones', 'Rejas', 'Jardinería', 'Preparación de terreno', 'Instalación de riego', 'Pozas para árboles', 'Limpieza de canales de riego'],
  },
  {
    num: '19',
    title: 'Techumbres',
    items: ['Estructura metálica', 'Lámina galvanizada', 'Lámina aislada', 'Policarbonato', 'Techo de lámina', 'Cubiertas', 'Impermeabilización', 'Aislamiento térmico', 'Canalones', 'Bajantes pluviales'],
  },
  {
    num: '20',
    title: 'Mantenimiento y reparaciones',
    items: ['Mantenimiento general', 'Reparación de muros', 'Reparación de losas', 'Reparación de grietas', 'Reparación de humedad', 'Reparación de filtraciones', 'Reparación de pisos', 'Reparación de instalaciones hidráulicas', 'Reparación de instalaciones sanitarias', 'Reparación eléctrica', 'Mantenimiento de pintura', 'Mantenimiento de impermeabilización', 'Mantenimiento de herrería', 'Mantenimiento de puertas y ventanas'],
  },
];

export type PropertyStatus = 'disponible' | 'apartado' | 'vendido';

export type Property = {
  slug: string;
  name: string;
  kind: 'casa' | 'terreno';
  status: PropertyStatus;
  location: string;
  /* Solo se publica la dirección cuando la ficha la trae y la propiedad sigue
     a la venta; la de una casa vendida ya es de otra familia. */
  address?: string;
  mapUrl?: string;
  price: string;
  summary: string;
  landArea: number;
  builtArea?: number;
  beds?: number;
  baths?: number;
  floors?: number;
  parking?: number;
  /* Medidas tal como vienen en la ficha: algunos terrenos son irregulares. */
  frontage?: string;
  depth?: string;
  distribution: { floor: string; rooms: string[] }[];
  highlights: string[];
  finishes: { label: string; value: string }[];
  terms: { label: string; value: string }[];
  /* Carpeta en /img con 01.jpg, 01-sm.jpg, … Cero fotos = marcador. */
  photoDir?: string;
  photoCount: number;
};

/* Datos de las fichas comerciales que llenó el cliente (Downloads/…/AHH_Ficha_*.docx).
   Los campos marcados USO INTERNO (precio mínimo, gravamen, observaciones) no
   se publican. */
const brickHighlights = [
  'Construcción 100% de ladrillo rojo, térmica',
  'Losa sólida de concreto',
  'Alumbrado inteligente compatible con Alexa y Google',
];

const houseTerms = [
  { label: 'Crédito', value: 'Se acepta todo tipo de crédito bancario' },
  { label: 'Permuta', value: 'Se acepta intercambio' },
  { label: 'Trato', value: 'Directo con el constructor' },
  { label: 'Visitas', value: 'Con cita, cualquier día y hora (1 día de anticipación)' },
];

export const properties: Property[] = [
  {
    slug: 'casa-cittanova-1',
    name: 'Casa en Cittanova I',
    kind: 'casa',
    status: 'disponible',
    location: 'Fracc. Cittanova I, Chihuahua',
    mapUrl: 'https://maps.apple/p/rwbSnzztpsU.FT',
    price: '$2,390,000 MXN',
    summary: 'Casa de dos plantas con tres recámaras, estancia y cochera para dos autos, construida 100% en ladrillo rojo.',
    landArea: 127.05,
    builtArea: 118.13,
    beds: 3,
    baths: 2.5,
    floors: 2,
    parking: 2,
    distribution: [
      { floor: 'Planta baja', rooms: ['Sala', 'Comedor', 'Cocina', 'Medio baño', 'Patio'] },
      { floor: 'Planta alta', rooms: ['3 recámaras con clóset', '2 baños completos'] },
      { floor: 'Además', rooms: ['Estancia', 'Lavandería', 'Cochera para 2 autos'] },
    ],
    highlights: brickHighlights,
    finishes: [
      { label: 'Pisos', value: 'Porcelanato de 60 × 60' },
      { label: 'Carpintería', value: 'Clóset en cada recámara y muebles de baño' },
      { label: 'Ventanería', value: 'Aluminio con vidrio doble' },
      { label: 'Clima', value: 'Ductos para unidad paquete' },
      { label: 'Agua', value: 'Tinaco de 1,100 litros' },
      { label: 'Exterior', value: 'Barda perimetral' },
    ],
    terms: houseTerms,
    photoDir: '/img/propiedades/cittanova-1',
    photoCount: 10,
  },
  {
    slug: 'casa-alleza-boreal',
    name: 'Casa Alleza Boreal',
    kind: 'casa',
    status: 'disponible',
    location: 'Fracc. Cittanova I, Chihuahua',
    mapUrl: 'https://maps.apple/p/XBcmqQB_FgEZ9H',
    price: '$2,400,000 MXN',
    summary: 'Casa de dos plantas en lote de 7 × 17.15 m, con tres recámaras, estancia y cochera para dos autos.',
    landArea: 120.05,
    builtArea: 100.71,
    beds: 3,
    baths: 2.5,
    floors: 2,
    parking: 2,
    frontage: '7 m',
    depth: '17.15 m',
    distribution: [
      { floor: 'Espacios', rooms: ['Sala', 'Comedor', 'Cocina', 'Estancia', '3 recámaras con clóset', '2 baños completos y medio baño', 'Lavandería', 'Patio', 'Cochera para 2 autos'] },
    ],
    highlights: brickHighlights,
    finishes: [
      { label: 'Pisos', value: 'Porcelanato de 60 × 60' },
      { label: 'Carpintería', value: 'Clóset en cada recámara y muebles de baño' },
      { label: 'Ventanería', value: 'Aluminio con vidrio doble' },
      { label: 'Clima', value: 'Ductos para unidad paquete' },
      { label: 'Agua', value: 'Tinaco de 1,100 litros' },
      { label: 'Exterior', value: 'Barda perimetral' },
    ],
    terms: houseTerms,
    photoCount: 0,
  },
  {
    slug: 'terreno-homero',
    name: 'Terreno en Av. Homero',
    kind: 'terreno',
    status: 'disponible',
    location: 'Col. Francisco Domínguez, Chihuahua',
    address: 'Av. Homero 12900, Col. Francisco Domínguez, Chihuahua, Chih.',
    mapUrl: 'https://maps.apple/p/g4QLF_HDq5ZfSJ',
    price: '$9,500,000 MXN',
    summary: 'Terreno de 2,432 m² sobre Av. Homero, con uso de suelo mixto, servicios y barda. Listo para escriturar y entrega inmediata.',
    landArea: 2432,
    frontage: '75 m en curva',
    depth: '64.40 m y 80 m',
    distribution: [],
    highlights: [
      'Uso de suelo mixto',
      'Frente de 75 m sobre Av. Homero',
      'Listo para escriturar, entrega inmediata',
    ],
    finishes: [
      { label: 'Uso de suelo', value: 'Mixto' },
      { label: 'Servicios', value: 'Agua, luz y drenaje' },
      { label: 'Mejoras', value: 'Barda y cercado' },
      { label: 'Vigilancia', value: 'Velador en sitio' },
    ],
    terms: [
      { label: 'Crédito', value: 'Se acepta todo tipo de crédito' },
      { label: 'Permuta', value: 'Se acepta intercambio' },
      { label: 'Escrituración', value: 'Lista para escriturar' },
      { label: 'Entrega', value: 'Inmediata' },
      { label: 'Visitas', value: 'Con 1 día de anticipación' },
    ],
    photoCount: 0,
  },
  {
    slug: 'casa-los-leones-etapa-4',
    name: 'Casa en Los Leones IV',
    kind: 'casa',
    status: 'vendido',
    location: 'Residencial Los Leones, etapa 4, Chihuahua',
    price: '$4,300,000 MXN',
    summary: 'Casa de una sola planta en terreno de 450 m², con recámara principal con vestidor y cisterna de 5,000 litros.',
    landArea: 450,
    builtArea: 235,
    beds: 3,
    baths: 2.5,
    floors: 1,
    parking: 4,
    frontage: '15 m',
    depth: '30 m',
    distribution: [
      { floor: 'Una sola planta', rooms: ['Sala', 'Comedor y cocina, muy amplios', 'Estancia', 'Recámara principal con vestidor, clóset y baño propio', '2 recámaras secundarias con clóset', 'Baño completo y medio baño', 'Lavandería con opción a cuarto de blancos', 'Patio amplio', 'Cochera'] },
    ],
    highlights: brickHighlights,
    finishes: [
      { label: 'Pisos', value: 'Porcelanato de 120 × 60' },
      { label: 'Carpintería', value: 'Puerta principal, puertas interiores, marcos, zoclo y clóset en las 3 recámaras' },
      { label: 'Baños', value: 'Muebles con cubierta de mármol' },
      { label: 'Ventanería', value: 'Aluminio con vidrio doble' },
      { label: 'Clima', value: 'Ductos para unidad paquete y preparación para minisplit' },
      { label: 'Agua', value: 'Cisterna de 5,000 litros' },
    ],
    terms: houseTerms,
    photoDir: '/img/propiedades/leones-etapa-4',
    photoCount: 19,
  },
];

export const statusLabel: Record<PropertyStatus, string> = {
  disponible: 'En venta',
  apartado: 'Apartada',
  vendido: 'Vendida',
};

export const photo = (p: Property, i = 1, small = false) =>
  p.photoDir && p.photoCount ? `${p.photoDir}/${String(i).padStart(2, '0')}${small ? '-sm' : ''}.jpg` : '';

/* El teléfono que la ficha da para agendar visitas. El número general del
   sitio (contact.phone) sigue pendiente; este es el de quien enseña las casas. */
export const visitsWhatsapp = '526145771685';

export type Project = {
  slug: string;
  name: string;
  category: 'residencial' | 'comercial' | 'remodelacion';
  categoryLabel: string;
  location: string;
  image: string;
};

/* Fotos profesionales del cliente (Downloads/Fotografia). */
export const projects: Project[] = [
  { slug: 'los-leones-1', name: 'Residencia Los Leones I', category: 'residencial', categoryLabel: 'Residencial', location: 'Residencial Los Leones, Chihuahua', image: '/img/proyectos/los-leones/01-sm.jpg' },
  { slug: 'los-leones-2', name: 'Residencia Los Leones II', category: 'residencial', categoryLabel: 'Residencial', location: 'Residencial Los Leones, Chihuahua', image: '/img/propiedades/leones-etapa-4/01-sm.jpg' },
  { slug: 'reliz', name: 'Casa Reliz', category: 'residencial', categoryLabel: 'Residencial', location: 'Chihuahua', image: '/img/proyectos/reliz/01-sm.jpg' },
];

/* Los cuatro pilares del manual de marca. */
export const values = [
  { title: 'Calidad', text: 'Materiales y proveedores reconocidos, con garantías respaldadas.', icon: 'badge' },
  { title: 'Confianza', text: 'Trato directo y condiciones claras desde la primera visita.', icon: 'shield' },
  { title: 'Solidez', text: 'Obra bien hecha, con procesos y supervisión en cada etapa.', icon: 'buildings' },
  { title: 'Experiencia', text: `${brand.yearsOfExperience} años construyendo y remodelando en Chihuahua.`, icon: 'clock' },
];

export const process = [
  { num: '01', title: 'Solicitas tu cotización', text: 'Agendamos una visita a tu domicilio para ver el proyecto en sitio.', icon: 'chat' },
  { num: '02', title: 'Elaboramos el presupuesto', text: 'Te entregamos la cotización con el alcance y los tiempos por escrito.', icon: 'quote' },
  { num: '03', title: 'Arrancamos la obra', text: 'Con el anticipo acordado iniciamos en un máximo de 3 días hábiles.', icon: 'helmet' },
  { num: '04', title: 'Entregamos tu proyecto', text: 'Cerramos en el tiempo pactado, con la garantía que corresponda.', icon: 'check' },
];

export const features = [
  { title: 'Visita a domicilio', text: 'Vamos a ver tu proyecto antes de cotizar', icon: 'pin' },
  { title: 'Cotización a tu medida', text: 'Sin costo en proyectos pequeños', icon: 'quote' },
  { title: 'Garantía según proyecto', text: 'Respaldamos el trabajo que entregamos', icon: 'badge' },
  { title: 'Entrega en el tiempo acordado', text: 'Arrancamos en máximo 3 días', icon: 'calendar' },
];
