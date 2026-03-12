import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to your .env file.' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = ((await import('pdf-parse')) as any).default
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text?.trim()

    if (!text) {
      return NextResponse.json(
        { error: 'Could not extract text from this PDF. It may be image-based (scanned) — try a digital/native PDF.' },
        { status: 400 }
      )
    }

    // Use Claude to extract structured invoice data
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract invoice data from the text below. Return ONLY a valid JSON object — no markdown, no explanation.

Required JSON structure:
{
  "supplier_name": "company name as a string, or null",
  "invoice_date": "date in YYYY-MM-DD format, or null",
  "reference": "invoice number or reference string, or null",
  "line_items": [
    {
      "description": "original product description from the invoice",
      "quantity": <number>,
      "unit": "<one of: g, kg, ml, L, unit, each, dozen, lb, oz, pack, bag, box>",
      "total_cost": <line total as a number in GBP, no currency symbol>
    }
  ]
}

Rules:
- Only include real product/ingredient line items. Exclude VAT, delivery charges, discounts, subtotals and totals.
- For unit, choose the closest match from the allowed list based on context.
- total_cost must be the line total as a plain number (e.g. 12.50, not "£12.50").
- If a field cannot be reliably determined, use null.

Invoice text:
${text.slice(0, 8000)}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from AI')

    // Strip markdown code fences if the model wraps the JSON
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
    }

    const parsed = JSON.parse(jsonText)
    return NextResponse.json(parsed)
  } catch (error: unknown) {
    console.error('PDF parse error:', error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'AI returned malformed data — please try again.' }, { status: 500 })
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 })
  }
}
