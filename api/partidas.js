/* ==================================================
   VELEC — PARTIDAS AGUALVA-CACÉM

   Fonte:
   CP station/trains

   Estação CP:
   Agualva-Cacém = 94-61002
================================================== */


const STATION_ID =
  "94-61002";


const CP_URL =
  `https://www.cp.pt/sites/spring/station/trains?stationId=${STATION_ID}`;


/* ==================================================
   HEADERS
================================================== */

const HEADERS = {

  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",

  "Accept":
    "application/json, text/plain, */*",

  "Accept-Language":
    "pt-PT,pt;q=0.9,en;q=0.7",

  "Referer":
    "https://www.cp.pt/",

  "Origin":
    "https://www.cp.pt"

};


/* ==================================================
   RETIRAR ACENTOS
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
   DESTINOS DO VELEC
================================================== */

function normalizarDestino(
  destinoOriginal
) {

  const destino =
    normalizarTexto(
      destinoOriginal
    );


  /* LISBOA ORIENTE */

  if (
    destino.includes(
      "ORIENTE"
    )
  ) {

    return "LISBOA-ORIENTE";

  }


  /* ALVERCA */

  if (
    destino.includes(
      "ALVERCA"
    )
  ) {

    return "ALVERCA";

  }


  /* SANTA APOLÓNIA */

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
   NORMALIZAR HORA
================================================== */

function normalizarHora(
  hora
) {

  if (!hora) {

    return null;

  }


  const texto =
    String(hora)
      .trim();


  /*
    Se vier simplesmente:
    22:29
  */

  const simples =
    texto.match(
      /\b(\d{1,2}):(\d{2})\b/
    );


  if (
    simples
  ) {

    return (
      simples[1]
        .padStart(2, "0")
      +
      ":"
      +
      simples[2]
    );

  }


  return null;

}


/* ==================================================
   CACHE EM MEMÓRIA

   Se a CP falhar momentaneamente,
   mantém a última resposta válida.
================================================== */

const CACHE_KEY =
  "__velec_cp_partidas_v1";


const CACHE_MAX_AGE =
  30 * 60 * 1000;


function guardarCache(
  partidas
) {

  globalThis[
    CACHE_KEY
  ] = {

    guardadoEm:
      Date.now(),

    partidas

  };

}


function lerCache() {

  const cache =
    globalThis[
      CACHE_KEY
    ];


  if (
    !cache
  ) {

    return null;

  }


  if (
    Date.now() -
    cache.guardadoEm >
    CACHE_MAX_AGE
  ) {

    return null;

  }


  return cache;

}


/* ==================================================
   FETCH COM TIMEOUT
================================================== */

async function obterCP() {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      8000
    );


  try {

    const resposta =
      await fetch(
        CP_URL,
        {

          method:
            "GET",

          headers:
            HEADERS,

          cache:
            "no-store",

          redirect:
            "follow",

          signal:
            controller.signal

        }
      );


    if (
      !resposta.ok
    ) {

      throw new Error(
        `CP respondeu HTTP ${resposta.status}`
      );

    }


    const dados =
      await resposta.json();


    if (
      !Array.isArray(
        dados
      )
    ) {

      throw new Error(
        "A CP respondeu num formato inesperado."
      );

    }


    return dados;

  }

  finally {

    clearTimeout(
      timeout
    );

  }

}


/* ==================================================
   CONVERTER RESPOSTA CP
================================================== */

function converterPartidas(
  dados
) {

  const partidas =
    [];


  const encontrados =
    new Set();


  for (
    const comboio of dados
  ) {


    const destinoOriginal =

      comboio
        ?.trainDestination
        ?.designation

      ||

      "";


    const destino =
      normalizarDestino(
        destinoOriginal
      );


    /*
      Para este VELEC só queremos:
      Oriente
      Alverca
      Santa Apolónia
    */

    if (
      !destino
    ) {

      continue;

    }


    const hora =
      normalizarHora(
        comboio.departureTime
      );


    if (
      !hora
    ) {

      continue;

    }


    const numero =
      comboio.trainNumber
      ?? "";


    /*
      Evitar duplicados.
    */

    const chave =
      `${hora}|${numero}|${destino}`;


    if (
      encontrados.has(
        chave
      )
    ) {

      continue;

    }


    encontrados.add(
      chave
    );


    partidas.push({

      hora,

      destino,

      destinoOriginal,

      comboio:
        String(numero),

      servico:
        comboio
          ?.trainService
          ?.designation
        || "",

      origem:
        comboio
          ?.trainOrigin
          ?.designation
        || "",

      via:
        comboio.platform
        ?? "",

      atraso:
        comboio.delay
        ?? 0

    });

  }


  /*
    A CP normalmente já envia
    os comboios por ordem cronológica.

    Mesmo assim, garantimos a ordenação.
  */

  partidas.sort(
    (a, b) => {

      return a.hora
        .localeCompare(
          b.hora
        );

    }
  );


  return partidas;

}


/* ==================================================
   HANDLER VERCEL
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
    "Access-Control-Allow-Methods",
    "GET,OPTIONS"
  );


  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  res.setHeader(
    "Cache-Control",
    "public, s-maxage=15, stale-while-revalidate=120"
  );


  if (
    req.method ===
    "OPTIONS"
  ) {

    return res
      .status(200)
      .end();

  }


  try {

    const dados =
      await obterCP();


    const partidas =
      converterPartidas(
        dados
      );


    if (
      partidas.length === 0
    ) {

      throw new Error(
        "A CP respondeu, mas não foram encontradas partidas para Oriente, Alverca ou Santa Apolónia."
      );

    }


    guardarCache(
      partidas
    );


    return res
      .status(200)
      .json({

        estacao:
          "AGUALVA-CACÉM",

        stationId:
          STATION_ID,

        fonte:
          "CP",

        atualizadoEm:
          new Date()
            .toISOString(),

        stale:
          false,

        total:
          partidas.length,

        partidas:
          partidas.slice(
            0,
            12
          )

      });

  }

  catch (
    erro
  ) {


    console.error(
      "Erro CP:",
      erro
    );


    /*
      Tentar manter a última
      informação válida.
    */

    const cache =
      lerCache();


    if (
      cache &&
      cache.partidas.length > 0
    ) {

      return res
        .status(200)
        .json({

          estacao:
            "AGUALVA-CACÉM",

          stationId:
            STATION_ID,

          fonte:
            "CP",

          stale:
            true,

          atualizadoEm:
            new Date(
              cache.guardadoEm
            ).toISOString(),

          aviso:
            erro.message,

          total:
            cache.partidas.length,

          partidas:
            cache.partidas.slice(
              0,
              12
            )

        });

    }


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
