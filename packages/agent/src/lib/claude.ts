import Anthropic from '@anthropic-ai/sdk';
import type { BoardSnapshot, AgentRecommendation, CardWithMeta } from '../types.js';

const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You are the Administrative Assistant Agent for a personal Kanban board. Your job is to analyze the current board state and identify problems that need attention.

You operate for Jak, a franchise operator at The Exercise Coach in St. Petersburg, FL.

RULES:
- You surface recommendations only. You never take direct action.
- Be specific and actionable in every recommendation.
- Prioritize: overdue > high priority blocked > at-risk > missing info > general improvements.
- Return ONLY a valid JSON array. No prose, no markdown, no explanation outside the JSON.

RECOMMENDATION TYPES: overdue, stuck, missing_info, priority_change, dependency_conflict, calendar_sync, general

RESPONSE FORMAT (JSON array):
[
  {
    "type": "overdue",
    "card_id": "<uuid or null if board-level>",
    "card_title": "<title for context>",
    "suggested_action": "<specific action Jak should take>",
    "reasoning": "<why this matters>",
    "confidence": 0.95,
    "integration_actions": []
  }
]

Max 10 recommendations per scan. Sort by confidence descending. If no problems found, return [].`;

function formatCardLine(card: CardWithMeta): string {
  const parts = [
    `- "${card.title}" [${card.card_status}/${card.card_priority}]`,
  ];
  if (card.due_date) {
    parts.push(`due: ${card.due_date}`);
  }
  if (card.days_overdue !== undefined && card.days_overdue > 0) {
    parts.push(`${card.days_overdue}d overdue`);
  }
  if (card.days_in_progress !== undefined) {
    parts.push(`${card.days_in_progress}d in progress`);
  }
  if (!card.description && !card.assignee_id) {
    parts.push('(no description, no assignee)');
  } else if (!card.description) {
    parts.push('(no description)');
  } else if (!card.assignee_id) {
    parts.push('(no assignee)');
  }
  return parts.join(' | ');
}

function buildUserMessage(snapshot: BoardSnapshot): string {
  const lines: string[] = [
    `Current board snapshot as of ${snapshot.timestamp}:`,
    '',
  ];

  // Overdue cards
  lines.push(`OVERDUE CARDS (past due_date):`);
  if (snapshot.overdue_cards.length === 0) {
    lines.push('  (none)');
  } else {
    for (const card of snapshot.overdue_cards) {
      lines.push('  ' + formatCardLine(card));
    }
  }
  lines.push('');

  // In progress
  lines.push(`IN PROGRESS (${snapshot.in_progress_cards.length}):`);
  if (snapshot.in_progress_cards.length === 0) {
    lines.push('  (none)');
  } else {
    for (const card of snapshot.in_progress_cards) {
      lines.push('  ' + formatCardLine(card));
    }
  }
  lines.push('');

  // High priority backlog
  lines.push(`HIGH PRIORITY BACKLOG (${snapshot.high_priority_backlog.length}):`);
  if (snapshot.high_priority_backlog.length === 0) {
    lines.push('  (none)');
  } else {
    for (const card of snapshot.high_priority_backlog) {
      lines.push('  ' + formatCardLine(card));
    }
  }
  lines.push('');

  // Stuck cards
  lines.push(`STUCK CARDS (in_progress > 5 days):`);
  if (snapshot.stuck_cards.length === 0) {
    lines.push('  (none)');
  } else {
    for (const card of snapshot.stuck_cards) {
      lines.push('  ' + formatCardLine(card));
    }
  }
  lines.push('');

  // Missing info
  lines.push(`MISSING INFO (no description or no assignee):`);
  if (snapshot.missing_info_cards.length === 0) {
    lines.push('  (none)');
  } else {
    for (const card of snapshot.missing_info_cards) {
      lines.push('  ' + formatCardLine(card));
    }
  }
  lines.push('');

  // All active cards
  lines.push(`ALL ACTIVE CARDS (${snapshot.stats.total_active} total):`);
  if (snapshot.all_cards.length === 0) {
    lines.push('  (none)');
  } else {
    for (const card of snapshot.all_cards) {
      lines.push('  ' + formatCardLine(card));
    }
  }
  lines.push('');

  lines.push('Analyze and return recommendations as JSON.');

  return lines.join('\n');
}

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.warn('[claude] WARNING: CLAUDE_API_KEY not set.');
    }
    anthropicClient = new Anthropic({
      apiKey: apiKey ?? 'placeholder-claude-key',
    });
  }
  return anthropicClient;
}

export async function analyzeBoard(snapshot: BoardSnapshot): Promise<AgentRecommendation[]> {
  const client = getClient();
  const userMessage = buildUserMessage(snapshot);

  console.log(`[claude] Calling ${MODEL} for board analysis...`);

  let responseText: string;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.error('[claude] No text block in response.');
      return [];
    }
    responseText = textBlock.text;
    console.log(`[claude] Response received. Tokens used: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`);
  } catch (err) {
    console.error('[claude] API call failed:', err instanceof Error ? err.message : String(err));
    return [];
  }

  // Parse JSON response
  try {
    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.error('[claude] Response is not a JSON array.');
      return [];
    }

    // Validate and coerce each recommendation
    const recommendations: AgentRecommendation[] = [];
    for (const item of parsed) {
      if (
        typeof item.type === 'string' &&
        typeof item.card_title === 'string' &&
        typeof item.suggested_action === 'string' &&
        typeof item.reasoning === 'string' &&
        typeof item.confidence === 'number'
      ) {
        recommendations.push({
          type: item.type,
          card_id: item.card_id ?? null,
          card_title: item.card_title,
          suggested_action: item.suggested_action,
          reasoning: item.reasoning,
          confidence: item.confidence,
          integration_actions: Array.isArray(item.integration_actions) ? item.integration_actions : [],
        });
      } else {
        console.warn('[claude] Skipping malformed recommendation item:', item);
      }
    }

    console.log(`[claude] Parsed ${recommendations.length} recommendation(s).`);
    return recommendations;
  } catch (err) {
    console.error('[claude] Failed to parse JSON response:', err instanceof Error ? err.message : String(err));
    console.error('[claude] Raw response was:', responseText.slice(0, 500));
    return [];
  }
}
