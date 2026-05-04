import Anthropic from '@anthropic-ai/sdk'
import { MatchAnalysisContext, AnalysisReport } from '@/types/analysis'
import { AnalysisType } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(): string {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `You are Genius, BetGenius AI's elite football data analyst. You provide comprehensive statistical analysis across EVERY betting market category — exactly like a professional odds compiler.

TODAY'S DATE: ${dateStr}

SQUAD KNOWLEDGE — CRITICAL: Always use squad information that is accurate as of TODAY's date above. Players transfer between clubs; always name players at their CURRENT club as of today.
Key recent transfers you must know:
- Kylian Mbappé signed for REAL MADRID in summer 2024 — he is NOT at PSG.
- Vinicius Jr, Bellingham, Valverde, Courtois are Real Madrid players.
- Erling Haaland is at Manchester City.
- When naming players for the Players markets, use squad knowledge current as of ${dateStr}.
- If uncertain about a player's current club, prefer naming a clearly established player at that club rather than risk citing a transferred player.

ANALYSIS RULES:
- Base analysis on the data provided. Where specific stats are missing, use your expert knowledge of these teams/competition.
- ALWAYS list every market below — even if confidence is low. For confidence < 65%: set isInsufficientData=true, recommendedSelection="No Clear Edge", confidence=0. Never skip a market entirely.
- valueIndicator=true when the implied probability from typical market odds is lower than your calculated probability.
- 1 sentence max per reasoning field. Be concise.

YOU MUST OUTPUT ALL OF THE FOLLOWING MARKETS. Use these exact marketName values. For each market output a confidence number, a 1-sentence reasoning, and set isInsufficientData=true only if you truly cannot assess it.

MATCH category (8 markets):
"Full Time Result", "Double Chance", "Draw No Bet", "Both Teams To Score (BTTS)",
"Match Result & BTTS", "Win To Nil - Home", "Win To Nil - Away", "Clean Sheet - Home", "Clean Sheet - Away", "Score In Both Halves"

TOTALS category (14 markets):
"Over/Under 1.5 Goals", "Over/Under 2.5 Goals", "Over/Under 3.5 Goals", "Over/Under 4.5 Goals", "Over/Under 5.5 Goals",
"Exact Goals 0-1", "Exact Goals 2-3", "Exact Goals 4+",
"Home Team Over/Under 0.5 Goals", "Home Team Over/Under 1.5 Goals", "Home Team Over/Under 2.5 Goals",
"Away Team Over/Under 0.5 Goals", "Away Team Over/Under 1.5 Goals", "Away Team Over/Under 2.5 Goals"

HANDICAPS category (12 markets):
"Asian Handicap -1.5", "Asian Handicap -1", "Asian Handicap -0.75", "Asian Handicap -0.5",
"Asian Handicap +0.5", "Asian Handicap +0.75", "Asian Handicap +1", "Asian Handicap +1.5",
"European Handicap -2", "European Handicap -1", "European Handicap +1", "European Handicap +2"

HALVES category (14 markets):
"1st Half Result", "1st Half Double Chance", "1st Half Draw No Bet",
"1st Half Over/Under 0.5 Goals", "1st Half Over/Under 1.5 Goals", "1st Half BTTS",
"2nd Half Result", "2nd Half Double Chance",
"2nd Half Over/Under 0.5 Goals", "2nd Half Over/Under 1.5 Goals", "2nd Half Over/Under 2.5 Goals", "2nd Half BTTS",
"Both Halves Over 0.5 Goals", "Highest Scoring Half"

MINUTES category (10 markets):
"First Team To Score", "Last Team To Score", "No Goal First 15 Minutes",
"1-15 Min Over 0.5 Goals", "1-30 Min Over 0.5 Goals", "1-30 Min Over 1.5 Goals",
"1-60 Min Over 1.5 Goals", "1-60 Min Over 2.5 Goals", "1-75 Min Over 1.5 Goals", "1-75 Min Over 2.5 Goals"

COMBOS category (15 markets):
"HT/FT - Home/Home", "HT/FT - Draw/Home", "HT/FT - Home/Draw", "HT/FT - Draw/Away", "HT/FT - Away/Away",
"Outcome & Over 2.5 Goals", "Outcome & Under 2.5 Goals", "Outcome & BTTS Yes", "Outcome & BTTS No",
"Double Chance & Over 2.5 Goals", "Double Chance & BTTS Yes",
"Win To Nil & Over 1.5 Goals", "Correct Score 1-0", "Correct Score 0-1", "Correct Score 1-1"

PLAYERS category — use your expert squad knowledge to name real players (12 markets):
"Anytime Goalscorer - [Home Team Top Scorer]", "Anytime Goalscorer - [Home Team 2nd Scorer]", "Anytime Goalscorer - [Home Team 3rd Scorer]",
"Anytime Goalscorer - [Away Team Top Scorer]", "Anytime Goalscorer - [Away Team 2nd Scorer]", "Anytime Goalscorer - [Away Team 3rd Scorer]",
"First Goalscorer - [Most Likely Player]", "Last Goalscorer - [Most Likely Player]",
"Player To Score 2+ Goals", "Player To Score A Hat-trick",
"Home Team - Clean Sheet Goalkeeper", "Player To Be Booked - [Most Likely]"

CORNERS category (10 markets):
"Over/Under 7.5 Corners", "Over/Under 8.5 Corners", "Over/Under 9.5 Corners", "Over/Under 10.5 Corners", "Over/Under 11.5 Corners",
"Home Team Over/Under 4.5 Corners", "Away Team Over/Under 3.5 Corners",
"1st Half Over/Under 4.5 Corners", "Most Corners", "Race To 5 Corners"

FOULS category (8 markets):
"Over/Under 2.5 Cards", "Over/Under 3.5 Cards", "Over/Under 4.5 Cards", "Over/Under 5.5 Cards",
"Both Teams To Receive A Card", "Home Team Over/Under 1.5 Cards", "Away Team Over/Under 1.5 Cards",
"Player To Receive A Red Card"

CRITICAL: Your ENTIRE response must be a single valid JSON object. No markdown, no code fences, no preamble. Start with { and end with }.

JSON SCHEMA:
{
  "matchId": "string",
  "summary": "1-sentence match summary",
  "generatedAt": "ISO8601 datetime",
  "analysisType": "quick_pick" | "full_report" | "full_expert_report",
  "overallVerdict": "2-3 sentence match verdict",
  "topPick": { "category": "string", "selection": "string", "confidence": number, "reasoning": "2-3 sentences" },
  "riskRating": "low" | "medium" | "high",
  "riskTier": "safe_acca" | "balanced_acca" | "high_risk_acca",
  "marketAnalysis": [
    { "category": "Match|Totals|Handicaps|Halves|Minutes|Combos|Players|Fouls", "marketName": "string", "recommendedSelection": "string", "confidence": number, "reasoning": "MAX 1 short sentence", "valueIndicator": boolean, "isInsufficientData": boolean }
  ],
  "correctScoreTop3": [{ "score": "string", "confidence": number, "reasoning": "string" }],
  "accumulatorBuilder": [],
  "keyInsights": ["up to 5 bullet points"],
  "newsImpact": "string or null",
  "dataQualityNote": "string or null"
}`

function buildPrompt(ctx: MatchAnalysisContext, type: AnalysisType): string {
  const base = `
Match: ${ctx.match.homeTeam.name} vs ${ctx.match.awayTeam.name}
Competition: ${ctx.match.competition} — ${ctx.match.stage}
Kickoff: ${ctx.match.kickoff} | Venue: ${ctx.match.venue}

HOME TEAM LAST 10: ${JSON.stringify(ctx.last10Results.homeTeam)}
AWAY TEAM LAST 10: ${JSON.stringify(ctx.last10Results.awayTeam)}
HOME FORM: ${JSON.stringify(ctx.homeTeamForm)}
AWAY FORM: ${JSON.stringify(ctx.awayTeamForm)}
H2H: ${JSON.stringify(ctx.headToHead)}
STANDINGS: ${JSON.stringify(ctx.standings)}
INJURIES: ${JSON.stringify(ctx.injuries)}
ODDS: ${JSON.stringify(ctx.odds)}
LINEUPS: ${ctx.lineups.length ? ctx.lineups.join(', ') : 'Not yet confirmed'}
RECENT NEWS: ${JSON.stringify(ctx.recentNews)}
FATIGUE: ${JSON.stringify(ctx.fatigueFactors)}
USER TIER: ${ctx.userPreferences.tier}
PREFERRED MARKETS: ${ctx.userPreferences.preferredMarkets.join(', ')}
`

  if (type === 'quick_pick') {
    return `${base}
TASK: Quick Pick. Identify the single highest-confidence market selection. Populate marketAnalysis with at least 5 markets across Match, Totals, and one other category. Set topPick to your best selection. Include 3 keyInsights.`
  }

  if (type === 'full_report') {
    return `${base}
TASK: Full Report. Output the top 4-5 markets from EACH of the 8 categories (Match, Totals, Handicaps, Halves, Minutes, Combos, Players, Fouls) — minimum 35 markets total. Use the exact marketName values from the system prompt. Keep reasoning to 1 sentence. Include correctScoreTop3 and 5 keyInsights.`
  }

  return `${base}
TASK: Full Expert Report. Output EVERY market listed in the system prompt — all 8 categories, all specific market names. Do not skip any market. For low-confidence markets set isInsufficientData=true. Keep reasoning to 1 sentence. Include correctScoreTop3 and 5 keyInsights.`
}

export async function generateAnalysis(
  ctx: MatchAnalysisContext,
  type: AnalysisType
): Promise<AnalysisReport> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: type === 'quick_pick' ? 2048 : type === 'full_report' ? 8000 : 16000,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildPrompt(ctx, type),
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Extract JSON — strip markdown code fences if present, then parse
  let text = content.text.trim()

  // Remove ```json ... ``` or ``` ... ``` wrappers (greedy — captures full nested JSON)
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/m)
  if (fenceMatch) text = fenceMatch[1].trim()

  // Find the outermost JSON object (greedy from first { to last })
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    console.error('No JSON braces found. Response snippet:', text.slice(0, 300))
    throw new Error('No JSON found in Claude response')
  }
  const rawJson = text.slice(start, end + 1)

  try {
    return JSON.parse(rawJson) as AnalysisReport
  } catch (parseErr: any) {
    // Try to repair truncated JSON (token limit cut the response mid-array)
    console.warn('Initial JSON parse failed, attempting repair:', parseErr.message)
    try {
      const repaired = repairTruncatedJSON(rawJson)
      return JSON.parse(repaired) as AnalysisReport
    } catch (repairErr: any) {
      console.error('JSON repair also failed:', repairErr.message)
      console.error('Raw JSON snippet (first 600):', rawJson.slice(0, 600))
      console.error('Raw JSON snippet (last 200):', rawJson.slice(-200))
      throw new Error(`Claude returned invalid JSON: ${parseErr.message}`)
    }
  }
}

