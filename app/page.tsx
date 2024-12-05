'use client';
import { useState } from 'react';
import Link from 'next/link';
import { analyzeTopics } from './utils/topicAnalysis';
import { predictEmailActivity } from './utils/predictiveAnalysis';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

interface EmailAnalysis {
  totalEmails: number;
  categories: {
    complaints: number;
    inquiries: number;
    feedback: number;
    urgent: number;
    internal: number;
    external: number;
  };
  timeStats: {
    byMonth: Record<string, number>;
    byDayOfWeek: Record<string, number>;
    byHour: Record<string, number>;
  };
  topSenders: Array<{ email: string; count: number }>;
  topRecipients: Array<{ email: string; count: number }>;
  responseTimeAvg: number; // i timmar
  topicAnalysis: {
    commonSubjects: { phrase: string; count: number }[];
    topicClusters: { topic: string; keywords: string[]; count: number }[];
  };
  predictions: {
    highActivityPeriods: {
      daily: { hour: number; probability: number }[];
      weekly: { day: string; probability: number }[];
      monthly: { month: string; probability: number }[];
    };
    patterns: {
      description: string;
      confidence: number;
    }[];
    upcomingPeaks: {
      date: string;
      reason: string;
      expectedVolume: number;
    }[];
    historicalData: {
      labels: string[];
      values: number[];
    };
    yearOverYear: {
      year: number;
      total: number;
      monthlyDistribution: number[];
    }[];
  };
}

