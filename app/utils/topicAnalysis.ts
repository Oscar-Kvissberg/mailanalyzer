interface TopicAnalysis {
    commonSubjects: { phrase: string; count: number }[];
    topicClusters: { topic: string; keywords: string[]; count: number }[];
}

export function analyzeTopics(emails: any[]): TopicAnalysis {
    // Analysera ämnesrader
    const subjectPhrases = new Map<string, number>();

    emails.forEach(email => {
        const subject = email[2].toLowerCase();
        // Dela upp ämnet i fraser (2-3 ord)
        const words = subject.split(' ');
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = words.slice(i, i + 2).join(' ');
            subjectPhrases.set(phrase, (subjectPhrases.get(phrase) || 0) + 1);
        }
    });

    // Gruppera liknande ämnen
    const topics = new Map<string, { keywords: Set<string>; count: number }>();

    emails.forEach(email => {
        const subject = email[2].toLowerCase();
        const content = email[3].toLowerCase();

        // Enkelt keyword-baserat clustering
        if (content.includes('faktura') || subject.includes('faktura')) {
            const topic = 'Fakturering';
            if (!topics.has(topic)) {
                topics.set(topic, { keywords: new Set(['faktura', 'betalning', 'kostnad']), count: 0 });
            }
            topics.get(topic)!.count++;
        }

        if (content.includes('möte') || subject.includes('möte')) {
            const topic = 'Möten';
            if (!topics.has(topic)) {
                topics.set(topic, { keywords: new Set(['möte', 'agenda', 'kalendern']), count: 0 });
            }
            topics.get(topic)!.count++;
        }

        if (content.includes('support') || subject.includes('hjälp')) {
            const topic = 'Support';
            if (!topics.has(topic)) {
                topics.set(topic, { keywords: new Set(['support', 'hjälp', 'problem']), count: 0 });
            }
            topics.get(topic)!.count++;
        }
    });

    return {
        commonSubjects: Array.from(subjectPhrases.entries())
            .map(([phrase, count]) => ({ phrase, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        topicClusters: Array.from(topics.entries())
            .map(([topic, data]) => ({
                topic,
                keywords: Array.from(data.keywords),
                count: data.count
            }))
            .sort((a, b) => b.count - a.count)
    };
} 