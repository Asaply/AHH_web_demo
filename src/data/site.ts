import propertiesJson from '../content/properties.json';
import projectsJson from '../content/projects.json';
import settingsJson from '../content/settings.json';
import servicesJson from '../content/services.json';
import {
  categoryLabels,
  photoUrl,
  projectsSchema,
  propertiesSchema,
  servicesSchema,
  settingsSchema,
  statusLabel,
  type Project as ProjectData,
  type Property,
} from '../lib/schema';

export type { Property, PropertyStatus, Service } from '../lib/schema';
export { statusLabel };

/* El contenido editable vive en src/content/*.json y lo mantiene el panel
   /admin. Se valida aquí, al compilar: un JSON inválido rompe el build y
   Vercel sigue sirviendo la versión anterior. */
const settings = settingsSchema.parse(settingsJson);

export const brand = settings.brand;

/* Vacío mientras el cliente no entregue número: los CTA de WhatsApp y teléfono
   se ocultan solos. */
const phoneDigits = settings.contact.phoneDigits;

export const contact = {
  phone: phoneDigits ? phoneDigits.replace(/^52(\d{3})(\d{3})(\d{4})$/, '($1) $2 $3') : '',
  phoneHref: phoneDigits ? `tel:+${phoneDigits}` : '',
  whatsapp: phoneDigits ? `https://wa.me/${phoneDigits}` : '',
  hasPhone: Boolean(phoneDigits),
  street: settings.contact.street,
  colonia: settings.contact.colonia,
  city: settings.contact.city,
  coverage: settings.contact.coverage,
  hours: settings.contact.hours,
};

/* El cuestionario de marca pide no publicar correo ("¿Cuentan con algún correo
   de contacto que quieran mostrar públicamente? No") y aún no existe Instagram.
   Ningún componente lo pinta todavía, por eso no está en el panel. */
export const socials: { label: string; icon: string; href: string }[] = [];

export const services = servicesSchema.parse(servicesJson);

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

/* Datos de las fichas comerciales del cliente. Las ocultas desde el panel no
   generan página ni tarjeta. Los campos USO INTERNO de las fichas (precio
   mínimo, gravamen, observaciones) no existen en el schema. */
export const properties: Property[] = propertiesSchema.parse(propertiesJson).filter(p => !p.hidden);

export const photo = (p: Property, i = 1, small = false) => {
  const name = p.photos[i - 1];
  return name ? photoUrl(p.photoDir, name, small) : '';
};

/* El teléfono que la ficha da para agendar visitas. El número general del
   sitio (contact.phone) sigue pendiente; este es el de quien enseña las casas. */
export const visitsWhatsapp = settings.contact.visitsWhatsapp;

export type Project = ProjectData & { categoryLabel: string; href?: string };

/* Fotos profesionales del cliente (Drive › Fotografia). La liga "En venta"
   solo aparece si la propiedad sigue publicada. */
export const projects: Project[] = projectsSchema.parse(projectsJson).map(p => ({
  ...p,
  categoryLabel: categoryLabels[p.category],
  href: p.property && properties.some(x => x.slug === p.property) ? `/propiedades/${p.property}` : undefined,
}));

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
