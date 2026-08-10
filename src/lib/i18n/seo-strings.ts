import type { Locale } from "./config";

/**
 * Page titles and meta descriptions per locale.
 *
 * Kept out of dictionary.ts (already ~1,150 lines) because these are search
 * copy, not UI copy: they are tuned for SERP length and keywords rather than
 * for fitting a button. The Croatian entries are the previously hardcoded
 * values, moved here verbatim.
 */
export type SeoRoute =
  | "home"
  | "vozila"
  | "financiranje"
  | "prijaviProblem"
  | "osiguranje"
  | "oNama"
  | "postupakKupnje"
  | "uvjetiFinanciranja"
  | "tijekPreuzimanja"
  | "terminZaPreuzimanje"
  | "reklamacije"
  | "impressum";

type Entry = { title: string; description: string };

export const SEO: Record<SeoRoute, Record<Locale, Entry>> = {
  home: {
    hr: {
      title: "AUTOCAR EU — Vozila iz Njemačke i Austrije",
      description:
        "Osam godina povjerenja, preko 350 provjerenih vozila na stanju i garancija do 3 godine. Financiranje dostupno svima koji rade u Njemačkoj i Austriji.",
    },
    de: {
      title: "AUTOCAR EU — Fahrzeuge aus Deutschland und Österreich",
      description:
        "Acht Jahre Vertrauen, über 350 geprüfte Fahrzeuge auf Lager und bis zu 3 Jahre Garantie. Finanzierung für alle, die in Deutschland und Österreich arbeiten.",
    },
    en: {
      title: "AUTOCAR EU — Cars from Germany and Austria",
      description:
        "Eight years of trust, over 350 inspected vehicles in stock and a warranty of up to 3 years. Financing available to everyone working in Germany and Austria.",
    },
    fr: {
      title: "AUTOCAR EU — Véhicules d'Allemagne et d'Autriche",
      description:
        "Huit ans de confiance, plus de 350 véhicules vérifiés en stock et une garantie jusqu'à 3 ans. Financement accessible à tous ceux qui travaillent en Allemagne et en Autriche.",
    },
    uk: {
      title: "AUTOCAR EU — Автомобілі з Німеччини та Австрії",
      description:
        "Вісім років довіри, понад 350 перевірених автомобілів у наявності та гарантія до 3 років. Фінансування доступне всім, хто працює в Німеччині та Австрії.",
    },
  },

  vozila: {
    hr: {
      title: "Ponuda vozila",
      description:
        "Pregledajte ponudu provjerenih vozila iz Njemačke i Austrije — AUTOCAR EU. Filtrirajte po marki, modelu, godištu, cijeni i više.",
    },
    de: {
      title: "Fahrzeugangebot",
      description:
        "Entdecken Sie geprüfte Fahrzeuge aus Deutschland und Österreich — AUTOCAR EU. Filtern Sie nach Marke, Modell, Baujahr, Preis und mehr.",
    },
    en: {
      title: "Cars for sale",
      description:
        "Browse inspected vehicles from Germany and Austria — AUTOCAR EU. Filter by make, model, year, price and more.",
    },
    fr: {
      title: "Véhicules disponibles",
      description:
        "Parcourez des véhicules vérifiés d'Allemagne et d'Autriche — AUTOCAR EU. Filtrez par marque, modèle, année, prix et plus encore.",
    },
    uk: {
      title: "Автомобілі в наявності",
      description:
        "Перегляньте перевірені автомобілі з Німеччини та Австрії — AUTOCAR EU. Фільтруйте за маркою, моделлю, роком, ціною тощо.",
    },
  },

  financiranje: {
    hr: {
      title: "Financiranje",
      description:
        "Pošaljite upit za financiranje vozila — najpovoljniji uvjeti za sve zaposlene u Njemačkoj i Austriji, brza obrada zahtjeva.",
    },
    de: {
      title: "Finanzierung",
      description:
        "Stellen Sie eine Finanzierungsanfrage — beste Konditionen für alle Beschäftigten in Deutschland und Österreich, schnelle Bearbeitung.",
    },
    en: {
      title: "Financing",
      description:
        "Send a vehicle financing enquiry — the best terms for everyone employed in Germany and Austria, with fast processing.",
    },
    fr: {
      title: "Financement",
      description:
        "Envoyez une demande de financement — les meilleures conditions pour tous les salariés en Allemagne et en Autriche, traitement rapide.",
    },
    uk: {
      title: "Фінансування",
      description:
        "Надішліть запит на фінансування автомобіля — найкращі умови для всіх, хто працює в Німеччині та Австрії, швидке опрацювання.",
    },
  },

  prijaviProblem: {
    hr: {
      title: "Prijavi problem",
      description:
        "Imate problem s vozilom? Ispunite obrazac i naš tim će vam se javiti u najkraćem mogućem roku.",
    },
    de: {
      title: "Problem melden",
      description:
        "Probleme mit Ihrem Fahrzeug? Füllen Sie das Formular aus und unser Team meldet sich schnellstmöglich bei Ihnen.",
    },
    en: {
      title: "Report a problem",
      description:
        "Trouble with your vehicle? Fill in the form and our team will get back to you as soon as possible.",
    },
    fr: {
      title: "Signaler un problème",
      description:
        "Un problème avec votre véhicule ? Remplissez le formulaire et notre équipe vous contactera dans les plus brefs délais.",
    },
    uk: {
      title: "Повідомити про проблему",
      description:
        "Проблема з автомобілем? Заповніть форму, і наша команда зв'яжеться з вами якнайшвидше.",
    },
  },

  osiguranje: {
    hr: {
      title: "Osiguranje",
      description:
        "Auto osiguranje, kasko i sva ostala osiguranja za Njemačku i Austriju — uz osobnog savjetnika koji govori vaš jezik.",
    },
    de: {
      title: "Versicherung",
      description:
        "Kfz-Versicherung, Vollkasko und alle weiteren Versicherungen für Deutschland und Österreich — mit persönlichem Berater in Ihrer Sprache.",
    },
    en: {
      title: "Insurance",
      description:
        "Motor insurance, comprehensive cover and every other kind of insurance for Germany and Austria — with a personal adviser who speaks your language.",
    },
    fr: {
      title: "Assurances",
      description:
        "Assurance auto, tous risques et toutes les autres assurances pour l'Allemagne et l'Autriche — avec un conseiller personnel qui parle votre langue.",
    },
    uk: {
      title: "Страхування",
      description:
        "Автострахування, каско та всі інші види страхування для Німеччини та Австрії — з особистим консультантом, який говорить вашою мовою.",
    },
  },

  oNama: {
    hr: {
      title: "O nama",
      description:
        "AUTOCAR EU — od 2018. prodajemo provjerena vozila iz Njemačke i Austrije. Preko 350 vozila na stanju, garancija do 3 godine i tisuće zadovoljnih kupaca.",
    },
    de: {
      title: "Über uns",
      description:
        "AUTOCAR EU verkauft seit 2018 geprüfte Fahrzeuge aus Deutschland und Österreich. Über 350 Fahrzeuge auf Lager, bis zu 3 Jahre Garantie, tausende zufriedene Kunden.",
    },
    en: {
      title: "About us",
      description:
        "AUTOCAR EU has sold inspected vehicles from Germany and Austria since 2018. Over 350 vehicles in stock, warranty up to 3 years and thousands of satisfied customers.",
    },
    fr: {
      title: "À propos",
      description:
        "AUTOCAR EU vend depuis 2018 des véhicules vérifiés d'Allemagne et d'Autriche. Plus de 350 véhicules en stock, garantie jusqu'à 3 ans, des milliers de clients satisfaits.",
    },
    uk: {
      title: "Про нас",
      description:
        "AUTOCAR EU з 2018 року продає перевірені автомобілі з Німеччини та Австрії. Понад 350 автомобілів у наявності, гарантія до 3 років, тисячі задоволених клієнтів.",
    },
  },

  postupakKupnje: {
    hr: {
      title: "Postupak kupnje",
      description:
        "Tri jednostavna koraka do vašeg vozila: informativni razgovor, online zahtjev za financiranjem i preuzimanje vozila.",
    },
    de: {
      title: "Kaufablauf",
      description:
        "In drei einfachen Schritten zu Ihrem Fahrzeug: Beratungsgespräch, Online-Finanzierungsantrag und Fahrzeugübergabe.",
    },
    en: {
      title: "How to buy",
      description:
        "Three simple steps to your vehicle: an advisory call, an online financing application and collection of the car.",
    },
    fr: {
      title: "Processus d'achat",
      description:
        "Trois étapes simples vers votre véhicule : un entretien de conseil, une demande de financement en ligne et la remise du véhicule.",
    },
    uk: {
      title: "Процес купівлі",
      description:
        "Три прості кроки до вашого автомобіля: консультація, онлайн-заявка на фінансування та передача авто.",
    },
  },

  uvjetiFinanciranja: {
    hr: {
      title: "Uvjeti financiranja",
      description:
        "Financiranje vozila uz kamatu od 5,99% do 8,99%, 0% učešća i odobrenje banke unutar jednog radnog dana.",
    },
    de: {
      title: "Finanzierungskonditionen",
      description:
        "Fahrzeugfinanzierung mit 5,99 % bis 8,99 % Zinsen, 0 % Anzahlung und Bankzusage innerhalb eines Werktages.",
    },
    en: {
      title: "Financing terms",
      description:
        "Vehicle financing at 5.99% to 8.99% interest, 0% deposit and bank approval within one working day.",
    },
    fr: {
      title: "Conditions de financement",
      description:
        "Financement de véhicule à un taux de 5,99 % à 8,99 %, 0 % d'apport et accord bancaire sous un jour ouvré.",
    },
    uk: {
      title: "Умови фінансування",
      description:
        "Фінансування автомобіля під 5,99–8,99 % річних, 0 % початкового внеску та схвалення банку протягом одного робочого дня.",
    },
  },

  tijekPreuzimanja: {
    hr: {
      title: "Tijek preuzimanja",
      description:
        "Kako izgleda preuzimanje vozila — od dogovorenog termina do predaje ključeva.",
    },
    de: {
      title: "Ablauf der Übergabe",
      description:
        "Wie die Fahrzeugübergabe abläuft — vom vereinbarten Termin bis zur Schlüsselübergabe.",
    },
    en: {
      title: "Handover process",
      description:
        "What collecting your vehicle looks like — from the agreed appointment to handing over the keys.",
    },
    fr: {
      title: "Déroulement de la remise",
      description:
        "Comment se déroule la remise du véhicule — du rendez-vous convenu à la remise des clés.",
    },
    uk: {
      title: "Процес передачі",
      description:
        "Як відбувається передача автомобіля — від узгодженої зустрічі до вручення ключів.",
    },
  },

  terminZaPreuzimanje: {
    hr: {
      title: "Termin za preuzimanje",
      description: "Dogovorite termin za preuzimanje vozila — AUTOCAR EU.",
    },
    de: {
      title: "Übergabetermin",
      description:
        "Vereinbaren Sie einen Termin für die Fahrzeugübergabe — AUTOCAR EU.",
    },
    en: {
      title: "Handover appointment",
      description: "Arrange an appointment to collect your vehicle — AUTOCAR EU.",
    },
    fr: {
      title: "Rendez-vous de remise",
      description:
        "Convenez d'un rendez-vous pour la remise de votre véhicule — AUTOCAR EU.",
    },
    uk: {
      title: "Час передачі авто",
      description:
        "Домовтеся про зустріч для передачі автомобіля — AUTOCAR EU.",
    },
  },

  reklamacije: {
    hr: {
      title: "Reklamacije",
      description:
        "Kako podnijeti reklamaciju i kontakt za prigovore — AUTOCAR EU.",
    },
    de: {
      title: "Reklamationen",
      description:
        "Wie Sie eine Reklamation einreichen und an wen Sie sich mit Beschwerden wenden — AUTOCAR EU.",
    },
    en: {
      title: "Complaints",
      description:
        "How to submit a complaint and who to contact with grievances — AUTOCAR EU.",
    },
    fr: {
      title: "Réclamations",
      description:
        "Comment déposer une réclamation et qui contacter en cas de litige — AUTOCAR EU.",
    },
    uk: {
      title: "Рекламації",
      description:
        "Як подати рекламацію та до кого звертатися зі скаргами — AUTOCAR EU.",
    },
  },

  impressum: {
    hr: {
      title: "Impressum",
      description: "Pravne informacije i podaci o tvrtki AUTOCAR EU.",
    },
    de: {
      title: "Impressum",
      description: "Rechtliche Hinweise und Unternehmensangaben zu AUTOCAR EU.",
    },
    en: {
      title: "Legal notice",
      description: "Legal information and company details for AUTOCAR EU.",
    },
    fr: {
      title: "Mentions légales",
      description:
        "Informations légales et coordonnées de la société AUTOCAR EU.",
    },
    uk: {
      title: "Вихідні дані",
      description: "Юридична інформація та відомості про компанію AUTOCAR EU.",
    },
  },
};

/** Trailing sentence for a car page's generated description. */
export const CAR_META_SUFFIX: Record<Locale, string> = {
  hr: "Provjerena vozila iz Njemačke i Austrije uz mogućnost financiranja.",
  de: "Geprüfte Fahrzeuge aus Deutschland und Österreich, Finanzierung möglich.",
  en: "Inspected vehicles from Germany and Austria, financing available.",
  fr: "Véhicules vérifiés d'Allemagne et d'Autriche, financement possible.",
  uk: "Перевірені автомобілі з Німеччини та Австрії, доступне фінансування.",
};

/** Title for a car page whose slug no longer resolves. */
export const CAR_NOT_FOUND: Record<Locale, string> = {
  hr: "Vozilo nije pronađeno",
  de: "Fahrzeug nicht gefunden",
  en: "Vehicle not found",
  fr: "Véhicule introuvable",
  uk: "Автомобіль не знайдено",
};
