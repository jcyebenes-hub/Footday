
import { GoogleGenAI, Type } from "@google/genai";
import { MatchResponse, SearchParams, Match, Language, Sport, MatchGroup } from "../types";
import { getMatchesByDate, getMatchPredictions, getMatchLineups, getMatchEvents } from "../lib/football";
import { getSportmonksPredictions } from "../lib/sportmonks";
import { fetchOddsForMatches } from "./oddsService";

/**
 * Helper para limpiar y parsear JSON que viene de la IA (elimina bloques de código Markdown)
 */
const safeJsonParse = (text: string) => {
  try {
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Error parseando JSON de IA:", e);
    return null;
  }
};

const getLanguageName = (lang: Language): string => {
  const names: Record<Language, string> = {
    es: 'español', en: 'english', ar: 'arabic', fr: 'french', 
    it: 'italian', de: 'german', pt: 'portuguese', zh: 'mandarin chinese'
  };
  return names[lang];
};

export const generateBetSlipImage = async (data: {
  importe: string;
  linea: string; 
  cuota: string;
  equipoLocal: string;
  equipoVisitante: string;
  liga: string;
  fecha: string;
  hora: string;
  ganancias: string;
  cierre: string;
  ticketNumber: string;
  mercado: string;
  bookie?: 'KIROLBET' | 'BET365';
  isCombined?: boolean;
}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isB365 = data.bookie === 'BET365';
  const typeLabel = data.isCombined ? "APUESTA COMBINADA / MULTI-BET" : "APUESTA SENCILLA";
  
  const prompt = `Genera una imagen ULTRA REALISTA de un boleto de apuestas de ${data.bookie || 'Kirolbet'}.
  TIPO: ${typeLabel}.
  ESTILO: App móvil real, fidelidad absoluta, modo ${isB365 ? 'oscuro' : 'claro'}.
  
  DATOS A INCLUIR:
  ${data.isCombined ? `LISTA DE PARTIDOS Y PRONÓSTICOS: ${data.linea}` : `PARTIDO: ${data.equipoLocal} vs ${data.equipoVisitante}, Pick: ${data.linea} (${data.mercado})`}
  
  DETALLES FINALES:
  Importe Apostado: ${data.importe}€
  Cuota Total: ${data.cuota}
  Ganancias Potenciales: ${data.ganancias}€
  Estado: Pendiente / Activa.
  
  Asegúrate de que los logos de la casa de apuestas y los colores corporativos sean perfectos.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Error generating bet slip image:", e);
  }
  return "";
};

export const generatePickImage = async (match: Match, prediction: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Infografía deportiva profesional: ${match.homeTeam} vs ${match.awayTeam}. Pronóstico: ${prediction}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) { return ""; }
  return "";
};

export const generateInstagramImage = async (data: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Instagram Story (9:16) premium sports betting pick:
  Match: ${data.match.homeTeam} vs ${data.match.awayTeam}
  League: ${data.match.league}
  Prediction: ${data.selection}
  Confidence: ${data.prob}%
  Style: High-impact sports infographic, cinematic lighting.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) { return ""; }
  return "";
};

export const generateInstagramSquareImage = async (data: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Instagram Post (1:1) sports magazine style: ${data.match.homeTeam} vs ${data.match.awayTeam}. Selection: ${data.selection}. Professional sports graphic.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) { return ""; }
  return "";
};

export const generateHashtags = async (data: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Genera exactamente entre 5 y 8 hashtags virales en una sola línea para un post de Instagram sobre este pronóstico:
  Partido: ${data.match.homeTeam} vs ${data.match.awayTeam}
  Liga: ${data.match.league}
  Pronóstico: ${data.selection}
  
  Devuelve SOLO los hashtags separados por espacios. Sin texto adicional.`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    const text = response.text || "";
    return text.split(/\s+/).filter(word => word.startsWith('#')).join(' ') || "#apuestas #picks #deportes";
  } catch (e) { return "#apuestas #picks #deportes"; }
};