// Registrera Chart.js komponenter (lägg till direkt efter imports)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Ta bort heroicons import och använd dessa SVG-komponenter istället:
const Icons = {
  Envelope: () => (
    <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Chart: () => (
    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Users: () => (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
};

export default function Home() {
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);

  const categorizeEmail = (subject: string, content: string): string[] => {
    const categories: string[] = [];
    const lowerSubject = subject.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Identifiera klagomål
    if (
      lowerContent.includes('problem') ||
      lowerContent.includes('klagomål') ||
      lowerContent.includes('missnöjd') ||
      lowerContent.includes('fel') ||
      lowerContent.includes('dålig')
    ) {
      categories.push('complaints');
    }

    // Identifiera brådskande ärenden
    if (
      lowerSubject.includes('urgent') ||
      lowerSubject.includes('asap') ||
      lowerSubject.includes('brådskande') ||
      lowerSubject.includes('akut')
    ) {
      categories.push('urgent');
    }

    // Identifiera förfrågningar
    if (
      lowerContent.includes('fråga') ||
      lowerContent.includes('undrar') ||
      lowerContent.includes('hur') ||
      lowerContent.includes('när') ||
      lowerContent.includes('vem')
    ) {
      categories.push('inquiries');
    }

    // Identifiera feedback
    if (
      lowerContent.includes('feedback') ||
      lowerContent.includes('förslag') ||
      lowerContent.includes('tycker') ||
      lowerContent.includes('åsikt')
    ) {
      categories.push('feedback');
    }

    return categories;
  };

  const performAIAnalysis = async (emails: any[]) => {
    try {
      // Begränsa antal mejl och sammanfatta innehållet
      const summarizedEmails = emails
        .slice(0, 50) // Begränsa till 50 mejl
        .map(email => ({
          subject: email[2],
          content: email[3].substring(0, 200) + '...', // Begränsa innehållslängden
          date: email[4]
        }));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: summarizedEmails,
          totalEmails: emails.length // Skicka med totala antalet för kontext
        }),
      });

      if (!response.ok) throw new Error('AI-analys misslyckades');

      const data = await response.json();
      return data.analysis;
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`AI-analys fel: ${error.message}`);
      } else {
        alert('Ett oväntat fel uppstod vid AI-analysen');
      }
      return null;
    }
  };

  const logError = (message: string, error: unknown) => {
    if (error instanceof Error) {
      alert(`${message}: ${error.message}`);
    } else {
      alert(message);
    }
  };

  const cleanEmailSender = (sender: string): string => {
    // Ta bort vanliga signaturer och disclaimers
    let cleaned = sender
      .replace(/Skickat från min iPhone/i, '')
      .replace(/ATTENTION: This e-mail.*recipient/i, '')
      .replace(/\/\/.*$/i, '') // Ta bort kommentarer som börjar med //
      .trim();

    // Om avsändaren är tom eller bara innehåller specialtecken
    if (!cleaned || cleaned.length < 2) {
      return 'Okänd avsändare';
    }

    // Hantera specialfall för företagsnamn
    if (cleaned.includes('Komplett Företag')) {
      return 'Komplett Företag';
    }

    // Hantera encoding-problem för svenska tecken
    cleaned = cleaned
      .replace(/\u00f6|\u00F6|ö/g, 'ö')  // ö
      .replace(/\u00e5|\u00E5|å/g, 'å')  // å
      .replace(/\u00e4|\u00E4|ä/g, 'ä'); // ä

    return cleaned;
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);

    try {
      const text = await selectedFile.text();
      const rows = text.split('\n')
        .map(row => row.split(','))
        .filter(row => row.length >= 5);

      const header = rows[0];
      const emails = rows.slice(1);

      const categories = {
        complaints: 0,
        inquiries: 0,
        feedback: 0,
        urgent: 0,
        internal: 0,
        external: 0,
      };

      const senderCounts: Record<string, number> = {};
      const recipientCounts: Record<string, number> = {};
      const monthCounts: Record<string, number> = {};
      const dayOfWeekCounts: Record<string, number> = {};
      const hourCounts: Record<string, number> = {};

      emails.forEach(email => {
        const [sender, recipient, subject, content, dateStr] = email;
        const date = new Date(dateStr);

        // Räkna avsändare och mottagare
        senderCounts[sender] = (senderCounts[sender] || 0) + 1;
        recipientCounts[recipient] = (recipientCounts[recipient] || 0) + 1;

        // Kategorisera mejlet
        const emailCategories = categorizeEmail(subject, content);
        emailCategories.forEach(category => {
          if (category in categories) {
            categories[category as keyof typeof categories]++;
          }
        });

        // Intern/extern kommunikation
        if (sender.includes('@internt.com') && recipient.includes('@internt.com')) {
          categories.internal++;
        } else {
          categories.external++;
        }

        // Tidsstatistik
        const month = date.toLocaleString('sv-SE', { month: 'long' });
        const dayOfWeek = date.toLocaleString('sv-SE', { weekday: 'long' });
        const hour = date.getHours();

        monthCounts[month] = (monthCounts[month] || 0) + 1;
        dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const topSenders = Object.entries(senderCounts)
        .filter(([sender, count]) =>
          sender !== 'Okänd avsändare' &&
          sender.length > 2 &&
          !sender.includes('ATTENTION') &&
          !sender.includes('Skickat från')
        )
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topRecipients = Object.entries(recipientCounts)
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Lägg till AI-analys
      const aiAnalysisResult = await performAIAnalysis(emails);

      const topicAnalysis = analyzeTopics(emails);

      const predictions = predictEmailActivity(emails);

      setAnalysis({
        totalEmails: emails.length,
        categories,
        timeStats: {
          byMonth: monthCounts,
          byDayOfWeek: dayOfWeekCounts,
          byHour: hourCounts,
        },
        topSenders,
        topRecipients,
        responseTimeAvg: 24, // Detta är en placeholder - implementera faktisk beräkning
        topicAnalysis,
        predictions,
      });
    } catch (error: unknown) {
      logError('Ett fel uppstod vid analysen av filen', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Icons.Envelope />
                <span className="ml-2 text-xl font-bold">E-postanalys</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/" className="border-b-2 border-blue-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 text-sm font-medium">
                  Hem
                </Link>
                <Link href="/analyzer" className="border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 text-sm font-medium">
                  Analyzer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filuppladdning */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Ladda upp CSV-fil</h2>
            <div className="flex flex-col items-center space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Välj fil
              </label>
              {selectedFile && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Vald fil: {selectedFile.name}
                </p>
              )}
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || analyzing}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white 
                  ${!selectedFile || analyzing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyserar...
                  </>
                ) : 'Analysera'}
              </button>
            </div>
          </div>
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Översiktskort */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icons.Chart />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Totalt antal mejl
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                          {analysis.totalEmails.toLocaleString()}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kategorier */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icons.Chart />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Klagomål
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                          {analysis.categories.complaints}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icons.Chart />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Förfrågningar
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                          {analysis.categories.inquiries}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icons.Chart />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Brådskande
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                          {analysis.categories.urgent}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Graf */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">E-postaktivitet över tid</h2>
              <div className="h-[400px]">
                <Line
                  data={{
                    labels: analysis.predictions.historicalData.labels,
                    datasets: [{
                      label: 'Antal e-post per månad',
                      data: analysis.predictions.historicalData.values,
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                          size: 14,
                          weight: 'bold'
                        },
                        bodyFont: {
                          size: 13
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        },
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Detaljerade analyskort */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Topp avsändare */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Icons.Users />
                  <h2 className="text-lg font-semibold ml-2">Topp Avsändare</h2>
                </div>
                <div className="space-y-3">
                  {analysis.topSenders.map(({ email, count }, index) => (
                    <div key={email} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                        {index + 1}. {email}
                      </span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topp mottagare */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Icons.Users />
                  <h2 className="text-lg font-semibold ml-2">Topp Mottagare</h2>
                </div>
                <div className="space-y-3">
                  {analysis.topRecipients.map(({ email, count }, index) => (
                    <div key={email} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                        {index + 1}. {email}
                      </span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vanliga ämnesfraser */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Icons.Chart />
                  <h2 className="text-lg font-semibold ml-2">Vanliga ämnesfraser</h2>
                </div>
                <div className="space-y-3">
                  {analysis.topicAnalysis.commonSubjects.map(({ phrase, count }, index) => (
                    <div key={phrase} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                        {index + 1}. {phrase}
                      </span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ämneskategorier */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Icons.Chart />
                  <h2 className="text-lg font-semibold ml-2">Ämneskategorier</h2>
                </div>
                <div className="space-y-3">
                  {analysis.topicAnalysis.topicClusters.map(({ topic, count, keywords }) => (
                    <div key={topic} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {topic}
                        </span>
                        <span className="text-sm font-semibold">{count}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Nyckelord: {keywords.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tidsfördelning */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Icons.Chart />
                  <h2 className="text-lg font-semibold ml-2">Tidsfördelning</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Per veckodag</h3>
                    <div className="space-y-2">
                      {Object.entries(analysis.timeStats.byDayOfWeek).map(([day, count]) => (
                        <div key={day} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{day}</span>
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Vanligaste tiderna</h3>
                    <div className="space-y-2">
                      {Object.entries(analysis.timeStats.byHour)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([hour, count]) => (
                          <div key={hour} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {hour}:00
                            </span>
                            <span className="text-sm font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
