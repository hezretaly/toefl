// src/pages/admin/AdminFeedbackFormPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, FileEdit, BookOpen, Headphones, ArrowLeft, Save, Star, MessageCircle, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchFeedbackTargetDetails, submitAdminFeedback, getFileUrl } from '@/services/api'; // Assuming these exist
import AudioPlayer from '@/components/test/AudioPlayer';

// Define Type (adjust based on exact API response)
interface FeedbackTargetDetails {
  responseId: number;
  responseType: 'speaking' | 'writing' | 'reading' | 'listening';
  student: { id: number; name: string };
  task: { id: number; number: number; prompt: string };
  // Specific response data
  audioUrl?: string | null;
  responseText?: string | null;
  wordCount?: number | null;
  userSelection?: any | null; // R/L user answer representation
  options?: { id: number; text: string }[] | null; // R/L options context
  // Existing feedback
  score?: number | null;
  feedback?: string | null;
}

const resolveStaticUrl = (relativeUrl?: string | null): string => {
    if (!relativeUrl) return '';
    return getFileUrl(relativeUrl);
};


const AdminFeedbackFormPage = () => {
  const { responseId } = useParams<{ responseId: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const responseType = queryParams.get('type') as 'speaking' | 'writing' | 'reading' | 'listening' | null;

  const [details, setDetails] = useState<FeedbackTargetDetails | null>(null);
  const [score, setScore] = useState<number>(0); // Use 0-5 for S/W, 0-1 for R/L? Or make dynamic
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading, isAdmin, token } = useAuth();
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated || !isAdmin) {
      toast.error("Access Denied.");
      navigate(isAdmin ? '/admin/review' : '/login'); // Go back to admin list or login
    }
  }, [isAuthenticated, isAuthLoading, isAdmin, navigate]);

  // Fetch response details
  useEffect(() => {
    if (isAuthenticated && isAdmin && token && responseId && responseType) {
      const loadDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchFeedbackTargetDetails(responseType, Number(responseId), token);
          setDetails(data);
          // Pre-fill form with existing data
          setScore(data.score ?? 0); // Default to 0 if no score
          setFeedbackText(data.feedback ?? "");
        } catch (err: any) {
          console.error("Error fetching feedback details:", err);
          setError(err.message || "Failed to load response details.");
          toast.error("Failed to load response details.");
        } finally {
          setIsLoading(false);
        }
      };
      loadDetails();
    } else if (!isAuthLoading && (!responseId || !responseType)) {
        setError("Missing response ID or type information.");
        setIsLoading(false);
    }
  }, [isAuthenticated, isAdmin, token, responseId, responseType, isAuthLoading]); // Add isAuthLoading

  const handleScoreChange = (value: number[]) => {
      // Determine max score based on type
      const maxScore = (details?.responseType === 'speaking' || details?.responseType === 'writing') ? 5 : 1; // Example: 5 for S/W, 1 for R/L
      setScore(Math.min(Math.max(value[0], 0), maxScore)); // Clamp score
  };

  // Determine score step and max based on type
  const scoreMax = (details?.responseType === 'speaking' || details?.responseType === 'writing') ? 5 : 1;
  const scoreStep = (details?.responseType === 'speaking' || details?.responseType === 'writing') ? 0.5 : 1; // Allow .5 for S/W?


  const handleSubmit = async () => {
      if (!details || !token) return;

      setIsSubmitting(true);
      try {
          await submitAdminFeedback(
              details.responseType,
              details.responseId,
              { score: score, feedback: feedbackText },
              token
          );
          toast.success("Feedback submitted successfully!");
          // Navigate back to the section detail page for that student/section (more complex to get)
          // Or just navigate back to the main admin review page for that type
          navigate(`/admin/review`); // Simplest navigation back
          // Or try: navigate(-1); // Go back one step in history

      } catch (err: any) {
          console.error("Error submitting feedback:", err);
          toast.error(err.message || "Failed to submit feedback.");
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Render Logic ---
  if (isAuthLoading || isLoading) {
     return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Loading Feedback Form...</main><Footer /></div> );
  }

  if (error) {
     return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center text-center text-red-600"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> Error: {error}</main><Footer /></div> );
  }

  if (!details) {
     return ( <div className="flex flex-col min-h-screen"><Header /><main className="flex-1 flex items-center justify-center">Response details not found.</main><Footer /></div> );
  }

  // Helper to display user selection for R/L
  const renderUserSelection = () => {
      if (details.responseType !== 'reading' && details.responseType !== 'listening') return null;
      if (details.userSelection === null || details.userSelection === undefined) return <span className='italic text-gray-500'>No answer recorded</span>;

      // Find option text if it's multiple choice
       if (typeof details.userSelection === 'number' && details.options) {
           const selectedOption = details.options.find(opt => opt.id === details.userSelection);
           return selectedOption ? `Selected: "${selectedOption.text}" (ID: ${details.userSelection})` : `Selected Option ID: ${details.userSelection}`;
       }
       // Handle table selection
       if (typeof details.userSelection === 'object' && details.userSelection.rowId !== undefined) {
            return `Selected Table Cell: (Row ID: ${details.userSelection.rowId}, Col ID: ${details.userSelection.colId})`;
       }
       // Handle multiple select (assuming userSelection is an array of IDs)
       if (Array.isArray(details.userSelection) && details.options) {
           const selectedTexts = details.userSelection
               .map(id => details.options?.find(opt => opt.id === id)?.text)
               .filter(text => !!text)
               .join('", "');
            return `Selected: ["${selectedTexts}"] (IDs: ${details.userSelection.join(', ')})`;
       }

      return `User Selection: ${JSON.stringify(details.userSelection)}`; // Fallback
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-4xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            // onClick={() => navigate(-1)} // Simple back navigation
            onClick={() => navigate(`/admin/review`)} // Go to main admin review page
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 pl-0"
            >
             <ArrowLeft className="h-4 w-4" /> Back to Review List
          </Button>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">
                  Provide Feedback for {details.responseType.charAt(0).toUpperCase() + details.responseType.slice(1)} Response
              </CardTitle>
              <p className="text-sm text-gray-500">
                  Student: {details.student.name} (ID: {details.student.id}) |
                  Task/Question: {details.task.number} (ID: {details.task.id})
              </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* --- Display Task Prompt --- */}
               <div>
                 <h3 className="font-semibold mb-1 text-gray-800">Task Prompt:</h3>
                 <p className="p-3 bg-gray-50 border rounded text-gray-700">{details.task.prompt}</p>
               </div>

              {/* --- Display Student Response --- */}
              <div>
                <h3 className="font-semibold mb-1 text-gray-800">Student's Response:</h3>
                {details.responseType === 'speaking' && details.audioUrl && (
                    <AudioPlayer src={resolveStaticUrl(details.audioUrl)} allowReplay={true} />
                )}
                {details.responseType === 'writing' && details.responseText !== null && (
                    <div className='space-y-2'>
                         <div className="p-3 border bg-white rounded max-h-60 overflow-y-auto text-sm whitespace-pre-wrap">
                            {details.responseText}
                         </div>
                         <p className='text-xs text-gray-500 text-right'>Word Count: {details.wordCount ?? 'N/A'}</p>
                    </div>
                )}
                 {(details.responseType === 'reading' || details.responseType === 'listening') && (
                    <div className="p-3 border bg-blue-50 rounded text-sm">
                        {renderUserSelection()}
                        {/* Optionally display options list here for context */}
                        {details.options && details.options.length > 0 && (
                            <details className='mt-2 text-xs'>
                                <summary className='cursor-pointer text-gray-600'>Show Question Options</summary>
                                <ul className='list-disc pl-5 mt-1'>
                                    {details.options.map(opt => <li key={opt.id}>ID {opt.id}: {opt.text}</li>)}
                                </ul>
                            </details>
                        )}
                    </div>
                 )}
              </div>

              {/* --- Feedback Section --- */}
              <div className="pt-6 border-t space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">Your Evaluation</h3>

                 {/* Score Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium text-gray-700">
                        Score ({scoreStep === 1 ? '0 or 1' : `0.0 - ${scoreMax.toFixed(1)}`})
                    </label>
                    <span className="font-bold text-lg text-blue-600">{score.toFixed(scoreStep === 1 ? 0 : 1)}</span>
                  </div>
                   <Slider
                      value={[score]}
                      min={0}
                      max={scoreMax}
                      step={scoreStep}
                      onValueChange={handleScoreChange}
                      aria-label="Score slider"
                    />
                     {/* Optional: Add labels for slider */}
                     {scoreMax > 1 && (
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                     )}
                     {scoreMax === 1 && (
                         <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Incorrect (0)</span>
                          <span>Correct (1)</span>
                        </div>
                     )}
                </div>

                {/* Feedback Text Input */}
                <div>
                    <label htmlFor="feedbackText" className="block font-medium text-gray-700 mb-1">
                        Feedback Comments
                    </label>
                    <Textarea
                        id="feedbackText"
                        placeholder="Provide constructive feedback..."
                        className="min-h-[150px]"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                    />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading} // Disable while loading details too
                  className="gap-2 min-w-[120px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Submit Feedback
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminFeedbackFormPage;