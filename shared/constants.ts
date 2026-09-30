import type { ChatModel, ChatModelKey, Filters } from './types'

export const MODELS: ChatModel[] = [
  { key: 'gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite (Preview)', company: 'Google' },
  { key: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', company: 'Google' },
]
export const BASE_MODEL: ChatModelKey = MODELS[0]!.key

export const CHAT_CONFIG_COOKIE = 'app:chat-config'
export const THREAD_ID_COOKIE = 'app:thread_id'
export const DEFAULT_CHAT_CONFIG = { model: BASE_MODEL }

export const JOB_CATEGORIES = [
  'Abschlussarbeit',
  'Arbeitsstelle',
  'Ausbildung',
  'Berufseinstieg nach dem Studium',
  'Berufserfahrene',
  'DoktorandInnen',
  'Duales Studium',
  'MitgründerIn gesucht',
  'Nebenjob (fachfremd)',
  'Praktikum',
  'Traineeprogramm',
  'Werkstudierendenstelle und HiWi-Stellen',
] as const

export const JOB_TYPES = [
  'Festanstellung',
  'Befristet',
  'Freie Mitarbeit',
  'Minijob',
] as const

export const JOB_FIELDS = [
  'Agrartechnik',
  'Agrarwirtschaft, Landwirtschaft',
  'Banken, Finanzdienstleister, Versicherungen, Immobilien',
  'Bau, Vermessung, Gebäudetechnik und Architektur',
  'Big Data, Data Science, Business Intelligence, Wirtschaftsinformatik',
  'Bildungswesen, Lehrtätigkeit, Schule, Coaching, Training',
  'Bioingenieurw., Biotechnologie, Bioinformatik',
  'Chemie, Pharma, Biologie',
  'Datenbankentwicklung',
  'Druck, Medienproduktion',
  'Einkauf, Materialwirtschaft, Logistik, SCM, Qualitätswesen',
  'Energietechnik, Elektrotechnik, Energieerzeugung, Automatisierungstechnik',
  'Ernährung',
  'Erneuerbare Energien, nachwachsende Rohstoffe',
  'Erwachsenenbildung',
  'Film, Funk, Fernsehen',
  'Finanzen, Controlling, Buchhaltung, Finance',
  'Forschende und Lehrende, Promotion, HiWi, PostDoc',
  'Forstwirtschaft, Waldwirtschaft, Holzwirtschaft',
  'Fotografie',
  'Gastronomie, Hotel, Tourismus',
  'Gebäudetechnik, Versorgungstechnik, Sicherheitstechnik',
  'Geburtshilfe',
  'Geoinformatik',
  'Geschlechtersensible Soziale Arbeit',
  'Gesundheitshilfen, einschließlich Suchthilfe',
  'Grafik, Design, Mediendesign, Webdesign, Multimedia',
  'Hardwareentwicklung',
  'IT Beratung, IT Consulting, IT Vertrieb',
  'IT Projektmanagement, IT Leitung, IT Architektur',
  'IT Sicherheit',
  'IT Support, Helpdesk',
  'IT Testing',
  'IT und Telekommunikation, IT Beratung, IT Vertrieb, Wirtschaftsinformatik',
  'Jugendarbeit, Jugendsozialarbeit',
  'Jugendhilfe, Familienhilfe',
  'Kindergarten, Schule',
  'Klimawandel, Naturschutz, Umweltplanung',
  'Kosmetik, Körperpflege, Wellness',
  'Kunst und Kultur',
  'Labor, Forschung und Entwicklung',
  'Landschaftsarchitektur, Gartenbau',
  'Lebensmitteltechnologie, Brautechnologie, Getränketechnologie',
  'Lebensmittelwirtschaft',
  'Management und Beratung, Consulting',
  'Marketing, Werbung, Kommunikation, PR, Online Marketing, Eventmanagement',
  'Maschinenbau, Fahrzeugtechnik, Verkehrstechnik, Agrartechnik',
  'Materials Engineering, Werkstofftechnik, Materialwissenschaft',
  'Mathematik, Statistik',
  'Mechatronik, Feinwerktechnik, Robotik',
  'Medieninformatik, Geoinformatik, Bioinformatik',
  'Medizin- und Rehatechnik',
  'Medizin, Zahnmedizin',
  'Messe- und Veranstaltung',
  'Mode',
  'Museen, Restaurierung, Denkmalschutz',
  'Öffentlicher Dienst, Verwaltung, Behörden',
  'Personalwesen, HR, Recruiting',
  'Pflege, Therapie',
  'Pharmazie',
  'Physik',
  'Produktion, Fertigung, Qualitätswesen',
  'Psychologie',
  'Rechtswesen, Steuerwesen, Wirtschaftsprüfung, Steuerberatung',
  'Regionalmanagement',
  'Resozialisierung',
  'Softwareentwicklung, Programmierung',
  'Sonstige',
  'Sonstiges',
  'Soziale Arbeit im Bereich Migration',
  'Soziale Arbeit mit Menschen mit Behinderung und psychischer Erkrankung',
  'Soziale Arbeit mit und für ältere Menschen',
  'Sport und Bewegung',
  'Systemadministration, Netzwerkadministration',
  'Techn. Management, Projektplanung, Technischer Vertrieb',
  'Technische Entwicklung, Konstruktion, CAD',
  'Technische Traineeprogramme',
  'Tiergesundheit, Tiermedizin',
  'Umweltingenieurwesen',
  'Ver- und Entsorgung, Transport',
  'Verfahrenstechnik, Chemieingenieurwesen',
  'Verlagswesen, Bibliothek, Archiv',
  'Vertrieb, Verkauf, Handel, Sales, E-Commerce',
  'Verwaltung, Assistenz, Organisation, Sekretariat',
  'Wasserwirtschaft, Wassertechnologie',
  'Webentwicklung',
  'Wirtschaftsingenieurwesen',
] as const

export const JOB_HOMEOFFICES = [
  '0% Homeoffice',
  '0-49% Homeoffice',
  '50-100% Homeoffice',
  '100% Homeoffice',
] as const

export const JOB_WORKINGTIMES = {
  min: 0,
  max: 60,
} as const

export const DEFAULT_FILTER: Filters = {
  search: '',
  excludes: [],
  types: [],
  categories: [],
  fields: [],
  homeoffices: [],
  workingtimes: [JOB_WORKINGTIMES.min, JOB_WORKINGTIMES.max],
  locations: [],
  start_date: undefined,
  end_date: undefined,
}

export const JOB_SEARCH_TARGET_COLUMNS = [
  'title',
  'company',
  'location',
  'short_description',
  'intro_text',
  'task_text',
  'expectation_text',
  'offer_text',
  'contact_text',
] as const

export const DEFAULT_SUGGESTIONS = [
  'Can you elaborate on that?',
  'What are my next steps?',
  'Tell me more.',
]
