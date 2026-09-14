const PAGINA =
  "https://servicos.infraestruturasdeportugal.pt/estacoes?estacaoId=9461002";


/* ==================================================
   FETCH
================================================== */

async function obterTexto(url) {

  const resposta =
    await fetch(
      url,
      {
        headers: {

          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",

          "Accept":
            "*/*",

          "Accept-Language":
            "pt-PT,pt;q=0.9",

          "Cache-Control":
            "no-cache"

        },

        cache:
          "no-store",

        redirect:
          "follow"
      }
    );


  if (!resposta.ok) {

    throw new Error(
      `HTTP ${resposta.status} em ${url}`
    );

  }


  return {

    url:
      resposta.url,

    texto:
      await resposta.text()

  };

}


/* ==================================================
   LIMPAR URL
================================================== */

function limparUrl(url) {

  return String(url)

    .replace(
      /&amp;/g,
      "&"
    )

    .replace(
      /\\u0026/gi,
      "&"
    )

    .replace(
      /\\u003d/gi,
      "="
    )

    .replace(
      /\\\//g,
      "/"
    );

}


/* ==================================================
   EXTRAIR SCRIPTS
================================================== */

function extrairScripts(
  html,
  base
) {

  const scripts =
    [];


  const regex =
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;


  let match;


  while (
    (
      match =
        regex.exec(html)
    ) !== null
  ) {

    try {

      const url =
        new URL(

          limparUrl(
            match[1]
          ),

          base

        ).href;


      scripts.push(
        url
      );

    }

    catch (_) {}

  }


  return [
    ...new Set(scripts)
  ];

}


/* ==================================================
   PROCURAR FUNÇÃO
================================================== */

function procurarOcorrencias(
  texto,
  termo
) {

  const resultados =
    [];


  const lower =
    texto.toLowerCase();


  const alvo =
    termo.toLowerCase();


  let pos =
    0;


  while (
    (
      pos =
        lower.indexOf(
          alvo,
          pos
        )
    ) !== -1
  ) {


    const inicio =
      Math.max(
        0,
        pos - 1200
      );


    const fim =
      Math.min(
        texto.length,
        pos + 3200
      );


    resultados.push(

      texto
        .slice(
          inicio,
          fim
        )
        .replace(
          /\s+/g,
          " "
        )

    );


    pos +=
      alvo.length;


    /*
      Não precisamos de dezenas.
    */

    if (
      resultados.length >= 10
    ) {

      break;

    }

  }


  return resultados;

}


/* ==================================================
   ENCONTRAR POSSÍVEIS ENDPOINTS
================================================== */

function encontrarEndpoints(
  texto
) {

  const resultados =
    new Set();


  /*
    URLs absolutas
  */

  const urls =
    texto.match(
      /https?:\/\/[^"'`\s\\)]+/gi
    ) || [];


  urls.forEach(
    url => {

      const limpa =
        limparUrl(
          url
        );


      if (
        /estac|partid|chegad|combo|horar|api|ajax/i
          .test(limpa)
      ) {

        resultados.add(
          limpa
        );

      }

    }
  );


  /*
    Caminhos relativos
  */

  const relativosRegex =
    /["'`]([^"'`]{1,220})["'`]/g;


  let match;


  while (
    (
      match =
        relativosRegex.exec(
          texto
        )
    ) !== null
  ) {


    const valor =
      limparUrl(
        match[1]
      );


    if (
      /estac|partid|chegad|combo|horar|api|ajax/i
        .test(valor)
    ) {


      /*
        Ignorar texto normal enorme.
      */

      if (
        valor.length <= 220
      ) {

        resultados.add(
          valor
        );

      }

    }

  }


  return [
    ...resultados
  ]
    .slice(
      0,
      100
    );

}


/* ==================================================
   DETETAR AJAX / FETCH
================================================== */

function procurarChamadas(
  texto
) {

  const termos = [

    "fetch(",

    ".ajax(",

    "$.ajax",

    "$.get(",

    "$.post(",

    "XMLHttpRequest",

    "axios",

    "pesquisarPartidasChegadas",

    "resultadosPartidasChegadas",

    "dataPartida",

    "nodeId"

  ];


  const saida =
    [];


  termos.forEach(
    termo => {


      const partes =
        procurarOcorrencias(
          texto,
          termo
        );


      partes.forEach(
        trecho => {


          saida.push({

            termo,

            trecho

          });


        }
      );


    }
  );


  return saida
    .slice(
      0,
      30
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
    "Cache-Control",
    "no-store"
  );


  try {


    /* ----------------------------------------------
       1. Página principal
    ---------------------------------------------- */

    const pagina =
      await obterTexto(
        PAGINA
      );


    /* ----------------------------------------------
       2. Scripts
    ---------------------------------------------- */

    const scripts =
      extrairScripts(

        pagina.texto,

        pagina.url

      );


    const encontrados =
      [];


    /* ----------------------------------------------
       3. Analisar JS
    ---------------------------------------------- */

    for (
      let i = 0;
      i < scripts.length;
      i++
    ) {


      const scriptUrl =
        scripts[i];


      try {


        const script =
          await obterTexto(
            scriptUrl
          );


        /*
          Só nos interessam scripts
          relacionados com a função.
        */

        const temFuncao =

          script.texto
            .toLowerCase()
            .includes(
              "pesquisarpartidaschegadas"
            );


        const temResultados =

          script.texto
            .toLowerCase()
            .includes(
              "resultadospartidaschegadas"
            );


        if (
          !temFuncao &&
          !temResultados
        ) {

          continue;

        }


        encontrados.push({

          script:
            scriptUrl,

          bytes:
            script.texto.length,

          endpoints:
            encontrarEndpoints(
              script.texto
            ),

          chamadas:
            procurarChamadas(
              script.texto
            )

        });


      }

      catch (
        erro
      ) {


        encontrados.push({

          script:
            scriptUrl,

          erro:
            erro.message

        });


      }

    }


    /* ----------------------------------------------
       4. Resultado
    ---------------------------------------------- */

    return res
      .status(200)
      .json({

        sucesso:
          true,

        scriptsAnalisados:
          scripts.length,

        scriptsComPartidas:
          encontrados.length,

        encontrados

      });


  }

  catch (
    erro
  ) {


    return res
      .status(500)
      .json({

        sucesso:
          false,

        erro:
          erro.message

      });


  }

}
