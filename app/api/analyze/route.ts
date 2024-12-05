import { NextResponse } from 'next/server';
import { openai } from '@/app/utils/openai';

export async function POST(request: Request) {
    try {
        const { emails, totalEmails } = await request.json();

        const prompt = `Analysera följande ${emails.length} e-postmeddelanden (av totalt ${totalEmails} meddelanden) och ge en sammanfattande rapport:
    - Identifiera de 3-5 huvudsakliga temana
    - Ge en övergripande bedömning av tonen (positiv/negativ/neutral)
    - Identifiera de mest återkommande ärendena eller frågorna
    - Föreslå 2-3 konkreta förbättringsområden baserat på meddelandenas innehåll
    
    Formatera svaret i HTML-format med <h3> för rubriker och <ul> för listor.
    
    E-postmeddelanden:
    ${JSON.stringify(emails, null, 2)}`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4-turbo-preview",
            max_tokens: 1000,
        });

        return NextResponse.json({
            analysis: completion.choices[0].message.content
        });
    } catch (error) {
        console.error('OpenAI API Error:', error);
        return NextResponse.json({ error: 'Analys misslyckades' }, { status: 500 });
    }
} 