export type ProjectSpaceType = "interior" | "exterior" | "both";

/** "interior" | "exterior" — une question s'affiche si le type projet la couvre */
export type QuestionScope = "interior" | "exterior";

export type BriefAnswers = Record<string, string>;

export type QuestionField = {
  id: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea";
  rows?: number;
  appliesTo: QuestionScope[];
};

export type QuestionnaireSection = {
  id: string;
  title: string;
  description?: string;
  appliesTo: QuestionScope[];
  questions: QuestionField[];
};

export function isSectionApplicable(
  section: QuestionnaireSection,
  spaceType: ProjectSpaceType
): boolean {
  if (spaceType === "both") return true;
  return section.appliesTo.includes(spaceType);
}

export function isQuestionApplicable(
  question: QuestionField,
  spaceType: ProjectSpaceType
): boolean {
  if (spaceType === "both") return true;
  return question.appliesTo.includes(spaceType);
}

export function getApplicableSections(spaceType: ProjectSpaceType): QuestionnaireSection[] {
  return PROJECT_QUESTIONNAIRE_SECTIONS.filter((s) => isSectionApplicable(s, spaceType));
}

export function formatBriefForPrompt(input: {
  title: string;
  spaceType: ProjectSpaceType;
  style: string;
  budget?: string | null;
  constraints?: string | null;
  additionalNotes?: string | null;
  briefData?: BriefAnswers | null;
}): string {
  const spaceLabel =
    input.spaceType === "interior"
      ? "intérieur"
      : input.spaceType === "exterior"
        ? "extérieur"
        : "intérieur et extérieur";

  const lines: string[] = [
    `# Brief client — ${input.title}`,
    `Type de projet : ${spaceLabel}`,
    `Style souhaité : ${input.style}`,
  ];

  if (input.budget) lines.push(`Budget indicatif : ${input.budget} EUR`);
  if (input.constraints) lines.push(`Contraintes (legacy) : ${input.constraints}`);
  if (input.additionalNotes) lines.push(`Notes complémentaires (legacy) : ${input.additionalNotes}`);

  const sections = getApplicableSections(input.spaceType);
  const answers = input.briefData ?? {};

  for (const section of sections) {
    const sectionLines: string[] = [];
    for (const q of section.questions) {
      if (!isQuestionApplicable(q, input.spaceType)) continue;
      const value = answers[q.id]?.trim();
      if (value) sectionLines.push(`- **${q.label}** : ${value}`);
    }
    if (sectionLines.length > 0) {
      lines.push("", `## ${section.title}`, ...sectionLines);
    }
  }

  return lines.join("\n");
}

