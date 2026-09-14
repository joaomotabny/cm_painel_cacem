import AdmZip from "adm-zip";


/* ==================================================
   CONFIGURAÇÃO
================================================== */

const GTFS_URL =
  "https://publico.cp.pt/gtfs/gtfs.zip";


const STOP_ID =
  "94_61002";


const TIME_ZONE =
  "Europe/Lisbon";


const CACHE_KEY =
  "__cp_gtfs_agualva_v1";


const CACHE_MAX_AGE =
  6 * 60 * 60 * 1000;


/* ==================================================
   CSV
================================================== */

function parseCSVLine(line) {

  const values = [];

  let value = "";
  let quoted = false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const char =
      line[i];


    if (
      char === '"'
    ) {

      if (
        quoted &&
        line[i + 1] === '"'
      ) {

        value += '"';

        i++;

      }

      else {

        quoted =
          !quoted;

      }

    }

    else if (
      char === "," &&
      !quoted
    ) {

      values.push(
        value
      );

      value = "";

    }

    else {

      value +=
        char;

    }

  }


  values.push(
    value
  );


  return values;

}


function linhasCSV(texto) {

  return String(texto)

    .replace(
      /^\uFEFF/,
      ""
    )

    .split(
      /\r?\n/
    )

    .filter(
      linha =>
        linha.trim() !== ""
    );

}


/* ==================================================
   TEXTO
================================================== */

function normalizarTexto(
  texto = ""
) {

  return String(texto)

    .toUpperCase()

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .trim();

}


/* ==================================================
   ZIP
================================================== */

function lerFicheiro(
  zip,
  nome,
  opcional = false
) {

  const entry =
    zip.getEntry(
      nome
    );


  if (
    !entry
  ) {

    if (
      opcional
    ) {

      return "";

    }


    throw new Error(
      `GTFS sem ${nome}`
    );

  }


  return entry
    .getData()
    .toString(
      "utf8"
    );

}


/* ==================================================
   STOP TIMES
================================================== */

function parseStopTimes(
  texto
) {

  const linhas =
    linhasCSV(
      texto
    );


  if (
    linhas.length === 0
  ) {

    return [];

  }


  const header =
    parseCSVLine(
      linhas[0]
    );


  const tripIndex =
    header.indexOf(
      "trip_id"
    );


  const stopIndex =
    header.indexOf(
      "stop_id"
    );


  const departureIndex =
    header.indexOf(
      "departure_time"
    );


  const arrivalIndex =
    header.indexOf(
      "arrival_time"
    );


  const pickupIndex =
    header.indexOf(
      "pickup_type"
    );


  const resultado =
    [];


  for (
    let i = 1;
    i < linhas.length;
    i++
  ) {

    const row =
      parseCSVLine(
        linhas[i]
      );


    if (
      row[stopIndex] !==
      STOP_ID
    ) {

      continue;

    }


    /*
      pickup_type = 1
      significa sem embarque.
    */

    if (
      pickupIndex >= 0 &&
      row[pickupIndex] === "1"
    ) {

      continue;

    }


    const hora =

      row[departureIndex]

      ||

      row[arrivalIndex];


    if (
      !hora
    ) {

      continue;

    }


    resultado.push({

      trip_id:
        row[tripIndex],

      departure_time:
        hora

    });

  }


  return resultado;

}


/* ==================================================
   TRIPS
================================================== */

function parseTrips(
  texto,
  tripIds
) {

  const linhas =
    linhasCSV(
      texto
    );


  const header =
    parseCSVLine(
      linhas[0]
    );


  const tripIndex =
    header.indexOf(
      "trip_id"
    );


  const serviceIndex =
    header.indexOf(
      "service_id"
    );


  const headsignIndex =
    header.indexOf(
      "trip_headsign"
    );


  const shortNameIndex =
    header.indexOf(
      "trip_short_name"
    );


  const routeIndex =
    header.indexOf(
      "route_id"
    );


  const resultado =
    new Map();


  for (
    let i = 1;
    i < linhas.length;
    i++
  ) {

    const row =
      parseCSVLine(
        linhas[i]
      );


    const tripId =
      row[tripIndex];


    if (
      !tripIds.has(
        tripId
      )
    ) {

      continue;

    }


    resultado.set(
      tripId,
      {

        trip_id:
          tripId,

        service_id:
          row[serviceIndex],

        destino:
          headsignIndex >= 0
            ? row[headsignIndex]
            : "",

        numero:
          shortNameIndex >= 0
            ? row[shortNameIndex]
            : "",

        route_id:
          routeIndex >= 0
            ? row[routeIndex]
            : ""

      }
    );

  }


  return resultado;

}


