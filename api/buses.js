function renderBoard(partidas) {
      const tbody = document.getElementById('departures-body');

      // Filtra apenas para Lisboa Santa Apolónia, Oriente e Alverca
      const destinosPermitidos = ['SANTA APOLÓNIA', 'SANTA APOLONIA', 'ORIENTE', 'ALVERCA'];
      
      const partidasFiltradas = partidas.filter(item => {
        const dest = item.destino.toUpperCase();
        return destinosPermitidos.some(d => dest.includes(d));
      });

      if (!partidasFiltradas || partidasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="status-msg">SEM PARTIDAS PREVISTAS</td></tr>`;
        return;
      }

      tbody.innerHTML = partidasFiltradas.slice(0, 6).map(item => `
        <tr>
          <td class="col-hora">${item.hora}</td>
          <td class="col-destino">${item.destino}</td>
          <td class="col-linha">${item.linha}</td>
        </tr>
      `).join('');
    }
