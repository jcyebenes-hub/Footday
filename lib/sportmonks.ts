
export const getSportmonksPredictions = async (homeTeam: string, awayTeam: string, date: string): Promise<any | null> => {
  try {
    // Usar el proxy del servidor para evitar CORS
    const response = await fetch(`/api/proxy/sportmonks/fixtures/date/${date}?include=participants;predictions`);
    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) return null;

    // 2. Encontrar el partido que coincida con los equipos
    const match = data.data.find((f: any) => {
      const participants = f.participants || [];
      const names = participants.map((p: any) => p.name.toLowerCase());
      const h = homeTeam.toLowerCase();
      const a = awayTeam.toLowerCase();
      
      // Verificación simple de nombres (contiene o es contenido)
      return (names.some((n: string) => n.includes(h) || h.includes(n))) && 
             (names.some((n: string) => n.includes(a) || a.includes(n)));
    });

    if (!match) return null;

    // 3. Extraer predicciones si existen
    // Sportmonks suele devolver predicciones en el include si se solicita
    const predictions = match.predictions || [];
    
    return {
      id: match.id,
      name: match.name,
      starting_at: match.starting_at,
      predictions: predictions.map((p: any) => ({
        type: p.type?.name,
        predictions: p.predictions
      })),
      // Si hay datos de probabilidad específicos en el objeto (depende del plan)
      probabilities: match.probabilities || null
    };
  } catch (error) {
    console.error('Error fetching Sportmonks data:', error);
    return null;
  }
};
