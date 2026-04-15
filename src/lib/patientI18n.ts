export type PatientLanguage = 'en' | 'es' | 'fr' | 'ht'

export const PATIENT_LANGUAGE_STORAGE_KEY = 'patient-language'

export const PATIENT_LANGUAGE_OPTIONS: Array<{ value: PatientLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'ht', label: 'Kreyol Ayisyen' },
]

const REQUEST_LABELS = {
  en: {
    water: 'Water',
    blanket: 'Blanket',
    pain: 'Pain / Discomfort',
    medication: 'Medication',
    bathroom: 'Bathroom Help',
    nurse: 'Call Nurse',
    food: 'Food / Snack',
    temperature: 'Too Hot / Cold',
    family: 'Help Contacting Family',
  },
  es: {
    water: 'Agua',
    blanket: 'Manta',
    pain: 'Dolor / Molestia',
    medication: 'Medicacion',
    bathroom: 'Ayuda para ir al bano',
    nurse: 'Llamar a enfermeria',
    food: 'Comida / Refrigerio',
    temperature: 'Mucho calor / frio',
    family: 'Ayuda para contactar a la familia',
  },
  fr: {
    water: 'Eau',
    blanket: 'Couverture',
    pain: 'Douleur / inconfort',
    medication: 'Medicament',
    bathroom: 'Aide pour aller aux toilettes',
    nurse: 'Appeler une infirmiere',
    food: 'Repas / collation',
    temperature: 'Trop chaud / froid',
    family: 'Aide pour contacter la famille',
  },
  ht: {
    water: 'Dlo',
    blanket: 'Dra',
    pain: 'Doule / mal alese',
    medication: 'Medikaman',
    bathroom: 'Ed pou ale twalet',
    nurse: 'Rele enfimye',
    food: 'Manje / ti goute',
    temperature: 'Twop cho / twop fret',
    family: 'Ed pou kontakte fanmi',
  },
} as const

type RequestLabelKey = keyof typeof REQUEST_LABELS.en

const KNOWN_REQUEST_LABELS: Record<string, RequestLabelKey> = {
  water: 'water',
  blanket: 'blanket',
  pain: 'pain',
  'pain discomfort': 'pain',
  medication: 'medication',
  'bathroom help': 'bathroom',
  'call nurse': 'nurse',
  'food snack': 'food',
  'too hot cold': 'temperature',
  'help contacting family': 'family',
  'help contact family': 'family',
  'contact family': 'family',
}

