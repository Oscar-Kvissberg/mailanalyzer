interface ActivityPrediction {
    historicalData: {
        labels: string[];
        values: number[];
    };
    yearOverYear: {
        year: number;
        total: number;
        monthlyDistribution: number[];
    }[];
}

export function predictEmailActivity(emails: any[]): ActivityPrediction {
    // Validera och filtrera bort ogiltiga datum
    const validEmails = emails.filter(email => {
        const date = new Date(email[4]);
        return !isNaN(date.getTime());
    });

    // Sortera mejlen efter datum
    const sortedEmails = [...validEmails].sort((a, b) =>
        new Date(a[4]).getTime() - new Date(b[4]).getTime()
    );

    // Gruppera efter år och månad
    const monthlyData = new Map<string, number>();
    const yearlyData = new Map<number, number[]>();

    sortedEmails.forEach(email => {
        const date = new Date(email[4]);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;

        // Uppdatera månadsdata
        monthlyData.set(key, (monthlyData.get(key) || 0) + 1);

        // Uppdatera årsdata
        if (!yearlyData.has(year)) {
            yearlyData.set(year, new Array(12).fill(0));
        }
        yearlyData.get(year)![month]++;
    });

    // Skapa tidsserie för graf
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const labels = sortedMonths.map(key => {
        const [year, month] = key.split('-');
        return `${year}-${month}`;
    });
    const values = sortedMonths.map(key => {
        const value = monthlyData.get(key) || 0;
        return isNaN(value) ? 0 : value; // Säkerställ att vi inte har NaN-värden
    });

    // Skapa år-över-år data
    const yearOverYear = Array.from(yearlyData.entries())
        .map(([year, monthlyDistribution]) => ({
            year,
            total: monthlyDistribution.reduce((a, b) => (isNaN(b) ? a : a + b), 0),
            monthlyDistribution: monthlyDistribution.map(v => isNaN(v) ? 0 : v)
        }))
        .sort((a, b) => a.year - b.year);

    return {
        historicalData: {
            labels,
            values
        },
        yearOverYear
    };
} 