/**
 * Attempts to repair JSON that was truncated mid-way (e.g. due to token limit).
 * Walks the string tracking open brackets/braces and string state,
 * then closes anything left open.
 */
function repairTruncatedJSON(text: string): string {
  const stack: string[] = []
  let inString = false
  let escaped = false
  let lastCompleteObjectEnd = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{' || ch === '[') {
      stack.push(ch === '{' ? '}' : ']')
    } else if (ch === '}' || ch === ']') {
      stack.pop()
      // Track last position where the outer object was still balanced at depth 1
      if (stack.length === 1) lastCompleteObjectEnd = i
    }
  }

  if (stack.length === 0) return text // already valid

  // Truncate to last complete inner object if we can, then close remaining brackets
  let result = text
  if (lastCompleteObjectEnd > 0 && stack.length > 1) {
    // Cut off the incomplete trailing content after last complete inner item
    result = text.slice(0, lastCompleteObjectEnd + 1)
    // Re-calculate what's still open
    const remaining: string[] = []
    let ins = false, esc = false
    for (let i = 0; i < result.length; i++) {
      const c = result[i]
      if (esc) { esc = false; continue }
      if (c === '\\' && ins) { esc = true; continue }
      if (c === '"') { ins = !ins; continue }
      if (ins) continue
      if (c === '{' || c === '[') remaining.push(c === '{' ? '}' : ']')
      else if (c === '}' || c === ']') remaining.pop()
    }
    while (remaining.length > 0) result += remaining.pop()!
  } else {
    while (stack.length > 0) result += stack.pop()!
  }

  return result
}