const PATIENT_COPY = {
  en: {
    language: 'Language',
    requestsTab: 'REQUESTS',
    servicesTab: 'SERVICES',
    funTab: 'FUN',
    infoTab: 'INFO',
    callNurseTitle: 'Call Nurse',
    callNurseSub: 'For urgent assistance or pain relief',
    nurseNotified: 'Nurse Notified',
    notifying: 'Notifying...',
    pressNow: 'Press Now',
    commonRequests: 'Common Requests',
    tapToSend: 'TAP TO SEND',
    requestSent: 'Request sent',
    servicesTitle: 'Services',
    servicesSub: 'Hospital services and amenities coming soon.',
    funTitle: 'Entertainment',
    funSub: 'Games, music, and relaxation content coming soon.',
    yourBay: 'Your Bay',
    unit: 'Unit',
    site: 'Site',
    about: 'About',
    aboutBody: 'Use the Requests tab to send a message to your care team. For emergencies, press the red Call Nurse button or the physical call button on your bed.',
    loading: 'Loading...',
    roomNotFoundTitle: 'Room not found',
    roomNotFoundBody: 'Please scan the QR code at your bedside again or ask a staff member for help.',
    requestGeneric: 'Request',
    badgeCompleted: 'Completed',
    badgeOnTheWay: 'On the way',
    badgeReceived: 'Received',
    titleCompleted: 'Your request has been completed',
    titleAcknowledged: 'Your care team has acknowledged your request',
    titleReceived: 'Your request has been received',
    bodyCompletedWithFeedback: 'Thank you for letting us help. If you have a moment, please rate the experience below.',
    bodyCompleted: 'Thank you for letting us help. If you need anything else, you can submit another request at any time.',
    bodyAcknowledged: 'A nurse has seen this request and is on the way.',
    bodyReceived: 'A nurse will be with you shortly. Please stay comfortable.',
    cancelNoteAcknowledged: 'The care team has seen this request, and you can still cancel it if you no longer need help.',
    cancelNoteReceived: 'You can cancel this request if you no longer need help.',
    bannerCompleted: 'Your request has been marked complete by the care team.',
    bannerReceived: 'We have received your request and alerted the care team.',
    feedbackTitle: 'How did we do?',
    feedbackSub: 'Tap a star to rate this request from 1 to 5.',
    feedbackScale: '1 = Poor, 5 = Excellent',
    cancelRequest: 'Cancel request',
    dismiss: 'Dismiss',
  },
  es: {
    language: 'Idioma',
    requestsTab: 'SOLICITUDES',
    servicesTab: 'SERVICIOS',
    funTab: 'OCIO',
    infoTab: 'INFO',
    callNurseTitle: 'Llamar a enfermeria',
    callNurseSub: 'Para ayuda urgente o alivio del dolor',
    nurseNotified: 'Enfermeria avisada',
    notifying: 'Avisando...',
    pressNow: 'Presione ahora',
    commonRequests: 'Solicitudes comunes',
    tapToSend: 'TOQUE PARA ENVIAR',
    requestSent: 'Solicitud enviada',
    servicesTitle: 'Servicios',
    servicesSub: 'Los servicios y comodidades del hospital estaran disponibles pronto.',
    funTitle: 'Entretenimiento',
    funSub: 'Juegos, musica y contenido de relajacion estaran disponibles pronto.',
    yourBay: 'Su area',
    unit: 'Unidad',
    site: 'Centro',
    about: 'Acerca de',
    aboutBody: 'Use la pestana de solicitudes para enviar un mensaje a su equipo de atencion. En una emergencia, presione el boton rojo de llamar a enfermeria o el boton fisico junto a su cama.',
    loading: 'Cargando...',
    roomNotFoundTitle: 'Habitacion no encontrada',
    roomNotFoundBody: 'Escanee de nuevo el codigo QR junto a su cama o pida ayuda a un miembro del personal.',
    requestGeneric: 'Solicitud',
    badgeCompleted: 'Completada',
    badgeOnTheWay: 'En camino',
    badgeReceived: 'Recibida',
    titleCompleted: 'Su solicitud ha sido completada',
    titleAcknowledged: 'Su equipo de atencion ha reconocido su solicitud',
    titleReceived: 'Su solicitud ha sido recibida',
    bodyCompletedWithFeedback: 'Gracias por permitirnos ayudarle. Si tiene un momento, califique la experiencia a continuacion.',
    bodyCompleted: 'Gracias por permitirnos ayudarle. Si necesita algo mas, puede enviar otra solicitud en cualquier momento.',
    bodyAcknowledged: 'Una enfermera ha visto esta solicitud y va en camino.',
    bodyReceived: 'Una enfermera estara con usted en breve. Mantengase comodo.',
    cancelNoteAcknowledged: 'El equipo de atencion ya vio esta solicitud y aun puede cancelarla si ya no necesita ayuda.',
    cancelNoteReceived: 'Puede cancelar esta solicitud si ya no necesita ayuda.',
    bannerCompleted: 'Su solicitud ha sido marcada como completada por el equipo de atencion.',
    bannerReceived: 'Hemos recibido su solicitud y avisado al equipo de atencion.',
    feedbackTitle: 'Como lo hicimos?',
    feedbackSub: 'Toque una estrella para calificar esta solicitud del 1 al 5.',
    feedbackScale: '1 = Malo, 5 = Excelente',
    cancelRequest: 'Cancelar solicitud',
    dismiss: 'Cerrar',
  },
  fr: {
    language: 'Langue',
    requestsTab: 'DEMANDES',
    servicesTab: 'SERVICES',
    funTab: 'LOISIRS',
    infoTab: 'INFO',
    callNurseTitle: 'Appeler une infirmiere',
    callNurseSub: 'Pour une aide urgente ou un soulagement de la douleur',
    nurseNotified: 'Infirmiere avertie',
    notifying: 'Notification...',
    pressNow: 'Appuyer',
    commonRequests: 'Demandes courantes',
    tapToSend: 'APPUYER POUR ENVOYER',
    requestSent: 'Demande envoyee',
    servicesTitle: 'Services',
    servicesSub: 'Les services et commodites de l hopital arrivent bientot.',
    funTitle: 'Divertissement',
    funSub: 'Jeux, musique et contenu de relaxation arrivent bientot.',
    yourBay: 'Votre espace',
    unit: 'Unite',
    site: 'Site',
    about: 'A propos',
    aboutBody: 'Utilisez l onglet des demandes pour envoyer un message a votre equipe soignante. En cas d urgence, appuyez sur le bouton rouge d appel infirmier ou sur le bouton physique pres de votre lit.',
    loading: 'Chargement...',
    roomNotFoundTitle: 'Chambre introuvable',
    roomNotFoundBody: 'Veuillez rescanner le code QR pres de votre lit ou demander de l aide a un membre du personnel.',
    requestGeneric: 'Demande',
    badgeCompleted: 'Terminee',
    badgeOnTheWay: 'En route',
    badgeReceived: 'Recue',
    titleCompleted: 'Votre demande a ete terminee',
    titleAcknowledged: 'Votre equipe soignante a pris en compte votre demande',
    titleReceived: 'Votre demande a ete recue',
    bodyCompletedWithFeedback: 'Merci de nous avoir permis de vous aider. Si vous avez un instant, merci d evaluer l experience ci-dessous.',
    bodyCompleted: 'Merci de nous avoir permis de vous aider. Si vous avez besoin d autre chose, vous pouvez envoyer une nouvelle demande a tout moment.',
    bodyAcknowledged: 'Une infirmiere a vu cette demande et arrive.',
    bodyReceived: 'Une infirmiere sera bientot avec vous. Restez installe confortablement.',
    cancelNoteAcknowledged: 'L equipe soignante a vu cette demande et vous pouvez encore l annuler si vous n avez plus besoin d aide.',
    cancelNoteReceived: 'Vous pouvez annuler cette demande si vous n avez plus besoin d aide.',
    bannerCompleted: 'Votre demande a ete marquee comme terminee par l equipe soignante.',
    bannerReceived: 'Nous avons recu votre demande et prevenu l equipe soignante.',
    feedbackTitle: 'Comment avons-nous fait ?',
    feedbackSub: 'Touchez une etoile pour noter cette demande de 1 a 5.',
    feedbackScale: '1 = Mauvais, 5 = Excellent',
    cancelRequest: 'Annuler la demande',
    dismiss: 'Fermer',
  },
  ht: {
    language: 'Lang',
    requestsTab: 'DEMANN',
    servicesTab: 'SEVIS',
    funTab: 'DETANT',
    infoTab: 'ENFO',
    callNurseTitle: 'Rele enfimye',
    callNurseSub: 'Pou asistans ijan oswa soulajman doulè',
    nurseNotified: 'Yo avize enfimye a',
    notifying: 'Y ap voye avi...',
    pressNow: 'Peze kounye a',
    commonRequests: 'Demann komen',
    tapToSend: 'PEZE POU VOYE',
    requestSent: 'Demann voye',
    servicesTitle: 'Sevis',
    servicesSub: 'Sevis lopital ak keksoz itil yo ap vini byento.',
    funTitle: 'Detant',
    funSub: 'Jwet, mizik, ak keksoz pou detann ap vini byento.',
    yourBay: 'Espas ou',
    unit: 'Inite',
    site: 'Sant',
    about: 'Konsenan',
    aboutBody: 'Sevi ak onglet Demann nan pou voye yon mesaj bay ekip swen ou. Si gen ijans, peze bouton wouj Rele enfimye a oswa bouton fizik ki toupre kabann ou.',
    loading: 'Ap chaje...',
    roomNotFoundTitle: 'Yo pa jwenn chanm nan',
    roomNotFoundBody: 'Tanpri eskane kod QR ki bo kabann ou anko oswa mande yon manm pesonel la pou ed.',
    requestGeneric: 'Demann',
    badgeCompleted: 'Fini',
    badgeOnTheWay: 'Sou wout',
    badgeReceived: 'Resevwa',
    titleCompleted: 'Demann ou a fini',
    titleAcknowledged: 'Ekip swen an rekonet demann ou an',
    titleReceived: 'Yo resevwa demann ou an',
    bodyCompletedWithFeedback: 'Mesi paske ou kite nou ede ou. Si ou gen yon ti moman, tanpri bay eksperyans lan yon not anba a.',
    bodyCompleted: 'Mesi paske ou kite nou ede ou. Si ou bezwen lot bagay, ou ka voye yon lot demann nenpot le.',
    bodyAcknowledged: 'Yon enfimye we demann sa a epi li sou wout la.',
    bodyReceived: 'Yon enfimye pral vini jwenn ou tale. Tanpri rete alez.',
    cancelNoteAcknowledged: 'Ekip swen an deja we demann sa a, epi ou ka toujou anile li si ou pa bezwen ed anko.',
    cancelNoteReceived: 'Ou ka anile demann sa a si ou pa bezwen ed anko.',
    bannerCompleted: 'Ekip swen an make demann ou an kom fini.',
    bannerReceived: 'Nou resevwa demann ou an epi nou avize ekip swen an.',
    feedbackTitle: 'Kijan nou te fe?',
    feedbackSub: 'Peze yon zetwal pou bay demann sa a yon not soti 1 rive 5.',
    feedbackScale: '1 = Pa bon, 5 = Ekselan',
    cancelRequest: 'Anile demann',
    dismiss: 'Femen',
  },
} as const

