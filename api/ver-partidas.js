const PAGINA =
  "https://servicos.infraestruturasdeportugal.pt/estacoes?estacaoId=9461002";


async function obter(url) {

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
          "no-store"
      }
    );


  if (!resposta.ok) {

    throw new Error(
      `HTTP ${resposta.status}`
    );

  }


  return {
    url:
      resposta.url,

    texto:
      await resposta.text()
  };

}


function limparUrl(url) {

  return String(url)

    .replace(/&amp;/g, "&")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=")
    .replace(/\\\//g, "/");

}


function extrairScripts(
  html,
  base
) {

  const resultado =
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

      resultado.push(

        new URL(

          limparUrl(
            match[1]
          ),

          base

        ).href

      );

    }

    catch (_) {}

  }


  return [
    ...new Set(resultado)
  ];

}


function extrairFuncao(
  js
) {

  const inicioTexto =
    "prototype.pesquisarPartidasChegadas=function";


  const inicio =
    js.indexOf(
      inicioTexto
    );


  if (
    inicio === -1
  ) {

    return null;

  }


  /*
    Vamos buscar um bloco suficientemente
    grande a partir da função.
  */

  const fim =
    Math.min(
      js.length,
      inicio + 12000
    );


  return js
    .slice(
      inicio,
      fim
    )
    .replace(
      /\s+/g,
      " "
    );

}


function extrairStrings(
  texto
) {

  const encontrados =
    [];


  const regex =
    /["'`]([^"'`]{1,250})["'`]/g;


  let match;


  while (
    (
      match =
        regex.exec(texto)
    ) !== null
  ) {

    const valor =
      limparUrl(
        match[1]
      );


    /*
      Mostrar apenas coisas que
      parecem caminhos, endpoints
      ou parâmetros úteis.
    */

    if (

      valor.includes("/") ||

      valor.includes("?") ||

      /partid|chegad|estac|combo|horar|data|node/i
        .test(valor)

    ) {

      encontrados.push(
        valor
      );

    }

  }


  return [
    ...new Set(encontrados)
  ];

}


function contextoAjax(
  funcao
) {

  const termos = [

    ".ajax(",
    "$.ajax",
    "fetch(",
    "XMLHttpRequest",
    "url:",
    "type:",
    "method:"

  ];


  const encontrados =
    [];


  for (
    const termo of termos
  ) {

    const pos =
      funcao.indexOf(
        termo
      );


    if (
      pos === -1
    ) {

      continue;

    }


    encontrados.push({

      termo,

      trecho:
        funcao.slice(
          Math.max(
            0,
            pos - 500
          ),

          Math.min(
            funcao.length,
            pos + 1800
          )
        )

    });

  }


  return encontrados;

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

    const pagina =
      await obter(
        PAGINA
      );


    const scripts =
      extrairScripts(
        pagina.texto,
        pagina.url
      );


    for (
      const scriptUrl of scripts
    ) {

      try {

        const script =
          await obter(
            scriptUrl
          );


        if (
          !script.texto.includes(
            "pesquisarPartidasChegadas"
          )
        ) {

          continue;

        }


        const funcao =
          extrairFuncao(
            script.texto
          );


        if (!funcao) {

          continue;

        }


        return res
          .status(200)
          .json({

            encontrado:
              true,

            script:
              scriptUrl,

            strings:
              extrairStrings(
                funcao
              ),

            ajax:
              contextoAjax(
                funcao
              ),

            funcao:
              funcao.slice(
                0,
                6000
              )

          });

      }

      catch (_) {}

    }


    return res
      .status(404)
      .json({

        encontrado:
          false

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
