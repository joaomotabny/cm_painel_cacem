export default async function handler(req, res) {
  // Permite pedidos de qualquer origem (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');

  // Código da Estação do Cacém na IP (9438002)
  const STATION_CODE = '9438002';
  const API_URL = `https://servicos.infraestruturasdeportugal.pt/negocios/api/partidas/estacao/${STATION_CODE}`;

  try {
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao consultar a IP' });
    }

    const data = await response.json();

    // Limpa e formata os dados para o ecrã CRT
    const partidasTratadas = (data.Partidas || []).slice(0, 6).map(comboio => ({
      hora: comboio.Hora || '--:--',
      destino: (comboio.Destino || '---').toUpperCase(),
      linha: comboio.Linha || '-'
    }));

    return res.status(200).json(partidasTratadas);
  } catch (error) {
    return res.status(500).json({ error: 'Falha na ligação à API', details: error.message });
  }
}
