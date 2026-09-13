export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Agualva-Cacém
  const STATION_CODE = '9461002';

  const DESTINOS_PERMITIDOS = {
    'LISBOA-ORIENTE': 'LISBOA-ORIENTE',
    'ALVERCA': 'ALVERCA',
    'LISBOA-SANTA APOLÓNIA': 'LISBOA-S.A',
    'LISBOA-SANTA APOLONIA': 'LISBOA-S.A',
    'LISBOA-S.APOLONIA': 'LISBOA-S.A',
    'LISBOA-S. APOLÓNIA': 'LISBOA-S.A'
  };

  try {
    const url =
      `https://servicos.infraestruturasdeportugal.pt/estacoes?estacaoId=${STATION_CODE}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      throw new Error(`IP respondeu com ${response.status}`);
    }

    const html = await response.text();

    /*
      Extrai linhas da tabela:
      Hora | Comboio | Serviço | Origem | Destino | Operador | Observações
    */

    const linhas = [];

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const row = rowMatch[1];

      const cells = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

      let cellMatch;

      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const texto = cellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();

        cells.push(texto);
      }

      if (cells.length < 5) continue;

      const hora = cells[0];
      const comboio = cells[1];
      const servico = cells[2];
      const origem = cells[3];

      const destinoOriginal = cells[4]
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const operador = cells[5] || '';
      const observacoes = cells[6] || '';

      let destinoPainel = null;

      if (destinoOriginal.includes('ORIENTE')) {
        destinoPainel = 'LISBOA-ORIENTE';
      }

      if (destinoOriginal === 'ALVERCA') {
        destinoPainel = 'ALVERCA';
      }

      if (
        destinoOriginal.includes('SANTA APOLONIA') ||
        destinoOriginal.includes('S.APOLONIA') ||
        destinoOriginal.includes('S. APOLONIA')
      ) {
        destinoPainel = 'LISBOA-S.A';
      }

      if (!destinoPainel) continue;

      // Só aceita horas válidas
      if (!/^\d{1,2}:\d{2}$/.test(hora)) continue;

      linhas.push({
        hora,
        comboio,
        servico,
        origem,
        destino: destinoPainel,
        destinoOriginal: cells[4],
        operador,
        observacoes
      });
    }

    // Remove possíveis duplicados
    const unicos = linhas.filter(
      (comboio, index, array) =>
        index ===
        array.findIndex(
          x =>
            x.hora === comboio.hora &&
            x.comboio === comboio.comboio &&
            x.destino === comboio.destino
        )
    );

    return res.status(200).json({
      estacao: 'AGUALVA-CACÉM',
      codigo: STATION_CODE,
      atualizadoEm: new Date().toISOString(),
      total: unicos.length,
      partidas: unicos.slice(0, 8)
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Não foi possível obter as partidas.',
      detalhe: error.message,
      partidas: []
    });
  }
}
