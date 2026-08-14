import type { Player, Team, TournamentData } from "./types";

const player = (id: string, name: string, position: Player["position"], mmr: number, dotaId: string, captain = false): Player => ({ id, name, position, mmr, dotaId, captain });

export const defaultTournamentData: TournamentData = {
  config: {
    name: "CamiCup",
    edition: "Primera edición",
    subtitle: "El campo de batalla tiene nuevas reinas",
    teamCount: 6,
    prizeFirst: 700,
    prizeSecond: 150,
    startDate: "2026-08-13",
    finalDate: "2026-08-16",
    winPoints: 1,
    pauseCount: 2,
    pauseMinutes: 10,
    lobbyTolerance: 15,
    registrationOpen: true,
    kickChannel: "fortuna2121"
  },
  teams: [
    {
      id: "ositos",
      name: "Ositos Barberos",
      captain: "Nara",
      shortName: "OSB",
      accent: "#ff4da6",
      group: "A",
      players: [
        player("ositos-juancito", "Juancito", "HC", 5.6, "466347841"),
        player("ositos-orage", "Orage", "MID", 7.2, "349233921"),
        player("ositos-wawita", "Wawita Sagaz", "OFF", 5.7, "1150842229"),
        player("ositos-ilysm", "ILYSM", "Support 4", 5.4, "219752725"),
        player("ositos-nara", "Nara", "Support 5", 4.3, "455750570", true)
      ]
    },
    {
      id: "monopolio",
      name: "Monopolio de las Bellezas",
      captain: "Narks",
      shortName: "MDB",
      accent: "#b66cff",
      group: "B",
      players: [
        player("monopolio-guapo", "El mas guapo", "HC", 8, "1003915015"),
        player("monopolio-bello", "El bello", "MID", 7, "364162852"),
        player("monopolio-hermoso", "El hermoso", "OFF", 6, "423169118"),
        player("monopolio-bonito", "El bonito", "Support 4", 5.5, "398415602"),
        player("monopolio-narks", "Narks", "Support 5", 3.5, "484349291", true)
      ]
    },
    {
      id: "gatitos",
      name: "Escuadron de Gatitos",
      captain: "Ratadri",
      shortName: "EGT",
      accent: "#53d8fb",
      group: "A",
      players: [
        player("gatitos-figaro", "Figaro", "HC", 4.2, "146763999"),
        player("gatitos-dashiro", "Dashiro", "MID", 7, "169624551"),
        player("gatitos-daddy", "Daddy Jr", "OFF", 9, "1550066158"),
        player("gatitos-kimochi", "Kimochi", "Support 4", 7, "1061151981"),
        player("gatitos-ratadri", "Ratadri", "Support 5", 2, "197165807", true)
      ]
    },
    {
      id: "shiro",
      name: "TEAM SHIRO",
      captain: "Shiro",
      shortName: "SHI",
      accent: "#ffbd59",
      group: "B",
      players: [
        player("shiro-lovebomb", "Lovebomb", "HC", 6.5, "158478618"),
        player("shiro-nameless", "Nameless", "MID", 9, "132993531"),
        player("shiro-gigio", "Gigio", "OFF", 5.5, "149485007"),
        player("shiro-yeretrex", "Yeretrex", "Support 4", 5.5, "401431527"),
        player("shiro-shiro", "Shiro", "Support 5", 3.5, "894945180", true)
      ]
    },
    {
      id: "luz",
      name: "LUZ +4",
      captain: "Luz Marley",
      shortName: "LUZ",
      accent: "#f36b6b",
      group: "B",
      players: [
        player("luz-marley", "Luz Marley", "HC", 3.5, "805914755", true),
        player("luz-85112", "85112", "MID", 9.5, "246008056"),
        player("luz-xddd", "XDDD", "OFF", 10, "1105802067"),
        player("luz-chavito", "Chavito", "Support 4", 3, "1620660801"),
        player("luz-sneyking", "Sneyking", "Support 5", 4, "123054871")
      ]
    },
    {
      id: "aleroif",
      name: "TEAM ALEROIF",
      captain: "Ale",
      shortName: "ALR",
      accent: "#6fe7b7",
      group: "A",
      players: [
        player("aleroif-jhems", "Jhems", "HC", 6.8, "829168033"),
        player("aleroif-curita", "Curita", "MID", 5.6, "126767364"),
        player("aleroif-sere", "Sere", "OFF", 7.3, "1126542567"),
        player("aleroif-yuso", "Yuso", "Support 4", 4.5, "323859245"),
        player("aleroif-ale", "Ale", "Support 5", 5.6, "863441216", true)
      ]
    }
  ],
  matches: [
    { id: "m1", teamA: "ositos", teamB: "gatitos", date: "2026-08-13", time: "20:20", bestOf: 3, stage: "Todos contra todos", status: "Programado", scoreA: 0, scoreB: 0 },
    { id: "m2", teamA: "aleroif", teamB: "gatitos", date: "2026-08-13", time: "21:40", bestOf: 3, stage: "Todos contra todos", status: "Programado", scoreA: 0, scoreB: 0 },
    { id: "m3", teamA: "monopolio", teamB: "shiro", date: "2026-08-13", time: "22:50", bestOf: 3, stage: "Todos contra todos", status: "Programado", scoreA: 0, scoreB: 0 }
  ],
  rules: [
    "La fase de grupos se juega con los seis equipos divididos en Grupo A y Grupo B.",
    "Grupo A: Ositos Barberos, Escuadron de Gatitos y TEAM ALEROIF.",
    "Grupo B: Monopolio de las Bellezas, TEAM SHIRO y LUZ +4.",
    "Cada victoria en la fase de grupos otorga 1 punto.",
    "Los resultados de cada serie se registran desde el panel y actualizan automáticamente la tabla.",
    "Upper Bracket: series BO3. Lower Bracket: series BO1.",
    "Cada equipo dispone de dos pausas de hasta diez minutos durante la serie.",
    "La tolerancia máxima para ingresar a la sala de espera es de quince minutos.",
    "Los casos de desconexión, walkover, sustituciones y conducta serán resueltos por la organización."
  ]
};
