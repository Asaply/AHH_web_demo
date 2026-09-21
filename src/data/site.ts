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

export type Property = {
  slug: string;
  name: string;
  location: string;
  type: string;
  beds: number;
  baths: number;
  landArea: number;
  builtArea: number;
  price: string;
  note: string;
  distribution: { floor: string; rooms: string[] }[];
  image: string;
};

export const properties: Property[] = [
  {
    slug: 'casa-cittanova',
    name: 'Casa en Fraccionamiento Cittanova',
    location: 'Fracc. Cittanova, Chihuahua',
    type: 'casa',
    beds: 3,
    baths: 2.5,
    landArea: 127.05,
    builtArea: 118.13,
    price: '$2,390,000 MXN',
    note: 'Trato directo',
    distribution: [
      { floor: 'Planta baja', rooms: ['Sala', 'Comedor', 'Cocina', 'Medio baño', 'Patio'] },
      { floor: 'Planta alta', rooms: ['3 recámaras', '2 baños completos'] },
    ],
    image: '',
  },
];

export type Project = {
  slug: string;
  name: string;
  category: 'residencial' | 'comercial' | 'remodelacion';
  categoryLabel: string;
  location: string;
  image: string;
};

/* Las dos casas que el cliente señala como su mejor trabajo. Las fotos reales
   están pendientes de entrega: con `image` vacío la tarjeta usa el marcador
   de .media en vez de una foto de archivo que no es suya. */
export const projects: Project[] = [
  { slug: 'los-leones-1', name: 'Residencia Los Leones I', category: 'residencial', categoryLabel: 'Residencial', location: 'Residencial Los Leones, Chihuahua', image: '' },
  { slug: 'los-leones-2', name: 'Residencia Los Leones II', category: 'residencial', categoryLabel: 'Residencial', location: 'Residencial Los Leones, Chihuahua', image: '' },
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
