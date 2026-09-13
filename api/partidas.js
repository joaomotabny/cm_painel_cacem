export default async function handler(req, res) {
  // Configuração de CORS
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

  // Código UIC de Estação do Cacém na IP: 9438002
  const STATION_CODE = '9438002';

  try {
    const url = `https://servicos.infraestruturasdeportugal.pt/negocios/api/partidas/estacao/${STATION_CODE}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.infraestruturasdeportugal.pt/'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro IP: ${response.status}`);
    }

    const data = await response.json();
    
    // Procura a lista de partidas na resposta
    let rawPartidas = [];
    if (Array.isArray(data)) {
      rawPartidas = data;
    } else if (data && data.Partidas && Array.isArray(data.Partidas)) {
      rawPartidas = data.Partidas;
    } else if (data && data.partidas && Array.isArray(data.partidas)) {
      rawPartidas = data.partidas;
    }

    // Filtro estrito de destinos pedidos: Lisboa Santa Apolónia, Lisboa Oriente e Alverca
    const destinosPermitidos = ['SANTA APOLÓNIA', 'SANTA APOLONIA', 'ORIENTE', 'ALVERCA'];

    const partidasFiltradas = rawPartidas
      .filter(item => {
        const dest = (item.Destino || item.destino || item.NomeEstacaoDestino || '').toUpperCase();
        return destinosPermitidos.some(d => dest.includes(d));
      })
      .map(item => {
        let hora = item.Hora || item.hora || item.HoraPartida || '--:--';
        if (hora.includes(' ')) {
          hora = hora.split(' ')[1] || hora;
        }
        if (hora.length > 5) {
          hora = hora.substring(0, 5);
        }

        let destino = (item.Destino || item.destino || item.NomeEstacaoDestino || '---').toUpperCase();
        let linha = item.Linha || item.linha || item.NumeroLinha || '-';

        return { hora, destino, linha };
      });

    return res.status(200).json(partidasFiltradas.slice(0, 6));

  } catch (error) {
    console.error('Erro na rota /api:', error);
    // Em caso de falha temporária da IP, devolve mensagem clara
    return res.status(500).json({ error: 'Erro ao ligar à API da IP', details: error.message });
  }
}