/* ==================================================
   CALENDAR
================================================== */

function parseCalendar(
  texto
) {

  const linhas =
    linhasCSV(
      texto
    );


  const header =
    parseCSVLine(
      linhas[0]
    );


  const indexes = {

    service:
      header.indexOf(
        "service_id"
      ),

    monday:
      header.indexOf(
        "monday"
      ),

    tuesday:
      header.indexOf(
        "tuesday"
      ),

    wednesday:
      header.indexOf(
        "wednesday"
      ),

    thursday:
      header.indexOf(
        "thursday"
      ),

    friday:
      header.indexOf(
        "friday"
      ),

    saturday:
      header.indexOf(
        "saturday"
      ),

    sunday:
      header.indexOf(
        "sunday"
      ),

    start:
      header.indexOf(
        "start_date"
      ),

    end:
      header.indexOf(
        "end_date"
      )

  };


  const resultado =
    new Map();


  for (
    let i = 1;
    i < linhas.length;
    i++
  ) {

    const row =
      parseCSVLine(
        linhas[i]
      );


    resultado.set(
      row[indexes.service],
      {

        monday:
          row[indexes.monday],

        tuesday:
          row[indexes.tuesday],

        wednesday:
          row[indexes.wednesday],

        thursday:
          row[indexes.thursday],

        friday:
          row[indexes.friday],

        saturday:
          row[indexes.saturday],

        sunday:
          row[indexes.sunday],

        start_date:
          row[indexes.start],

        end_date:
          row[indexes.end]

      }
    );

  }


  return resultado;

}


/* ==================================================
   CALENDAR DATES
================================================== */

function parseCalendarDates(
  texto
) {

  const resultado =
    new Map();


  if (
    !texto
  ) {

    return resultado;

  }


  const linhas =
    linhasCSV(
      texto
    );


  if (
    linhas.length === 0
  ) {

    return resultado;

  }


  const header =
    parseCSVLine(
      linhas[0]
    );


  const serviceIndex =
    header.indexOf(
      "service_id"
    );


  const dateIndex =
    header.indexOf(
      "date"
    );


  const typeIndex =
    header.indexOf(
      "exception_type"
    );


  for (
    let i = 1;
    i < linhas.length;
    i++
  ) {

    const row =
      parseCSVLine(
        linhas[i]
      );


    resultado.set(

      `${row[serviceIndex]}|${row[dateIndex]}`,

      row[typeIndex]

    );

  }


  return resultado;

}


/* ==================================================
   DATA / HORA DE LISBOA
================================================== */

function agoraLisboa() {

  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {

        timeZone:
          TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23"

      }
    );


  const parts =
    formatter
      .formatToParts(
        new Date()
      );


  const obj =
    {};


  for (
    const part of parts
  ) {

    if (
      part.type !==
      "literal"
    ) {

      obj[part.type] =
        part.value;

    }

  }


  return {

    year:
      Number(
        obj.year
      ),

    month:
      Number(
        obj.month
      ),

    day:
      Number(
        obj.day
      ),

    hour:
      Number(
        obj.hour
      ),

    minute:
      Number(
        obj.minute
      )

  };

}


function pad2(
  valor
) {

  return String(valor)
    .padStart(
      2,
      "0"
    );

}


