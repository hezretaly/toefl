// src/pages/review/WritingReviewDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileEdit, ArrowLeft, MessageCircle, Star, Loader2, AlertCircle, Book, Headphones } from 'lucide-react'; // Added Book, Headphones
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchUserSectionReviewDetails, UserSectionReviewDetail, getFileUrl } from '@/services/api';
import AudioPlayer from '@/components/test/AudioPlayer'; // For Task 1 audio

// Helper to resolve static file URLs (if needed)
const resolveStaticUrl = (relativeUrl?: string | null): string => {
  if (!relativeUrl) return '';
  return getFileUrl(relativeUrl);
};

const WritingReviewDetailPage = () => {
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
                    // Fetch WRITING details
                    const data = await fetchUserSectionReviewDetails('writing', Number(sectionId), token);
                    setDetails(data);
                } catch (err: any) {
                    console.error("Error fetching writing review details:", err);
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
            <main className="flex-1 py-8 bg-gray-50"> {/* Added background */}
                <div className="toefl-container">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/review')}
                        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 pl-0"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Review List
                    </Button>
                    <h1 className="text-3xl font-bold mb-6">{details.sectionTitle} - Writing Review</h1>

                    <Accordion type="multiple" defaultValue={[`task-${details.tasks[0]?.taskId}`]} className="w-full space-y-4"> {/* Default open first */}
                        {details.tasks.map((task, index) => (
                            <AccordionItem value={`task-${task.taskId}`} key={task.taskId} className="bg-white border rounded-lg shadow-sm"> {/* Card like appearance */}
                                <AccordionTrigger className="text-lg font-medium px-4 py-3 hover:bg-gray-50 rounded-t-lg">
                                    <div className="flex items-center gap-2">
                                        <FileEdit className="h-5 w-5 text-toefl-orange" />
                                        Task {task.taskNumber} Review
                                    </div>
                                    {task.score && task.score.score !== null && (
                                        <span className="ml-auto mr-4 text-sm font-semibold text-blue-600 flex items-center gap-1">
                                            <Star className='h-4 w-4 text-yellow-500 fill-current'/> Score: {task.score.score.toFixed(1)}/5.0 {/* Assuming 0-5 scale */}
                                        </span>
                                    )}
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4 px-4"> {/* Adjusted padding */}
                                    <div className="space-y-4">

                                        {/* Task Context (Passage/Audio for Task 1) */}
                                        {(task.passage || task.taskAudioUrl) && (
                                            <Card className='bg-gray-50'>
                                                <CardHeader className='p-3'>
                                                    <CardTitle className='text-base font-semibold'>Task Materials</CardTitle>
                                                </CardHeader>
                                                <CardContent className='p-3 space-y-3'>
                                                    {task.passage && (
                                                        <div>
                                                            <h5 className='text-sm font-medium mb-1 flex items-center gap-1'><Book className='h-4 w-4'/> Reading Passage</h5>
                                                            <div className="border bg-white rounded p-2 max-h-32 overflow-y-auto text-xs">
                                                                <p style={{ whiteSpace: 'pre-wrap' }}>{task.passage}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {task.taskAudioUrl && (
                                                        <div>
                                                             <h5 className='text-sm font-medium mb-1 flex items-center gap-1'><Headphones className='h-4 w-4'/> Listening Passage</h5>
                                                            <AudioPlayer src={resolveStaticUrl(task.taskAudioUrl)} allowReplay={true} />
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}


                                        <div>
                                            <h4 className="font-semibold mb-1">Prompt:</h4>
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded border text-sm">{task.prompt}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Your Response:</h4>
                                            {task.response?.responseText !== null && task.response?.responseText !== undefined ? (
                                                <div className='border bg-white p-3 rounded space-y-1'>
                                                    <div className="max-h-60 overflow-y-auto text-sm whitespace-pre-wrap">
                                                        {task.response.responseText}
                                                    </div>
                                                    <p className='text-xs text-gray-500 text-right pt-1 border-t'>Word Count: {task.response.wordCount ?? 'N/A'}</p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 italic bg-gray-50 p-3 rounded border">No response submitted.</p>
                                            )}
                                        </div>
                                        {/* Feedback Display */}
                                        {task.score ? (
                                            <div className="bg-blue-50 border border-blue-100 p-4 rounded mt-4">
                                                <h4 className="font-semibold mb-2 text-blue-800 flex items-center gap-2">
                                                    <MessageCircle className='h-5 w-5'/> Feedback from Instructor
                                                    {task.score.scorer && <span className='text-xs font-normal text-gray-500'>(by {task.score.scorer})</span>}
                                                </h4>
                                                {task.score.score !== null && (
                                                    <p className="mb-2"><strong>Score:</strong> {task.score.score.toFixed(1)} / 5.0</p> 
                                                )}
                                                <p className="text-gray-800 whitespace-pre-wrap text-sm">{task.score.feedback || <span className="italic text-gray-500">No detailed feedback provided.</span>}</p>
                                            </div>
                                        ) : (
                                             <div className="text-center text-gray-500 italic p-4 bg-gray-50 rounded border text-sm">Awaiting feedback...</div>
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

export default WritingReviewDetailPage;