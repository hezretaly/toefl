// src/pages/review/SpeakingReviewDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Mic, ArrowLeft, MessageCircle, Star, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchUserSectionReviewDetails } from '@/services/api'; // Assuming this exists
import AudioPlayer from '@/components/test/AudioPlayer'; // Assuming this exists

const FILES_BASE_URL = 'http://127.0.0.1:5000/files'; // Adjust as needed
const resolveStaticUrl = (relativeUrl?: string | null): string => {
  if (!relativeUrl) return '';
  return `${FILES_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
};

// Define type for detailed review data
interface UserSectionReviewDetail {
    sectionId: number;
    sectionTitle: string;
    sectionType: 'speaking'; // Could make generic later
    tasks: UserTaskReview[];
}
interface UserTaskReview {
    taskId: number;
    taskNumber: number;
    prompt: string;
    passage?: string | null;
    taskAudioUrl?: string | null; // Task audio
    response: {
        responseId: number;
        audioUrl: string; // User's audio
    } | null;
    score: {
        score?: number | null;
        feedback?: string | null;
        scorer?: string | null; // Name/username of scorer
    } | null;
}


const SpeakingReviewDetailPage = () => {
    const { sectionId } = useParams<{ sectionId: string }>();
    const [details, setDetails] = useState<UserSectionReviewDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
    const navigate = useNavigate();

    // Auth check
    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) navigate('/login');
    }, [isAuthenticated, isAuthLoading, navigate]);

    // Fetch details
    useEffect(() => {
        if (isAuthenticated && token && sectionId) {
            const loadDetails = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await fetchUserSectionReviewDetails('speaking', Number(sectionId), token);
                    setDetails(data);
                } catch (err: any) {
                    console.error("Error fetching speaking review details:", err);
                    setError(err.message || "Failed to load review details.");
                } finally {
                    setIsLoading(false);
                }
            };
            loadDetails();
        }
    }, [isAuthenticated, token, sectionId]);

    if (isAuthLoading || isLoading) {
       return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Loading Review...</main><Footer /></div> );
    }

     if (error) {
         return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center text-center text-red-600"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> Error loading details: {error}</main><Footer /></div> );
     }

    if (!details) {
         return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center">No review details found.</main><Footer /></div> );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 py-8">
                <div className="toefl-container">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/review')}
                        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 pl-0"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Review List
                    </Button>
                    <h1 className="text-3xl font-bold mb-6">{details.sectionTitle} - Your Review</h1>

                    <Accordion type="multiple" className="w-full space-y-4">
                        {details.tasks.map((task, index) => (
                            <AccordionItem value={`task-${task.taskId}`} key={task.taskId}>
                                <AccordionTrigger className="text-lg font-medium bg-gray-50 px-4 rounded hover:bg-gray-100">
                                    Task {task.taskNumber} Review
                                    {task.score && task.score.score !== null && (
                                        <span className="ml-auto mr-4 text-sm font-semibold text-blue-600 flex items-center gap-1">
                                            <Star className='h-4 w-4 text-yellow-500 fill-current'/> Score: {task.score.score.toFixed(1)}/5.0
                                        </span>
                                    )}
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 px-4 border rounded-b bg-white">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold mb-1">Prompt:</h4>
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded border">{task.prompt}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Your Response:</h4>
                                            {task.response?.audioUrl ? (
                                                <AudioPlayer src={resolveStaticUrl(task.response.audioUrl)} allowReplay={true} />
                                            ) : (
                                                <p className="text-gray-500 italic">No response recorded.</p>
                                            )}
                                        </div>
                                        {task.score ? (
                                            <div className="bg-blue-50 border border-blue-100 p-4 rounded mt-4">
                                                <h4 className="font-semibold mb-2 text-blue-800 flex items-center gap-2">
                                                    <MessageCircle className='h-5 w-5'/> Feedback from Instructor
                                                    {task.score.scorer && <span className='text-xs font-normal text-gray-500'>(by {task.score.scorer})</span>}
                                                </h4>
                                                {task.score.score !== null && (
                                                    <p className="mb-2"><strong>Score:</strong> {task.score.score.toFixed(1)} / 5.0</p>
                                                )}
                                                <p className="text-gray-800 whitespace-pre-wrap">{task.score.feedback || <span className="italic text-gray-500">No detailed feedback provided.</span>}</p>
                                            </div>
                                        ) : (
                                             <div className="text-center text-gray-500 italic p-4 bg-gray-50 rounded border">Awaiting feedback...</div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SpeakingReviewDetailPage;