export const generateVideoScript = async (match: Match, prediction: string, lang: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Viral video script for: ${match.homeTeam} vs ${match.awayTeam}. Pick: ${prediction}. Language: ${getLanguageName(lang)}.`;
  try {
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text || "Error al generar el guion.";
  } catch (error) { return "Error de conexión."; }
};

export const fetchMatches = async (params: SearchParams): Promise<MatchResponse> => {
  // Si es fútbol y no hay una búsqueda específica (query), intentamos usar la API directa para mayor precisión
  if (params.sport === 'football' && !params.query) {
    try {
      const apiMatches = await getMatchesByDate(params.date);
      if (apiMatches && apiMatches.length > 0) {
        // Agrupar por liga
        const groupsMap: Record<string, MatchGroup> = {};
        
        apiMatches.forEach(m => {
          const key = `${m.league.country}-${m.league.name}`;
          if (!groupsMap[key]) {
            groupsMap[key] = {
              country: m.league.country,
              league: m.league.name,
              matches: []
            };
          }
          
          groupsMap[key].matches.push({
            id: String(m.id),
            homeTeam: m.homeTeam.name,
            awayTeam: m.awayTeam.name,
            homeTeamId: m.homeTeam.id,
            awayTeamId: m.awayTeam.id,
            homeLogo: m.homeTeam.logo,
            awayLogo: m.awayTeam.logo,
            date: m.date,
            time: m.time,
            status: m.status.toLowerCase().includes('finish') ? 'finished' : 'scheduled',
            statusShort: m.statusShort,
            score: m.score ? `${m.score.home} - ${m.score.away}` : '',
            briefStatus: m.status,
            sport: 'football',
            league: m.league.name,
            leagueId: m.league.id,
            leagueLogo: m.league.logo,
            country: m.league.country
          });
        });
        
        const finalGroups = await Promise.all(Object.values(groupsMap).map(async (group) => {
          const matchesWithOdds = await fetchOddsForMatches(group.matches, 'football');
          return { ...group, matches: matchesWithOdds };
        }));
        
        return { 
          groups: finalGroups, 
          sources: [{ web: { title: "API-Football Real-time Data", uri: "https://www.api-football.com" } }] 
        };
      }
    } catch (e) {
      console.error("Error fetching from Football API, falling back to Gemini:", e);
    }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sportContext = params.sport === 'football' ? 'fútbol' : 'baloncesto';
  const languageName = getLanguageName(params.lang);
  const prompt = `Busca partidos de ${sportContext} para el día ${params.date} ${params.query ? `en la liga ${params.query}` : ''}. Responde en JSON: {"groups": [{"country": "string", "league": "string", "matches": [{"id": "string", "homeTeam": "string", "awayTeam": "string", "homeTeamId": "string", "awayTeamId": "string", "homeLogo": "url", "awayLogo": "url", "homeForm": "string", "awayForm": "string", "time": "HH:MM", "status": "scheduled", "score": "", "briefStatus": "string"}]}]}. Idioma: ${languageName.toUpperCase()}.`;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt, 
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } 
    });
    const parsed = safeJsonParse(response.text || '{"groups":[]}');
    const groupsRaw = (parsed?.groups || []).map((g: any) => ({ 
      ...g, 
      matches: (g.matches || []).map((m: any) => ({ 
        ...m, 
        date: params.date,
        sport: params.sport, 
        league: g.league, 
        country: g.country 
      })) 
    }));

    const groups = await Promise.all(groupsRaw.map(async (g: any) => {
      const matchesWithOdds = await fetchOddsForMatches(g.matches, params.sport);
      return { ...g, matches: matchesWithOdds };
    }));

    return { groups, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (error) { 
    console.error("Error in fetchMatches:", error);
    return { groups: [], sources: [] }; 
  }
};

export const getMatchInsight = async (match: Match, type: 'analysis' | 'picks' | 'summary' | 'combined' | 'lineups' | 'h2h' | 'standings', lang: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const languageName = getLanguageName(lang);
  
  // Intentar obtener datos de API-Football para enriquecer el contexto si es fútbol
  let apiFootballContext = "";
  let sportmonksContext = "";

  if (match.sport === 'football') {
    const fixtureId = !isNaN(Number(match.id)) ? Number(match.id) : null;
    const matchDate = match.time ? match.time.split(' ')[0] : new Date().toISOString().split('T')[0]; // Fallback a hoy si no hay fecha clara

    try {
      const promises: Promise<any>[] = [];
      
      // API Football
      if (fixtureId) {
        promises.push(getMatchPredictions(fixtureId));
        promises.push(getMatchLineups(fixtureId));
        promises.push(getMatchEvents(fixtureId));
      } else {
        promises.push(Promise.resolve(null), Promise.resolve(null), Promise.resolve(null));
      }

      // Sportmonks (usamos nombres y fecha para buscar)
      promises.push(getSportmonksPredictions(match.homeTeam, match.awayTeam, matchDate));

      const [predictions, lineups, events, smData] = await Promise.all(promises);

      if (predictions) {
        apiFootballContext += `
DATOS TÉCNICOS DE API-FOOTBALL:
- Consejo: ${predictions.advice}
- Ganador probable: ${predictions.winner}
- Probabilidades: Local ${predictions.probabilities.home}, Empate ${predictions.probabilities.draw}, Visitante ${predictions.probabilities.away}
- Comparativa (Local vs Visitante): 
  * Forma: ${predictions.comparison.form.home} vs ${predictions.comparison.form.away}
  * Ataque: ${predictions.comparison.att.home} vs ${predictions.comparison.att.away}
  * Defensa: ${predictions.comparison.def.home} vs ${predictions.comparison.def.away}
- H2H Reciente: ${predictions.h2h.map((h: any) => `${h.date}: ${h.home} ${h.score} ${h.away}`).join(' | ')}
`;
      }

      if (lineups && lineups.length > 0) {
        apiFootballContext += `
ALINEACIONES CONFIRMADAS/PROBABLES (API-FOOTBALL):
${lineups.map((l: any) => `
* ${l.team.name} (${l.formation}):
  - XI: ${l.startXI.map((p: any) => `${p.player.name} (${p.player.pos})`).join(', ')}
`).join('')}
`;
      }

      if (events && events.length > 0) {
        apiFootballContext += `
EVENTOS EN VIVO / RECIENTES:
${events.map((e: any) => `- [${e.time.elapsed}'] ${e.type}: ${e.player.name} ${e.detail ? `(${e.detail})` : ''} [${e.team.name}]`).join('\n')}
`;
      }

      if (smData) {
        sportmonksContext = `
DATOS TÉCNICOS DE SPORTMONKS:
- Partido Identificado: ${smData.name}
- Fecha/Hora: ${smData.starting_at}
- Predicciones Disponibles: ${smData.predictions && smData.predictions.length > 0 
    ? smData.predictions.map((p: any) => `${p.type}: ${JSON.stringify(p.predictions)}`).join(' | ') 
    : 'No hay predicciones detalladas en Sportmonks para este plan/partido.'}
`;
      }
    } catch (e) {
      console.error("Error fetching multi-api context:", e);
    }
  }

  if (type === 'analysis' || type === 'summary' || type === 'lineups' || type === 'h2h' || type === 'standings') {
    let specificInstruction = "";
    if (type === 'summary') specificInstruction = "Genera un resumen conciso del partido.";
    if (type === 'analysis') specificInstruction = "Realiza un análisis profundo del partido comparando datos de API-Football y Sportmonks.";
    if (type === 'lineups') specificInstruction = "Muestra las alineaciones confirmadas o probables. Si hay datos de API-Football, úsalos. Si no, búscalas.";
    if (type === 'h2h') specificInstruction = "Analiza el historial de enfrentamientos directos (H2H) entre ambos equipos.";
    if (type === 'standings') specificInstruction = "Muestra la clasificación actual de la liga para ambos equipos.";

    const prompt = `${specificInstruction} para el partido ${match.homeTeam} vs ${match.awayTeam} en la liga ${match.league}. 
${apiFootballContext}
${sportmonksContext}

INSTRUCCIÓN ADICIONAL: Usa Google Search para obtener los datos más actualizados si es necesario.
Idioma: ${languageName}.`;

    const response = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview", 
      contents: prompt, 
      config: { tools: [{ googleSearch: {} }] } 
    });
    return response.text || "No disponible.";
  }

  if (type === 'combined') {
    const combinedPrompt = `🧠 ROL: Arquitecto de Apuestas Combinadas de Élite. Tu objetivo es crear una "BET BUILDER" o "COMBINADA" para un MISMO PARTIDO.

👉 PARTIDO: ${match.homeTeam} vs ${match.awayTeam} (${match.league}).
${apiFootballContext}
${sportmonksContext}

🔍 REGLAS DE CONSTRUCCIÓN:
1. Genera entre 4 y 6 selecciones individuales para este partido.
2. CADA SELECCIÓN DEBE SER EXPLÍCITA: No pongas solo "+4.5", pon "Más de 4.5 Córners Totales" o "Más de 1.5 Tarjetas para el equipo local".
3. CADA SELECCIÓN DEBE TENER UNA CUOTA ESTIMADA INDIVIDUAL (ej: 1.40, 1.80).
4. Busca mercados variados: Córners, Tarjetas, Tiros a puerta, Goles, Faltas.

✅ ESTRUCTURA DE SALIDA OBLIGATORIA:
[COMBINADA_START]
🔥 **ESTRATEGIA:** [Nombre de la estrategia, ej: Dominio Local / Juego Agresivo]

📋 **BLOQUES DE SELECCIÓN:**
[LEG_START]
🎯 **MERCADO:** [Nombre explícito del mercado: ej. Córners Totales, Tarjetas, Tiros a Puerta de X jugador]
🏆 **SELECCIÓN:** [Ej: Más de 8.5 Córners]
💰 **CUOTA ESTIMADA:** [Ej: 1.55]
💡 **RAZÓN:** [Breve explicación estadística]
[LEG_END]

[Repetir bloque LEG para cada selección, mínimo 4]

🧠 **ANÁLISIS DE SINERGIA:**
[Explica por qué estas selecciones combinan bien]

🧠 **CÓDIGO:** [CB-XXXX]
[COMBINADA_END]

Si no hay datos suficientes, responde:
🚫 "COMBINADA BLOQUEADA - DATOS INSUFICIENTES"

Idioma: ${languageName.toUpperCase()}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: combinedPrompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      return response.text || "Error en el sistema de combinadas.";
    } catch (error) { return "Error de análisis."; }
  }

  // PROTOCOLO DE PICKS POR DEPORTE
  let pickPrompt = "";
  if (match.sport === 'basketball') {
    pickPrompt = `🧠 ROL: Sistema predictivo élite de baloncesto profesional. Buscas picks inevitables (Probabilidad ≥90%).

👉 PARTIDO: ${match.homeTeam} vs ${match.awayTeam} (${match.league}).

📛 REGLA DE ORO: Si el resultado no puede predecirse con alta solidez (>90%), NO GENERES PICK. Responde únicamente con el código de bloqueo.

🧱 PROTOCOLO DE 6 CAPAS:
1. Estadística Cruzada (Puntos, TC%, 3P%, Rating Off/Def, Pace de últimos 10 juegos).
2. Contexto Situacional (¿Qué se juegan?, Back-to-back, viaje, motivación, rotación rival).
3. Alineaciones/Rotación (Confirmada ≥90%. Si falta un top 3, anular).
4. Estilo Proyectado (Pace estimado, sistema de juego).
5. Match-up específico (Defensa vs estilo rival, net rating del cuadro esperado).
6. Mercado de Alta Precisión: Solo [T1] Total puntos, [C1] Handicap puntos, [H1] Ganador 1T/2T, [R1] Margen exacto, [O1] O/U Equipo.

✅ ESTRUCTURA DE SALIDA (SOLO SI SE CUMPLE TODO):
[PICK_START]
🎯 **CONFIANZA:** XX%
⚡ **MERCADO:** [T1/C1/H1/R1/O1]
🏆 **SELECCIÓN:** [Selección]
💡 **LÓGICA CONVERGENTE:**
1. [Estadística: Pace y Ratings]
2. [Contexto y motivación]
3. [Confirmación de alineación]
4. [Ventaja táctica en Match-up]
🧠 **CÓDIGO VALIDACIÓN:** C1–C2–C3–C4–C5–C6
[PICK_END]

Si no hay seguridad extrema, responde SIEMPRE:
414: ⛔ PICK BLOQUEADO – NO HAY SEGURIDAD ≥90%
415: Razón: [Indicar brevemente: descanso activo, ritmo incierto, baja clave, etc.]

Idioma: ${languageName.toUpperCase()}`;
  } else {
    // Protocolo Fútbol (5 capas actualizadas)
    pickPrompt = `🧠 ROL: Analista de apuestas profesional ultra especializado en picks con probabilidad ≥90%.

👉 PARTIDO: ${match.homeTeam} vs ${match.awayTeam} (${match.league}).
${apiFootballContext}
${sportmonksContext}

🔍 FASE 2 – COMPARATIVA MULTI-API:
Compara los datos de API-Football y Sportmonks. Si ambas coinciden en una tendencia, la confianza aumenta. Si discrepan, prioriza la que tenga datos más recientes o mayor profundidad estadística.

🔍 FASE 1 – ANÁLISIS EN 5 CAPAS:
1. Estadística Pura (Goles, xG, Over/Under, Fouls, corners, local/visitante).
2. Contexto Decisivo (Motivación, historial directo, factor localía).
3. Alineaciones (Presencia de figuras críticas, rotaciones).
4. Estilo de Juego (Ritmo, posesión, patrón táctico).
5. Mercados permitidos: Handicap corners (C1), Faltas (F1), Ambos marcan NO (G1), Doble Oportunidad (D1), Under 3.5 (U1).

✅ FASE 2 – SALIDA (SOLO SI SE CUMPLE TODO):
[PICK_START]
🎯 **CONFIANZA:** XX%
⚡ **MERCADO:** [Mercado]
🏆 **SELECCIÓN:** [Selección]
💡 **LÓGICA CONVERGENTE:**
1. [Estadística: % respaldo]
2. [Contexto o motivación]
3. [Alineación clave]
4. [Estilo de juego]
🧠 **CÓDIGO CONVERGENCIA:** [C1–C2–C3–C4–C5]
[PICK_END]

Si no se cumple la seguridad extrema, responde:
🚫 “PICK BLOQUEADO – NO CUMPLE CRITERIOS DE SEGURIDAD”
[Motivo exacto del bloqueo]

Idioma: ${languageName.toUpperCase()}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: pickPrompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    return response.text || "Error en el sistema de predicción.";
  } catch (error) { return "Error de análisis."; }
};

export const fetchBasketballMatchesOnly = async (params: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const leagueQuery = params.query ? `competición "${params.query}"` : 'NBA, Euroliga y ligas principales';
  
  const prompt = `ROL: Analista experto de Baloncesto. USA GOOGLE SEARCH OBLIGATORIAMENTE.
  Busca el calendario OFICIAL para la fecha EXACTA: ${params.date}.
  Liga: ${leagueQuery}. Solo partidos confirmados para ese día específico.
  
  FORMATO JSON ESTRICTO:
  {"groups": [{"country": "string", "league": "string", "matches": [{"id": "id", "homeTeam": "nombre", "awayTeam": "nombre", "homeTeamId": "string", "awayTeamId": "string", "homeLogo": "url", "awayLogo": "url", "time": "HH:MM", "status": "scheduled", "score": "", "briefStatus": "Fase Regular"}]}]}`;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview", 
      contents: prompt, 
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } 
    });
    
    const parsed = safeJsonParse(response.text || '{"groups":[]}');
    const groupsRaw = (parsed?.groups || []).map((g: any) => ({ 
      ...g, 
      matches: (g.matches || []).map((m: any) => ({ 
        ...m, 
        date: params.date,
        sport: 'basketball', 
        league: g.league, 
        country: g.country 
      })) 
    }));
    
    const groups = await Promise.all(groupsRaw.map(async (g: any) => {
      const matchesWithOdds = await fetchOddsForMatches(g.matches, 'basketball');
      return { ...g, matches: matchesWithOdds };
    }));

    return { groups, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (e) { 
    console.error("Error in fetchBasketballMatchesOnly:", e);
    return { groups: [], sources: [] }; 
  }
};

export const fetchLeagueMatchCounts = async (date: string, sport: Sport, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Conteo de partidos por liga para ${date} en ${sport}. JSON: {"NombreLiga": numero_partidos}.`;
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt, 
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" } 
    });
    return safeJsonParse(response.text || '{}') || {};
  } catch (e) { return {}; }
};