function infoData(
  base,
  delta
) {

  const date =
    new Date(
      Date.UTC(

        base.year,

        base.month - 1,

        base.day + delta

      )
    );


  const year =
    date.getUTCFullYear();


  const month =
    date.getUTCMonth() + 1;


  const day =
    date.getUTCDate();


  const weekdays = [

    "sunday",

    "monday",

    "tuesday",

    "wednesday",

    "thursday",

    "friday",

    "saturday"

  ];


  return {

    delta,

    weekday:
      weekdays[
        date.getUTCDay()
      ],

    gtfs:
      `${year}${pad2(month)}${pad2(day)}`

  };

}


/* ==================================================
   SERVIÇO ATIVO
================================================== */

function servicoAtivo(
  serviceId,
  data,
  calendar,
  exceptions
) {

  let ativo =
    false;


  const regra =
    calendar.get(
      serviceId
    );


  if (
    regra &&
    data.gtfs >= regra.start_date &&
    data.gtfs <= regra.end_date &&
    regra[data.weekday] === "1"
  ) {

    ativo =
      true;

  }


  const exception =
    exceptions.get(
      `${serviceId}|${data.gtfs}`
    );


  /*
    1 = serviço adicionado
    2 = serviço removido
  */

  if (
    exception === "1"
  ) {

    ativo =
      true;

  }


  if (
    exception === "2"
  ) {

    ativo =
      false;

  }


  return ativo;

}


/* ==================================================
   HORA GTFS

   Aceita também:
   24:10:00
   25:30:00
   etc.
================================================== */

function minutosGTFS(
  hora
) {

  const match =
    String(hora)
      .match(
        /^(\d+):(\d{2})(?::(\d{2}))?$/
      );


  if (
    !match
  ) {

    return null;

  }


  return (
    Number(match[1]) *
      60
    +
    Number(match[2])
  );

}


function formatarMinutos(
  total
) {

  const normalizado =
    (
      total %
      1440
      +
      1440
    )
    %
    1440;


  const horas =
    Math.floor(
      normalizado /
      60
    );


  const minutos =
    normalizado %
    60;


  return (
    pad2(horas)
    +
    ":"
    +
    pad2(minutos)
  );

}


/* ==================================================
   CARREGAR GTFS
================================================== */

async function carregarGTFS() {

  const cache =
    globalThis[
      CACHE_KEY
    ];


  if (
    cache &&
    Date.now() -
      cache.guardadoEm <
      CACHE_MAX_AGE
  ) {

    return cache.dados;

  }


  const resposta =
    await fetch(
      GTFS_URL,
      {

        headers: {

          "User-Agent":
            "Mozilla/5.0",

          "Accept":
            "application/zip,*/*"

        },

        cache:
          "no-store"

      }
    );


  if (
    !resposta.ok
  ) {

    throw new Error(
      `GTFS CP respondeu HTTP ${resposta.status}`
    );

  }


  const buffer =
    Buffer.from(
      await resposta.arrayBuffer()
    );


  /*
    Um ZIP começa por PK.
  */

  if (
    buffer.length < 2 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b
  ) {

    throw new Error(
      "A CP não devolveu um ficheiro GTFS ZIP válido."
    );

  }


  const zip =
    new AdmZip(
      buffer
    );


  const stopTimes =
    parseStopTimes(

      lerFicheiro(
        zip,
        "stop_times.txt"
      )

    );


  const tripIds =
    new Set(

      stopTimes.map(
        x =>
          x.trip_id
      )

    );


  const trips =
    parseTrips(

      lerFicheiro(
        zip,
        "trips.txt"
      ),

      tripIds

    );


  const calendar =
    parseCalendar(

      lerFicheiro(
        zip,
        "calendar.txt"
      )

    );


  const calendarDates =
    parseCalendarDates(

      lerFicheiro(
        zip,
        "calendar_dates.txt",
        true
      )

    );


  const dados = {

    stopTimes,

    trips,

    calendar,

    calendarDates

  };


  globalThis[
    CACHE_KEY
  ] = {

    guardadoEm:
      Date.now(),

    dados

  };


  return dados;

}


/* ==================================================
   PARTIDAS BASE

   Esta função também é usada pelo
   partidas-todas.js.
================================================== */