export const PROJECT_QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  {
    id: "global",
    title: "1. Comprendre le projet global",
    description: "Objectifs, motivations et vision du projet.",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "global_objectif",
        label: "Quel est l'objectif principal de votre projet ?",
        placeholder: "Rénover, agrandir, remeubler, valoriser pour une revente, adapter au vieillissement…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "global_pourquoi_maintenant",
        label: "Pourquoi maintenant et pas il y a 2 ans ou dans 2 ans ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "global_priorites",
        label: "Quelles sont vos priorités absolues (top 3) ?",
        placeholder: "Ex : lumière, rangements, terrasse conviviale…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "global_sensation",
        label: "Qu'aimeriez-vous ressentir en entrant dans votre espace une fois le projet terminé ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "global_impact_vie",
        label: "Si le projet était un succès total, qu'est-ce qui aurait changé dans votre vie quotidienne ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "global_inspirations",
        label: "Exemples de réalisations ou photos d'inspiration (Pinterest, magazines, hôtels…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "lieu",
    title: "2. Le lieu, le contexte et l'existant",
    description: "Type de bien, surfaces, éléments à conserver ou supprimer.",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "lieu_adresse_type",
        label: "Adresse / localisation et type de bien",
        placeholder: "Maison, appartement, jardin, terrasse, toit-terrasse, cour intérieure…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lieu_age_style",
        label: "Âge approximatif du bâtiment et style architectural",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lieu_surfaces",
        label: "Surfaces concernées (intérieur et/ou extérieur en m² approximatifs)",
        type: "text",
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lieu_zones",
        label: "Pièces ou zones extérieures concernées",
        placeholder: "Salon, chambres, jardin avant, terrasse, piscine, allée…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lieu_conserver",
        label: "Éléments à conserver absolument",
        placeholder: "Murs, sols, cheminée, arbres, vue, éléments décoratifs…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lieu_supprimer",
        label: "Éléments à faire disparaître",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lieu_contraintes_connues",
        label: "Contraintes déjà identifiées",
        placeholder: "Murs porteurs, PLU, voisinage, vis-à-vis, pente du terrain…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "occupants",
    title: "3. Les occupants et leur mode de vie",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "occ_habitants",
        label: "Qui vit ici ? (adultes, enfants, animaux, invités fréquents)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "occ_ages_besoins",
        label: "Tranches d'âge et besoins spécifiques (accessibilité, allergies, mobilité réduite…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "occ_temps_maison",
        label: "Temps passé à la maison en semaine / week-end",
        type: "text",
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "occ_invites",
        label: "Recevez-vous souvent ? Combien de personnes en général ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "occ_activites_interieur",
        label: "Activités principales à l'intérieur",
        placeholder: "Télétravail, cuisine, jeux, sport, musique…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "occ_activites_exterieur",
        label: "Activités principales à l'extérieur",
        placeholder: "Repas, barbecue, jeux d'enfants, potager, piscine…",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
    ],
  },
  {
    id: "usages_interieur",
    title: "4. Usages détaillés — espaces intérieurs",
    appliesTo: ["interior"],
    questions: [
      {
        id: "int_usage_pieces",
        label: "Comment utilisez-vous chaque pièce aujourd'hui ?",
        type: "textarea",
        rows: 3,
        appliesTo: ["interior"],
      },
      {
        id: "int_ce_qui_fonctionne",
        label: "Qu'est-ce qui fonctionne bien dans votre intérieur ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "int_problemes",
        label: "Qu'est-ce qui pose problème au quotidien ?",
        placeholder: "Rangement, circulation, lumière, bruit, intimité…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "int_polyvalent",
        label: "Besoin d'espaces polyvalents ? (salon/bureau, chambre d'ami/bureau…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "int_travail",
        label: "Besoin d'un espace de travail dédié ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "int_rangement",
        label: "Habitudes de rangement et besoins de stockage particuliers",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
    ],
  },
  {
    id: "usages_exterieur",
    title: "5. Usages détaillés — espaces extérieurs",
    appliesTo: ["exterior"],
    questions: [
      {
        id: "ext_zones",
        label: "Quelles zones extérieures souhaitez-vous traiter ?",
        placeholder: "Entrée, terrasse, jardin avant/arrière, potager, parking…",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "ext_espaces_distincts",
        label: "Espaces distincts souhaités",
        placeholder: "Coin repas, lounge, enfants, feu, cuisine d'été…",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "ext_repas",
        label: "Combien de personnes doivent pouvoir manger dehors confortablement ?",
        type: "text",
        appliesTo: ["exterior"],
      },
      {
        id: "ext_usage_actuel",
        label: "Utilisez-vous déjà votre extérieur ? Comment, et qu'est-ce qui manque ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "ext_animaux",
        label: "Animaux et besoins spécifiques dans le jardin / terrasse",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "ext_type_jardin",
        label: "Type de jardin souhaité",
        placeholder: "Ornemental, facile d'entretien, potager, mix…",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "ext_problemes",
        label: "Problèmes connus",
        placeholder: "Vis-à-vis, bruit, manque d'ombre, vent, inondations, pente…",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
    ],
  },
  {
    id: "style",
    title: "6. Style, ambiance et préférences esthétiques",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "style_description",
        label: "Comment décririez-vous le style que vous aimez ?",
        placeholder: "Contemporain, minimaliste, scandinave, bohème, wabi-sabi…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "style_eviter",
        label: "Styles ou ambiances à éviter",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "style_couleurs",
        label: "Couleurs préférées et couleurs à éviter",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "style_ambiance_lumiere",
        label: "Ambiance lumineuse souhaitée",
        placeholder: "Claire et lumineuse, chaleureuse et enveloppante…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "style_motifs",
        label: "Motifs (papier peint, carrelage graphique) ou préférence pour l'épuré ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "style_materiaux",
        label: "Matériaux appréciés",
        placeholder: "Bois, pierre, métal, béton, lin, laiton…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "style_objets",
        label: "Objets à intégrer (œuvres d'art, meubles de famille, piano…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "lumiere",
    title: "7. Lumière, vues et ambiance",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "lum_pieces",
        label: "Pièces ou zones les plus lumineuses / les plus sombres",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "lum_vues_valoriser",
        label: "Vues à mettre en valeur",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lum_vues_masquer",
        label: "Vues à masquer (vis-à-vis, route, parking…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "lum_naturelle",
        label: "Préférence lumière naturelle vs atmosphère tamisée",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "lum_eclairage",
        label: "Organisation de l'éclairage souhaitée",
        placeholder: "Général, ambiance, travail, extérieur de nuit…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "technique",
    title: "8. Confort, technique et contraintes",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "tech_confort",
        label: "Problèmes de confort",
        placeholder: "Froid, chaleur, humidité, bruit intérieur ou extérieur…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "tech_chauffage",
        label: "Chauffage / climatisation actuels — satisfaction",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "tech_durable",
        label: "Solutions durables souhaitées",
        placeholder: "Matériaux écologiques, gestion de l'eau, ombrages, isolation…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "tech_reglementation",
        label: "Contraintes réglementaires ou copropriété",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "tech_plans",
        label: "Plans, relevés ou documents techniques disponibles",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "budget",
    title: "9. Budget, phasage et planning",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "budget_global",
        label: "Budget global envisagé (études + travaux), même approximatif",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "budget_inclus",
        label: "Ce budget inclut-il honoraires, mobilier, végétalisation, arrosage… ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "budget_flexibilite",
        label: "Niveau de flexibilité sur le budget (fourchette ou plafond strict)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "budget_financement",
        label: "Financement (épargne, prêt, en cours de discussion…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "budget_echeance",
        label: "Échéance idéale et date limite absolue",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "budget_phasage",
        label: "Ouverture au phasage des travaux par zones",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "chantier",
    title: "10. Organisation du chantier et logistique",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "chantier_habitation",
        label: "Habitez-vous sur place pendant les travaux ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "chantier_acces",
        label: "Contraintes d'accès",
        placeholder: "Étage sans ascenseur, rue étroite, terrain difficile…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "chantier_periodes",
        label: "Périodes où les travaux sont impossibles",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "chantier_exigences",
        label: "Exigences propreté, protection, horaires de chantier",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "relation",
    title: "11. Relation avec le professionnel",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "rel_experience",
        label: "Expérience passée avec architecte / designer",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "rel_implication",
        label: "Niveau d'implication souhaité dans les choix",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "rel_decision",
        label: "Prise de décision (couple, décideur unique…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "rel_suivi_chantier",
        label: "Attentes sur le suivi de chantier / coordination entreprises",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "rel_communication",
        label: "Préférences de communication et fréquence des points",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "specifique_interieur",
    title: "12. Questions spécifiques — intérieur",
    appliesTo: ["interior"],
    questions: [
      {
        id: "si_cuisine",
        label: "Cuisine : habitudes, appareils à intégrer (cave à vin, grand frigo…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "si_salon",
        label: "Salon : TV, réception, jeux enfants, lecture…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "si_chambres",
        label: "Chambres : bureau, dressing, coin bébé, lecture…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "si_sdb",
        label: "Salles de bain : bain, douche, usage simultané le matin…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
      {
        id: "si_rangements",
        label: "Rangements intégrés vs meubles indépendants",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior"],
      },
    ],
  },
  {
    id: "specifique_exterieur",
    title: "13. Questions spécifiques — extérieur / paysage",
    appliesTo: ["exterior"],
    questions: [
      {
        id: "se_cheminements",
        label: "Cheminements souhaités (allée, jardin, passage technique…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "se_terrasse",
        label: "Terrasses, deck, pergola, murets assises, auvent…",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "se_structure_jardin",
        label: "Jardin structuré ou naturel / sauvage ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "se_entretien",
        label: "Temps consacré à l'entretien vs extérieur facile à entretenir",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "se_vues_fenetres",
        label: "Vues à cadrer depuis l'intérieur vers l'extérieur",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
      {
        id: "se_eclairage_ext",
        label: "Éclairage extérieur (ambiance, sécurité, balisage, façade…)",
        type: "textarea",
        rows: 2,
        appliesTo: ["exterior"],
      },
    ],
  },
  {
    id: "securite",
    title: "14. Sécurité, intimité et voisinage",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "sec_visavis",
        label: "Le vis-à-vis vous dérange-t-il ? Où précisément ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "sec_intimite",
        label: "Besoin d'intimité supplémentaire",
        placeholder: "Brise-vue, claustras, végétation, clôtures…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "sec_securite",
        label: "Enjeux de sécurité",
        placeholder: "Enfants, piscine, route proche, accès jardin…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "sec_voisinage",
        label: "Contraintes ou conflits avec le voisinage",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
  {
    id: "final",
    title: "15. Attentes et craintes",
    appliesTo: ["interior", "exterior"],
    questions: [
      {
        id: "fin_attentes",
        label: "Qu'attendez-vous principalement de ce projet ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "fin_inquietudes",
        label: "Vos plus grandes inquiétudes",
        placeholder: "Budget, délais, résultat, gestion du chantier…",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "fin_reussite",
        label: "Qu'est-ce qui fera que le projet sera une réussite totale ?",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
      {
        id: "fin_autre",
        label: "Autre élément important non abordé",
        type: "textarea",
        rows: 2,
        appliesTo: ["interior", "exterior"],
      },
    ],
  },
];
