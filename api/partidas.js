const STATION_CODE = '9461002';

const SOURCE_BASE =
  'https://servicos.infraestruturasdeportugal.pt/estacoes';

const MEMORY_CACHE_KEY =
  '__cacem_partidas_cache_v2';

const MEMORY_CACHE_MAX_AGE =
  30 * 60 * 1000;


/* ==================================================
   TEXTO
================================================== */

function semAcentos(texto = '') {

  return String(texto)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

}


function decodeHtml(texto = '') {

  const mapa = {

    '&nbsp;': ' ',

    '&amp;': '&',

    '&quot;': '"',

    '&#39;': "'",

    '&apos;': "'",

    '&aacute;': 'á',

    '&agrave;': 'à',

    '&acirc;': 'â',

    '&atilde;': 'ã',

    '&eacute;': 'é',

    '&ecirc;': 'ê',

    '&iacute;': 'í',

    '&oacute;': 'ó',

    '&ocirc;': 'ô',

    '&otilde;': 'õ',

    '&uacute;': 'ú',

    '&ccedil;': 'ç',

    '&Aacute;': 'Á',

    '&Eacute;': 'É',

    '&Iacute;': 'Í',

    '&Oacute;': 'Ó',

    '&Uacute;': 'Ú',

    '&Ccedil;': 'Ç'

  };


  let saida =
    String(texto);


  Object.entries(mapa)
    .forEach(
      ([entidade, valor]) => {

        saida =
          saida
            .split(entidade)
            .join(valor);

      }
    );


  saida =
    saida

      .replace(
        /&#(\d+);/g,

        (_, n) =>
          String.fromCharCode(
            Number(n)
          )
      )

      .replace(
        /&#x([0-9a-f]+);/gi,

        (_, n) =>
          String.fromCharCode(
            parseInt(n, 16)
          )
      );


  return saida;

}


function limparCelula(
  html = ''
) {

  return decodeHtml(

    String(html)

      .replace(
        /<br\s*\/?\s*>/gi,
        ' '
      )

      .replace(
        /<[^>]+>/g,
        ' '
      )

  )

    .replace(
      /\s+/g,
      ' '
    )

    .trim();

}


/* ==================================================
   HTML ESCAPADO
================================================== */

function desescaparMarkup(
  html = ''
) {

  return String(html)

    .replace(
      /\\u003c/gi,
      '<'
    )

    .replace(
      /\\u003e/gi,
      '>'
    )

    .replace(
      /\\u0026/gi,
      '&'
    )

    .replace(
      /\\\//g,
      '/'
    )

    .replace(
      /&lt;/gi,
      '<'
    )

    .replace(
      /&gt;/gi,
      '>'
    );

}


/* ==================================================
   EXTRAIR LINHAS
================================================== */

function extrairLinhas(
  html = ''
) {

  const versoes = [

    String(html),

    desescaparMarkup(
      html
    )

  ];


  const linhas =
    [];


  const chaves =
    new Set();


  for (
    const documento of versoes
  ) {


    const rowRegex =
      /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;


    let rowMatch;


    while (
      (
        rowMatch =
          rowRegex.exec(
            documento
          )
      ) !== null
    ) {


      const row =
        rowMatch[1];


      const cells =
        [];


      const cellRegex =
        /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;


      let cellMatch;


      while (
        (
          cellMatch =
            cellRegex.exec(row)
        ) !== null
      ) {


        cells.push(

          limparCelula(
            cellMatch[1]
          )

        );


      }


      /*
        Já não assumimos que a hora
        está obrigatoriamente na célula 0.
      */

      const indiceHora =
        cells.findIndex(
          c =>
            /\b\d{1,2}:\d{2}\b/
              .test(c)
        );


      if (
        indiceHora < 0 ||
        cells.length <
          indiceHora + 5
      ) {

        continue;

      }


      const horaMatch =
        cells[indiceHora]
          .match(
            /\b(\d{1,2}:\d{2})\b/
          );


      if (!horaMatch) {

        continue;

      }


      const hora =
        horaMatch[1]
          .padStart(
            5,
            '0'
          );


      const comboio =
        cells[indiceHora + 1] ||
        '';


      const servico =
        cells[indiceHora + 2] ||
        '';


      const origem =
        cells[indiceHora + 3] ||
        '';


      const destinoOriginal =
        cells[indiceHora + 4] ||
        '';


      const operador =
        cells[indiceHora + 5] ||
        '';


      const observacoes =
        cells

          .slice(
            indiceHora + 6
          )

          .join(' ')

          .trim();


      if (
        !/^\d{2}:\d{2}$/
          .test(hora)
        ||
        !destinoOriginal
      ) {

        continue;

      }


      const chave =
        `${hora}|${comboio}|${destinoOriginal}`;


      if (
        chaves.has(
          chave
        )
      ) {

        continue;

      }


      chaves.add(
        chave
      );


      linhas.push({

        hora,

        comboio,

        servico,

        origem,

        destinoOriginal,

        operador,

        observacoes

      });


    }

  }


  return linhas;

}


/* ==================================================
   DESTINOS DO VELEC
================================================== */

