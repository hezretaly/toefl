// src/pages/ReviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Mic, FileEdit, Loader2, AlertCircle, CheckSquare, MessageSquare } from 'lucide-react'; // Added icons
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchUserReviewSummaries } from '@/services/api'; // Assuming this function exists
import { SectionSummaryUser } from '@/types'; // Define this type

// Define the type for user review summaries
interface SectionSummaryUser {
  sectionId: number;
  sectionTitle: string;
  sectionType: 'speaking' | 'writing' | 'reading' | 'listening';
  completedAt?: string;
  feedbackProvided: boolean; 
}

const ReviewPage = () => {
  const [activeTab, setActiveTab] = useState<'speaking' | 'writing' | 'reading' | 'listening'>('speaking');
  const [summaries, setSummaries] = useState<SectionSummaryUser[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // Fetch summaries
  useEffect(() => {
    if (isAuthenticated && token) {
      const loadSummaries = async () => {
        setIsLoadingSummaries(true);
        setError(null);
        try {
          // Assuming fetchUserReviewSummaries exists in your API service
          const data = await fetchUserReviewSummaries(token);
          setSummaries(data);
        } catch (err: any) {
          console.error("Error fetching review summaries:", err);
          setError(err.message || "Failed to load completed tests.");
        } finally {
          setIsLoadingSummaries(false);
        }
      };
      loadSummaries();
    }
  }, [isAuthenticated, token]); // Depend on token as well

  if (isAuthLoading) {
    // Auth loading indicator...
    return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center">Loading...</main><Footer /></div> );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'speaking': return <Mic className="h-5 w-5 text-toefl-green" />;
      case 'writing': return <FileEdit className="h-5 w-5 text-toefl-orange" />;
      case 'reading': return <BookOpen className="h-5 w-5 text-toefl-blue" />;
      case 'listening': return <Headphones className="h-5 w-5 text-toefl-purple" />;
      default: return null;
    }
  };

  const renderSectionList = (type: 'speaking' | 'writing' | 'reading' | 'listening') => {
    const filteredSummaries = summaries.filter(s => s.sectionType === type);

    if (isLoadingSummaries) {
        return <div className='text-center p-4'><Loader2 className="h-6 w-6 animate-spin mx-auto" /> Loading...</div>;
    }
    if (error) {
         return <div className='text-center p-4 text-red-600 flex items-center justify-center gap-2'><AlertCircle className='h-5 w-5'/> {error}</div>;
    }
    if (filteredSummaries.length === 0) {
        return renderEmptyState(type.charAt(0).toUpperCase() + type.slice(1), getIconForType(type), `/${type}`);
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSummaries.map(summary => (
                <Card
                    key={summary.sectionId}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      console.log(`Navigating to /review/${summary.sectionType}/${summary.sectionId}`);
                      navigate(`/review/${summary.sectionType}/${summary.sectionId}`);
                      }
                    }
                >
                    <div className="absolute top-2 right-2">
                        {summary.feedbackProvided ? (
                            <span className="text-xs font-medium text-green-700 px-2 py-0.5 bg-green-100 rounded-full flex items-center gap-1">
                                <CheckSquare className='h-3 w-3'/> Reviewed
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-yellow-800 px-2 py-0.5 bg-yellow-100 rounded-full flex items-center gap-1">
                                <MessageSquare className='h-3 w-3'/> Pending
                            </span>
                        )}
                    </div>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {getIconForType(summary.sectionType)}
                            {summary.sectionTitle}
                        </CardTitle>
                    </CardHeader>
                    {/* <CardContent>
                        {summary.completedAt && <p className="text-sm text-gray-500">Completed: {new Date(summary.completedAt).toLocaleDateString()}</p>}
                    </CardContent> */}
                </Card>
            ))}
        </div>
    );
  };

  // Empty state renderer (keep your existing one)
  const renderEmptyState = (type: string, icon: React.ReactNode, route: string) => (
       <div className="text-center py-12 border rounded-lg bg-gray-50"> {icon} <h3 className="text-xl font-medium text-gray-600 mb-2">No {type} Tests Completed</h3> <p className="text-gray-500 mb-6">Complete a {type.toLowerCase()} test to view your results here.</p> <Button variant="outline" onClick={() => navigate(route)}> Go to {type} Tests </Button> </div>
   );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8">
        <div className="toefl-container">
           {/* Header */}
           <div className="flex flex-col lg:flex-row items-start justify-between mb-8"> <div> <h1 className="text-3xl font-bold mb-2">Review Your Tests</h1> <p className="text-gray-600"> Check your test results and feedback from previous attempts. </p> </div> </div>
          {/* Tabs */}
           <Tabs defaultValue="speaking" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6" >
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="speaking" className="gap-2"><Mic className="h-4 w-4" /> <span className="hidden sm:inline">Speaking</span></TabsTrigger>
                <TabsTrigger value="writing" className="gap-2"><FileEdit className="h-4 w-4" /> <span className="hidden sm:inline">Writing</span></TabsTrigger>
                <TabsTrigger value="reading" className="gap-2"><BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Reading</span></TabsTrigger>
                <TabsTrigger value="listening" className="gap-2"><Headphones className="h-4 w-4" /> <span className="hidden sm:inline">Listening</span></TabsTrigger>
            </TabsList>
            {/* Content Panes */}
             <TabsContent value="speaking"> <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <Mic className="h-5 w-5 text-toefl-green" /> Speaking Test Results </CardTitle> </CardHeader> <CardContent> {renderSectionList('speaking')} </CardContent> </Card> </TabsContent>
             <TabsContent value="writing"> <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <FileEdit className="h-5 w-5 text-toefl-orange" /> Writing Test Results </CardTitle> </CardHeader> <CardContent> {renderSectionList('writing')} </CardContent> </Card> </TabsContent>
             <TabsContent value="reading"> <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <BookOpen className="h-5 w-5 text-toefl-blue" /> Reading Test Results </CardTitle> </CardHeader> <CardContent> {renderSectionList('reading')} </CardContent> </Card> </TabsContent>
             <TabsContent value="listening"> <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <Headphones className="h-5 w-5 text-toefl-purple" /> Listening Test Results </CardTitle> </CardHeader> <CardContent> {renderSectionList('listening')} </CardContent> </Card> </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReviewPage;