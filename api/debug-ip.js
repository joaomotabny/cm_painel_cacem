const PAGE_URL =
  "https://servicos.infraestruturasdeportugal.pt/estacoes?estacaoId=9461002";


function decodeUrl(texto = "") {
  return String(texto)
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=")
    .replace(/\\\//g, "/");
}


function extrairScripts(html, baseUrl) {

  const resultado = [];
  const regex =
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;

  let match;

  while (
    (match = regex.exec(html)) !== null
  ) {

    try {

      const src =
        decodeUrl(
          match[1]
        );

      resultado.push(
        new URL(
          src,
          baseUrl
        ).href
      );

    }

    catch (_) {}

  }

  return [
    ...new Set(resultado)
  ];

}


function limparSnippet(texto) {

  return String(texto)
    .replace(/\s+/g, " ")
    .slice(0, 1600);

}


function procurarSnippets(js) {

  const termos = [

    "estacaoId",
    "estacao",
    "estacoes",

    "partida",
    "partidas",

    "chegada",
    "chegadas",

    "comboio",
    "comboios",

    "horario",
    "horarios",

    "train",

    "ajax",

    "fetch(",

    "$.ajax",
    "$.get",
    "$.post",

    "axios",

    "/api/",
    "api/",

    "endpoint",

    "url:"

  ];


  const encontrados = [];


  for (
    const termo of termos
  ) {

    const lower =
      js.toLowerCase();

    const termoLower =
      termo.toLowerCase();

    let pos = 0;
    let contador = 0;


    while (
      (
        pos =
          lower.indexOf(
            termoLower,
            pos
          )
      ) !== -1
      &&
      contador < 5
    ) {


      const inicio =
        Math.max(
          0,
          pos - 450
        );


      const fim =
        Math.min(
          js.length,
          pos + termo.length + 900
        );


      encontrados.push({

        termo,

        snippet:
          limparSnippet(
            js.slice(
              inicio,
              fim
            )
          )

      });


      pos +=
        termo.length;


      contador++;

    }

  }


  return encontrados;

}


function extrairUrls(js) {

  const urls =
    new Set();


  /*
    URLs absolutas
  */

  const absolutas =
    js.match(
      /https?:\/\/[^"'`\s\\]+/gi
    ) || [];


  absolutas.forEach(
    valor => {

      const limpa =
        decodeUrl(valor)
          .replace(
            /[),;}]+$/,
            ""
          );


      if (
        /api|ajax|estac|combo|partid|chegad|horar|train/i
          .test(limpa)
      ) {

        urls.add(
          limpa
        );

      }

    }
  );


  /*
    Caminhos relativos entre aspas.
  */

  const regexRelativos =
    /["'`]((?:\/|\.\/)[^"'`\s\\]+)["'`]/g;


  let match;


  while (
    (
      match =
        regexRelativos.exec(js)
    ) !== null
  ) {


    const caminho =
      decodeUrl(
        match[1]
      );


    if (
      /api|ajax|estac|combo|partid|chegad|horar|train/i
        .test(caminho)
    ) {

      urls.add(
        caminho
      );

    }

  }


  return [
    ...urls
  ].slice(
    0,
    100
  );

}


/*
  Também procuramos strings que parecem
  nomes de rotas mesmo sem começarem por "/".
*/

function extrairStringsInteressantes(js) {

  const encontrados =
    new Set();


  const regex =
    /["'`]([^"'`]{3,180})["'`]/g;


  let match;


  while (
    (
      match =
        regex.exec(js)
    ) !== null
  ) {


    const valor =
      decodeUrl(
        match[1]
      );


    if (
      /estac|combo|partid|chegad|horar|train|ajax|api/i
        .test(valor)
    ) {

      encontrados.add(
        valor
      );

    }

  }


  return [
    ...encontrados
  ].slice(
    0,
    150
  );

}


async function fetchTexto(url) {

  const response =
    await fetch(
      url,
      {

        headers: {

          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",

          "Accept":
            "*/*",

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


  const texto =
    await response.text();


  return {

    status:
      response.status,

    url:
      response.url,

    texto

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

    /*
      1. Buscar página da estação
    */

    const pagina =
      await fetchTexto(
        PAGE_URL
      );


    /*
      2. Extrair scripts externos
    */

    const scripts =
      extrairScripts(
        pagina.texto,
        pagina.url
      );


    const resultados =
      [];


    /*
      3. Inspecionar cada JS
    */

    for (
      let i = 0;
      i < scripts.length;
      i++
    ) {

      const scriptUrl =
        scripts[i];


      try {

        const script =
          await fetchTexto(
            scriptUrl
          );


        const urls =
          extrairUrls(
            script.texto
          );


        const strings =
          extrairStringsInteressantes(
            script.texto
          );


        const snippets =
          procurarSnippets(
            script.texto
          );


        /*
          Só devolve scripts que tenham
          alguma coisa potencialmente útil.
        */

        if (
          urls.length > 0 ||
          strings.length > 0 ||
          snippets.length > 0
        ) {

          resultados.push({

            numero:
              i,

            script:
              scriptUrl,

            status:
              script.status,

            bytes:
              script.texto.length,

            urls,

            strings,

            /*
              Limitamos para o JSON não
              ficar gigantesco.
            */

            snippets:
              snippets.slice(
                0,
                30
              )

          });

        }

      }

      catch (
        erro
      ) {

        resultados.push({

          numero:
            i,

          script:
            scriptUrl,

          erro:
            erro.message

        });

      }

    }


    /*
      4. Também mostrar um pedaço grande
      em redor do próprio bloco da estação.
    */

    const marcador =
      'block-estacoes-da-ip';


    const pos =
      pagina.texto.indexOf(
        marcador
      );


    let blocoEstacao =
      null;


    if (
      pos !== -1
    ) {

      blocoEstacao =
        pagina.texto
          .slice(
            Math.max(
              0,
              pos - 500
            ),

            Math.min(
              pagina.texto.length,
              pos + 6000
            )
          )
          .replace(
            /\s+/g,
            " "
          );

    }


    return res
      .status(200)
      .json({

        pagina: {

          status:
            pagina.status,

          bytes:
            pagina.texto.length,

          scriptsEncontrados:
            scripts.length

        },

        blocoEstacao,

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