function destinoVelec(
  destinoOriginal
) {

  const destino =
    semAcentos(
      destinoOriginal
    );


  if (
    destino.includes(
      'ORIENTE'
    )
  ) {

    return 'LISBOA-ORIENTE';

  }


  if (
    destino === 'ALVERCA'
    ||
    destino.endsWith(
      '-ALVERCA'
    )
  ) {

    return 'ALVERCA';

  }


  /*
    Apanha também:
    LISBOA-APOLÓNIA
  */

  if (
    destino.includes(
      'APOLONIA'
    )
  ) {

    return 'LISBOA-S.A';

  }


  return null;

}


/* ==================================================
   CACHE DA FUNÇÃO VERCEL
================================================== */

function lerCache() {

  const cache =
    globalThis[
      MEMORY_CACHE_KEY
    ];


  if (!cache) {

    return null;

  }


  if (
    Date.now() -
    cache.guardadoEm >
    MEMORY_CACHE_MAX_AGE
  ) {

    return null;

  }


  return cache;

}


function guardarCache(
  partidas
) {

  globalThis[
    MEMORY_CACHE_KEY
  ] = {

    guardadoEm:
      Date.now(),

    partidas

  };

}


/* ==================================================
   FETCH COM TIMEOUT
================================================== */

async function fetchComTimeout(

  url,

  headers,

  timeoutMs = 6500

) {


  const controller =
    new AbortController();


  const timer =
    setTimeout(

      () =>
        controller.abort(),

      timeoutMs

    );


  try {


    return await fetch(
      url,
      {

        method:
          'GET',

        headers,

        cache:
          'no-store',

        redirect:
          'follow',

        signal:
          controller.signal

      }
    );


  }

  finally {


    clearTimeout(
      timer
    );


  }

}


/* ==================================================
   OBTER DADOS DA IP
================================================== */

async function obterLinhasIP() {


  /*
    Fazemos duas tentativas com
    perfis de browser diferentes.
  */

  const headersList = [


    {

      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',

      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

      'Accept-Language':
        'pt-PT,pt;q=0.9,en;q=0.7',

      'Cache-Control':
        'no-cache',

      'Pragma':
        'no-cache'

    },


    {

      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',

      'Accept':
        'text/html,application/xhtml+xml,*/*;q=0.8',

      'Accept-Language':
        'pt-PT,pt;q=0.9',

      'Cache-Control':
        'no-cache'

    }


  ];


  let ultimoErro =
    'A IP não devolveu uma tabela de comboios.';


  for (
    let tentativa = 0;
    tentativa <
      headersList.length;
    tentativa++
  ) {


    const url =

      `${SOURCE_BASE}?estacaoId=${STATION_CODE}&_=${Date.now()}-${tentativa}`;


    try {


      const response =
        await fetchComTimeout(

          url,

          headersList[
            tentativa
          ]

        );


      const html =
        await response.text();


      if (
        !response.ok
      ) {


        ultimoErro =
          `IP respondeu HTTP ${response.status}`;


        continue;


      }


      const linhas =
        extrairLinhas(
          html
        );


      if (
        linhas.length > 0
      ) {


        return linhas;


      }


      ultimoErro =

        `Resposta recebida (${html.length} bytes), mas sem linhas de comboios.`;


    }

    catch (
      error
    ) {


      ultimoErro =

        error?.name ===
        'AbortError'

        ? 'Tempo limite ao contactar a IP.'

        : (
          error?.message ||
          String(error)
        );


    }

  }


  throw new Error(
    ultimoErro
  );

}


/* ==================================================
   HANDLER
================================================== */

export default async function handler(
  req,
  res
) {


  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );


  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS'
  );


  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );


  res.setHeader(
    'Cache-Control',
    'public, s-maxage=15, stale-while-revalidate=300'
  );


  if (
    req.method ===
    'OPTIONS'
  ) {


    return res
      .status(200)
      .end();


  }


  try {


    const linhas =
      await obterLinhasIP();


    const partidas =

      linhas

        .map(
          item => {


            const destino =
              destinoVelec(
                item.destinoOriginal
              );


            return destino

              ? {

                  ...item,

                  destino

                }

              : null;


          }
        )

        .filter(
          Boolean
        )

        .slice(
          0,
          12
        );


    if (
      partidas.length === 0
    ) {


      throw new Error(

        'Foram encontradas linhas na IP, mas nenhuma corresponde aos destinos do VELEC.'

      );


    }


    guardarCache(
      partidas
    );


    return res
      .status(200)
      .json({


        estacao:
          'AGUALVA-CACÉM',


        codigo:
          STATION_CODE,


        atualizadoEm:
          new Date()
            .toISOString(),


        stale:
          false,


        total:
          partidas.length,


        partidas


      });


  }

  catch (
    error
  ) {


    const cache =
      lerCache();


    /*
      Se a IP falhar momentaneamente,
      devolve a última informação boa.
    */

    if (
      cache
    ) {


      return res
        .status(200)
        .json({


          estacao:
            'AGUALVA-CACÉM',


          codigo:
            STATION_CODE,


          atualizadoEm:
            new Date(
              cache.guardadoEm
            )
              .toISOString(),


          stale:
            true,


          aviso:
            error.message,


          total:
            cache.partidas.length,


          partidas:
            cache.partidas


        });


    }


    console.error(
      'Erro partidas:',
      error
    );


    return res
      .status(503)
      .json({


        error:
          'Não foi possível obter as partidas.',


        detalhe:
          error.message,


        partidas:
          []


      });


  }

}