export async function obterPartidasBase() {

  const gtfs =
    await carregarGTFS();


  const agora =
    agoraLisboa();


  const minutoAtual =

    agora.hour *
      60

    +

    agora.minute;


  /*
    Ontem:
    apanha serviços depois das 24:00

    Hoje:
    serviço normal

    Amanhã:
    próximas partidas depois da meia-noite
  */

  const datas = [

    infoData(
      agora,
      -1
    ),

    infoData(
      agora,
      0
    ),

    infoData(
      agora,
      1
    )

  ];


  const resultado =
    [];


  const unicos =
    new Set();


  for (
    const data of datas
  ) {


    for (
      const stopTime of
      gtfs.stopTimes
  ) {


      const trip =
        gtfs.trips.get(
          stopTime.trip_id
        );


      if (
        !trip
      ) {

        continue;

      }


      if (
        !servicoAtivo(

          trip.service_id,

          data,

          gtfs.calendar,

          gtfs.calendarDates

        )
      ) {

        continue;

      }


      const minutos =
        minutosGTFS(
          stopTime.departure_time
        );


      if (
        minutos === null
      ) {

        continue;

      }


      /*
        Linha temporal em minutos,
        relativa ao dia de hoje.
      */

      const absoluto =

        data.delta *
          1440

        +

        minutos;


      /*
        Só futuras partidas,
        nas próximas 24 horas.
      */

      if (
        absoluto <
          minutoAtual - 1
      ) {

        continue;

      }


      if (
        absoluto >
          minutoAtual + 1440
      ) {

        continue;

      }


      const chave =

        `${data.gtfs}|${trip.trip_id}|${minutos}`;


      if (
        unicos.has(
          chave
        )
      ) {

        continue;

      }


      unicos.add(
        chave
      );


      resultado.push({

        hora:
          formatarMinutos(
            minutos
          ),

        destinoOriginal:
          trip.destino,

        comboio:
          trip.numero
          ||
          trip.trip_id,

        tripId:
          trip.trip_id,

        routeId:
          trip.route_id,

        _ordem:
          absoluto

      });

    }

  }


  resultado.sort(

    (a, b) =>
      a._ordem -
      b._ordem

  );


  return resultado;

}


/* ==================================================
   DESTINOS VELEC

   Apenas sentido Lisboa.
================================================== */

function destinoVelec(
  destinoOriginal
) {

  const destino =
    normalizarTexto(
      destinoOriginal
    );


  if (
    destino.includes(
      "ORIENTE"
    )
  ) {

    return "LISBOA-ORIENTE";

  }


  if (
    destino.includes(
      "ALVERCA"
    )
  ) {

    return "ALVERCA";

  }


  if (
    destino.includes(
      "APOLONIA"
    )
  ) {

    return "LISBOA-S.A";

  }


  return null;

}


/* ==================================================
   API /api/partidas
================================================== */

export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );


  res.setHeader(
    "Cache-Control",
    "public, s-maxage=30, stale-while-revalidate=300"
  );


  try {

    const base =
      await obterPartidasBase();


    const partidas =

      base

        .map(
          item => {


            const destino =
              destinoVelec(
                item.destinoOriginal
              );


            if (
              !destino
            ) {

              return null;

            }


            return {

              hora:
                item.hora,

              destino,

              destinoOriginal:
                item.destinoOriginal,

              comboio:
                item.comboio,

              /*
                No VELEC estamos a usar
                sempre a linha 3.
              */

              via:
                "3"

            };

          }
        )

        .filter(
          Boolean
        )

        .slice(
          0,
          12
        );


    return res
      .status(200)
      .json({

        estacao:
          "AGUALVA-CACÉM",

        stopId:
          STOP_ID,

        fonte:
          "CP GTFS",

        atualizadoEm:
          new Date()
            .toISOString(),

        total:
          partidas.length,

        partidas

      });

  }

  catch (
    erro
  ) {

    console.error(
      erro
    );


    return res
      .status(503)
      .json({

        error:
          "Não foi possível obter as partidas.",

        detalhe:
          erro.message,

        partidas:
          []

      });

  }

}