export type PatientCopy = (typeof PATIENT_COPY)[PatientLanguage]

const normalizeLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const detectLanguage = () => {
  if (typeof window === 'undefined') return 'en' as PatientLanguage

  const candidates = [window.navigator.language, ...(window.navigator.languages ?? [])]
    .filter(Boolean)
    .map(item => item.toLowerCase())

  for (const candidate of candidates) {
    if (candidate.startsWith('es')) return 'es'
    if (candidate === 'ht' || candidate.startsWith('ht-')) return 'ht'
    if (candidate.startsWith('fr')) return candidate.includes('-ht') ? 'ht' : 'fr'
  }

  return 'en'
}

export const getInitialPatientLanguage = (): PatientLanguage => {
  if (typeof window === 'undefined') return 'en'

  const stored = window.localStorage.getItem(PATIENT_LANGUAGE_STORAGE_KEY)
  if (stored === 'en' || stored === 'es' || stored === 'fr' || stored === 'ht') return stored
  return detectLanguage()
}

export const getPatientCopy = (language: PatientLanguage): PatientCopy =>
  PATIENT_COPY[language]

export const translateRequestTypeLabel = (
  language: PatientLanguage,
  type: string,
  fallbackLabel: string
) => {
  const directMatch = REQUEST_LABELS[language][type as RequestLabelKey]
  if (directMatch) return directMatch

  const fallbackKey = KNOWN_REQUEST_LABELS[normalizeLabel(fallbackLabel)]
  if (fallbackKey) return REQUEST_LABELS[language][fallbackKey]

  return fallbackLabel
}

export const formatFeedbackThanks = (language: PatientLanguage, rating: number) => {
  switch (language) {
    case 'es':
      return `Gracias por sus comentarios. Califico esta solicitud con ${rating}/5.`
    case 'fr':
      return `Merci pour votre avis. Vous avez note cette demande ${rating}/5.`
    case 'ht':
      return `Mesi pou opinyon ou. Ou bay demann sa a not ${rating}/5.`
    default:
      return `Thank you for the feedback. You rated this request ${rating}/5.`
  }
}
