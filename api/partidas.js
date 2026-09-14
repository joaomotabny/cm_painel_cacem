export default async function handler(req, res) {

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


  /*
    A Vercel pode servir a mesma resposta
    durante 20 segundos.

    Se estiver a atualizar, ainda pode
    servir a anterior durante 2 minutos.
  */

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=20, stale-while-revalidate=120'
  );


  if (
    req.method === 'OPTIONS'
  ) {

    return res
      .status(200)
      .end();

  }


  /*
    AGUALVA-CACÉM
  */

  const STATION_CODE =
    '9461002';


  try {

    const url =
      `https://servicos.infraestruturasdeportugal.pt/estacoes?estacaoId=${STATION_CODE}`;


    const response =
      await fetch(
        url,
        {
          headers: {

            'User-Agent':
              'Mozilla/5.0',

            'Accept':
              'text/html'

          }
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `IP respondeu com ${response.status}`
      );

    }


    const html =
      await response.text();


    const linhas =
      [];


    /*
      Cada linha da tabela da IP:

      Hora
      Comboio
      Serviço
      Origem
      Destino
      Operador
      Observações
    */

    const rowRegex =
      /<tr[^>]*>([\s\S]*?)<\/tr>/gi;


    let rowMatch;


    while (
      (
        rowMatch =
          rowRegex.exec(html)
      ) !== null
    ) {

      const row =
        rowMatch[1];


      const cells =
        [];


      const cellRegex =
        /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;


      let cellMatch;


      while (
        (
          cellMatch =
            cellRegex.exec(row)
        ) !== null
      ) {

        const texto =
          cellMatch[1]

            .replace(
              /<[^>]+>/g,
              ' '
            )

            .replace(
              /&nbsp;/g,
              ' '
            )

            .replace(
              /&amp;/g,
              '&'
            )

            .replace(
              /\s+/g,
              ' '
            )

            .trim();


        cells.push(
          texto
        );

      }


      if (
        cells.length < 5
      ) {

        continue;

      }


      const hora =
        cells[0];


      const comboio =
        cells[1];


      const servico =
        cells[2];


      const origem =
        cells[3];


      const destinoOriginal =
        String(cells[4])

          .toUpperCase()

          .normalize('NFD')

          .replace(
            /[\u0300-\u036f]/g,
            ''
          )

          .trim();


      const operador =
        cells[5] || '';


      const observacoes =
        cells[6] || '';


      let destinoPainel =
        null;


      /*
        LISBOA-ORIENTE
      */

      if (
        destinoOriginal.includes(
          'ORIENTE'
        )
      ) {

        destinoPainel =
          'LISBOA-ORIENTE';

      }


      /*
        ALVERCA
      */

      else if (
        destinoOriginal ===
        'ALVERCA'
      ) {

        destinoPainel =
          'ALVERCA';

      }


      /*
        LISBOA SANTA APOLÓNIA
      */

      else if (

        destinoOriginal.includes(
          'SANTA APOLONIA'
        )

        ||

        destinoOriginal.includes(
          'S.APOLONIA'
        )

        ||

        destinoOriginal.includes(
          'S. APOLONIA'
        )

      ) {

        destinoPainel =
          'LISBOA-S.A';

      }


      /*
        Ignora restantes destinos.
      */

      if (
        !destinoPainel
      ) {

        continue;

      }


      /*
        Hora válida.
      */

      if (
        !/^\d{1,2}:\d{2}$/.test(
          hora
        )
      ) {

        continue;

      }


      linhas.push({

        hora,

        comboio,

        servico,

        origem,

        destino:
          destinoPainel,

        destinoOriginal:
          cells[4],

        operador,

        observacoes

      });

    }


    /*
      Remover duplicados.
    */

    const unicos =
      linhas.filter(
        (
          item,
          index,
          array
        ) =>

          index ===
          array.findIndex(
            outro =>

              outro.hora ===
                item.hora

              &&

              outro.comboio ===
                item.comboio

              &&

              outro.destino ===
                item.destino
          )
      );


    /*
      Resposta final.
    */

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

        total:
          unicos.length,

        partidas:
          unicos.slice(
            0,
            8
          )

      });

  }


  catch (
    error
  ) {

    console.error(
      'Erro partidas:',
      error
    );


    return res
      .status(500)
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
