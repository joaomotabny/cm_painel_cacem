const STATION_CODE = "9461002";

const URLS = [
  `https://servicos.infraestruturasdeportugal.pt/estacoes?estacaoId=${STATION_CODE}`,
  `https://servicos.infraestruturasdeportugal.pt/pt-pt/estacoes?estacaoId=${STATION_CODE}`
];


function contar(texto, regex) {

  const matches =
    String(texto).match(regex);

  return matches
    ? matches.length
    : 0;

}


function extrairScripts(html, baseUrl) {

  const scripts = [];

  const regex =
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;

  let match;


  while (
    (match = regex.exec(html)) !== null
  ) {

    try {

      scripts.push(
        new URL(
          match[1],
          baseUrl
        ).href
      );

    }

    catch (_) {}

  }


  return [
    ...new Set(scripts)
  ];

}


function extrairCandidatos(html) {

  const candidatos =
    new Set();


  /*
    Procura URLs absolutas
  */

  const absolutas =
    html.match(
      /https?:\/\/[^"'<>\\\s]+/gi
    ) || [];


  absolutas.forEach(
    url => {

      const limpa =
        url
          .replace(/&amp;/g, "&")
          .replace(/[),;]+$/, "");


      if (
        /ajax|api|view|combo|train|partida|chegada|horar|estac/i
          .test(limpa)
      ) {

        candidatos.add(
          limpa
        );

      }

    }
  );


  /*
    Procura caminhos relativos interessantes
  */

  const relativos =
    html.match(
      /["'](\/[^"'<>\\\s]+)["']/g
    ) || [];


  relativos.forEach(
    entrada => {

      const limpa =
        entrada
          .slice(1, -1)
          .replace(/&amp;/g, "&");


      if (
        /ajax|api|view|combo|train|partida|chegada|horar|estac/i
          .test(limpa)
      ) {

        candidatos.add(
          limpa
        );

      }

    }
  );


  return Array
    .from(candidatos)
    .slice(0, 50);

}


function snippet(
  html,
  termo,
  tamanho = 350
) {

  const lower =
    html.toLowerCase();


  const pos =
    lower.indexOf(
      termo.toLowerCase()
    );


  if (
    pos === -1
  ) {

    return null;

  }


  const inicio =
    Math.max(
      0,
      pos - tamanho
    );


  const fim =
    Math.min(
      html.length,
      pos + termo.length + tamanho
    );


  return html
    .slice(
      inicio,
      fim
    )
    .replace(
      /\s+/g,
      " "
    );

}


async function analisarPagina(
  url
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "pt-PT,pt;q=0.9,en;q=0.7",

          "Cache-Control":
            "no-cache"

        },

        cache:
          "no-store",

        redirect:
          "follow"

      }
    );


  const html =
    await response.text();


  const termos = [

    "drupalSettings",

    "views/ajax",

    "ajax",

    "estacaoId",

    "comboios",

    "partidas",

    "chegadas",

    "horarios",

    "A carregar resultados"

  ];


  const snippets =
    {};


  termos.forEach(
    termo => {

      const valor =
        snippet(
          html,
          termo
        );


      if (valor) {

        snippets[termo] =
          valor;

      }

    }
  );


  return {

    url,

    status:
      response.status,

    finalUrl:
      response.url,

    bytes:
      html.length,

    tr:
      contar(
        html,
        /<tr\b/gi
      ),

    td:
      contar(
        html,
        /<td\b/gi
      ),

    contemAgualva:
      /AGUALVA[\s\-–]*CAC[EÉ]M/i
        .test(html),

    contemComboios:
      /comboios/i
        .test(html),

    contemHora:
      /\b\d{1,2}:\d{2}\b/
        .test(html),

    scripts:
      extrairScripts(
        html,
        response.url
      ),

    candidatos:
      extrairCandidatos(
        html
      ),

    snippets

  };

}


export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  try {

    const resultados =
      [];


    for (
      const url of URLS
    ) {

      try {

        resultados.push(
          await analisarPagina(
            url
          )
        );

      }

      catch (
        erro
      ) {

        resultados.push({

          url,

          erro:
            erro.message

        });

      }

    }


    return res
      .status(200)
      .json({

        estacao:
          STATION_CODE,

        momento:
          new Date()
            .toISOString(),

        resultados

      });

  }

  catch (
    erro
  ) {

    return res
      .status(500)
      .json({

        erro:
          erro.message

      });

  }

}
