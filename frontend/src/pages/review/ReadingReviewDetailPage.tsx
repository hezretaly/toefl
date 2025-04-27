// src/pages/review/ReadingReviewDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, MessageCircle, Star, Loader2, AlertCircle, Check, X, HelpCircle } from 'lucide-react'; // Added Check, X
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchUserSectionReviewDetails } from '@/services/api';
import { UserSectionReviewDetail, UserTaskReview } from '@/types';

// Helper Functions (can be moved to a utils file)
const renderAnswerRepresentation = (selection: any, options?: { id: number; text: string }[] | null, rows?: any, cols?: any): string | React.ReactNode => {
    if (selection === null || selection === undefined) return <span className='italic text-gray-500'>Not Answered</span>;

    if (typeof selection === 'number' && options) {
        const selectedOption = options.find(opt => opt.id === selection);
        return selectedOption ? `"${selectedOption.text}"` : `Option ID: ${selection}`;
    }
    if (typeof selection === 'object' && selection.rowId !== undefined && rows && cols) {
         const rowLabel = rows.find((r: any) => r.id === selection.rowId)?.label ?? `RowID ${selection.rowId}`;
         const colLabel = cols.find((c: any) => c.id === selection.colId)?.label ?? `ColID ${selection.colId}`;
         return `"${rowLabel}" / "${colLabel}"`;
    }
    if (Array.isArray(selection) && options) {
        const selectedTexts = selection
            .map(id => options?.find(opt => opt.id === id)?.text)
            .filter(text => !!text)
            .join('", "');
         return `["${selectedTexts}"]`;
    }
    return JSON.stringify(selection); // Fallback
};

const ReadingReviewDetailPage = () => {
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
                    // Fetch READING details
                    const data = await fetchUserSectionReviewDetails('reading', Number(sectionId), token);
                    setDetails(data);
                } catch (err: any) {
                    console.error("Error fetching reading review details:", err);
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
            <main className="flex-1 py-8 bg-gray-50">
                <div className="toefl-container">
                    <Button variant="ghost" onClick={() => navigate('/review')} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 pl-0" > <ArrowLeft className="h-4 w-4" /> Back to Review List </Button>
                    <h1 className="text-3xl font-bold mb-6">{details.sectionTitle} - Reading Review</h1>

                     {/* Display Reading Passage Once at the top */}
                     {details.tasks.length > 0 && details.tasks[0].passage && (
                         <Card className="mb-6 shadow">
                            <CardHeader className='p-4 border-b'>
                                <CardTitle className='text-xl font-semibold flex items-center gap-2'><BookOpen className='h-5 w-5 text-toefl-blue'/> Reading Passage</CardTitle>
                            </CardHeader>
                             <CardContent className='p-4 max-h-[50vh] overflow-y-auto'>
                                 <p className='whitespace-pre-wrap text-sm leading-relaxed'>{details.tasks[0].passage}</p>
                             </CardContent>
                         </Card>
                     )}

                    <Accordion type="multiple" className="w-full space-y-2">
                        {details.tasks.map((task, index) => ( // Task here represents a Question
                            <AccordionItem value={`q-${task.taskId}`} key={task.taskId} className="bg-white border rounded-lg shadow-sm">
                                <AccordionTrigger className={`text-base font-medium px-4 py-3 hover:bg-gray-50 rounded-t-lg flex justify-between items-center ${task.response?.isCorrect === false ? 'bg-red-50 hover:bg-red-100' : task.response?.isCorrect === true ? 'bg-green-50 hover:bg-green-100' : ''}`}>
                                    <span className='mr-auto'>Question {index + 1}</span> {/* Use index for sequence */}
                                     {task.response?.isCorrect === true && <Check className="h-5 w-5 text-green-600 mr-2" />}
                                     {task.response?.isCorrect === false && <X className="h-5 w-5 text-red-600 mr-2" />}
                                     {task.response === null && <HelpCircle className="h-5 w-5 text-gray-400 mr-2" />} {/* No answer */}

                                    {task.score && task.score.score !== null && (
                                        <span className="ml-auto text-sm font-semibold text-blue-600 flex items-center gap-1">
                                            <Star className='h-4 w-4 text-yellow-500 fill-current'/> Score: {task.score.score.toFixed(1)}/1.0 {/* Assuming 0-1 scale */}
                                        </span>
                                    )}
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4 px-4">
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-semibold mb-1 text-sm">Prompt:</h4>
                                            <p className="text-gray-700 bg-gray-50 p-2 rounded border text-sm">{task.prompt}</p>
                                        </div>

                                        {/* Display Options/Table Context */}
                                        {(task.options || task.rows) && (
                                             <div className="text-xs bg-gray-100 p-2 border rounded">
                                                 <h5 className="font-medium mb-1">Context:</h5>
                                                 {task.options && <ul>{task.options.map(o => <li key={o.id}>ID {o.id}: {o.text}</li>)}</ul>}
                                                 {task.rows && task.columns && <div>Rows: {task.rows.map(r => `ID ${r.id}: ${r.label}`).join('; ')} | Cols: {task.columns.map(c => `ID ${c.id}: ${c.label}`).join('; ')}</div>}
                                             </div>
                                        )}


                                        <div className='grid grid-cols-2 gap-4 text-sm'>
                                            <div>
                                                <h4 className="font-semibold mb-1">Your Answer:</h4>
                                                <div className={`p-2 rounded border min-h-[30px] ${task.response?.isCorrect === false ? 'bg-red-100 border-red-200' : task.response?.isCorrect === true ? 'bg-green-100 border-green-200' : 'bg-gray-100 border-gray-200'}`}>
                                                    {renderAnswerRepresentation(task.response?.userSelection, task.options, task.rows, task.columns)}
                                                </div>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1">Correct Answer:</h4>
                                                <div className="p-2 rounded border bg-green-50 border-green-200 min-h-[30px]">
                                                     {renderAnswerRepresentation(task.correctAnswer, task.options, task.rows, task.columns)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Feedback Display */}
                                        {task.score ? (
                                            <div className="bg-blue-50 border border-blue-100 p-3 rounded mt-3 text-sm">
                                                <h4 className="font-semibold mb-1 text-blue-800 flex items-center gap-1"> <MessageCircle className='h-4 w-4'/> Feedback </h4>
                                                {task.score.score !== null && ( <p className="mb-1"><strong>Score:</strong> {task.score.score.toFixed(1)} / 1.0</p> )}
                                                <p className="text-gray-800 whitespace-pre-wrap text-xs">{task.score.feedback || <span className="italic text-gray-500">No detailed feedback.</span>}</p>
                                            </div>
                                        ) : (
                                            task.response && <div className="text-center text-gray-400 italic p-2 text-xs mt-2">Awaiting feedback...</div>
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

export default ReadingReviewDetailPage;