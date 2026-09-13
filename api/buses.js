export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const STATION_CODE = '9438002'; // Cacém

  try {
    const response = await fetch(
      `https://servicos.infraestruturasdeportugal.pt/negocios/api/partidas/estacao/${STATION_CODE}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro na IP: ${response.status}`);
    }

    const data = await response.json();
    const rawPartidas = data.Partidas || data || [];

    // Lista de destinos permitidos (em maiúsculas)
    const destinosPermitidos = ['SANTA APOLÓNIA', 'SANTA APOLONIA', 'ORIENTE', 'ALVERCA'];

    const partidasFiltradas = rawPartidas
      .filter(p => {
        const destino = (p.Destino || p.destino || '').toUpperCase();
        // Verifica se o destino inclui algum dos nomes permitidos
        return destinosPermitidos.some(d => destino.includes(d));
      })
      .map(p => {
        let horaFormatada = p.Hora || p.hora || '--:--';
        if (horaFormatada.includes(' ')) {
          horaFormatada = horaFormatada.split(' ')[1] || horaFormatada;
        }
        if (horaFormatada.length > 5) {
          horaFormatada = horaFormatada.substring(0, 5);
        }

        return {
          hora: horaFormatada,
          destino: (p.Destino || p.destino || '---').toUpperCase(),
          linha: p.Linha || p.linha || '-'
        };
      });

    // Devolve os primeiros 6 comboios que correspondem aos destinos escolhidos
    return res.status(200).json(partidasFiltradas.slice(0, 6));

  } catch (error) {
    console.error('Erro ao procurar partidas:', error);
    return res.status(500).json({ error: 'Erro ao obter dados em tempo real', details: error.message });
  }
}
