// src/pages/admin/SpeakingFeedbackPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, ArrowLeft, Save, Star, MessageCircle, Loader2, AlertCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchFeedbackTargetDetails, submitAdminFeedback, FeedbackTargetDetails, getFileUrl } from '@/services/api';
import AudioPlayer from '@/components/test/AudioPlayer'; // Make sure this works

// Helper to resolve static file URLs
const resolveStaticUrl = (relativeUrl?: string | null): string => {
    if (!relativeUrl) return '';
    return getFileUrl(relativeUrl);
};


const SpeakingFeedbackPage = () => {
  const { responseId } = useParams<{ responseId: string }>();
  const [details, setDetails] = useState<FeedbackTargetDetails | null>(null);
  // Initialize state with default values, they will be updated by useEffect
  const [score, setScore] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const navigate = useNavigate();

  const SCORE_MAX = 5.0;
  const SCORE_STEP = 0.5;

   // Auth check
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      toast.error("Access Denied.");
      navigate('/login');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // Fetch response details
  useEffect(() => {
    if (isAuthenticated && token && responseId) {
      const loadDetails = async () => {
        setIsLoading(true);
        setError(null);
        setDetails(null); // Clear previous details
        setScore(0);      // Reset score
        setFeedbackText("");// Reset feedback
        try {
          const data = await fetchFeedbackTargetDetails('speaking', Number(responseId), token);
          if(data.responseType !== 'speaking'){
              throw new Error("Incorrect response type received.");
          }
          setDetails(data);
          // --- FIX: Pre-fill form with fetched data ---
          setScore(data.score ?? 0); // Use fetched score or default to 0
          setFeedbackText(data.feedback ?? ""); // Use fetched feedback or default to ""
          // --- END FIX ---
        } catch (err: any) {
          console.error("Error fetching speaking feedback details:", err);
          setError(err.message || "Failed to load response details.");
          toast.error("Failed to load response details.");
        } finally {
          setIsLoading(false);
        }
      };
      loadDetails();
    } else if (!isAuthLoading && !responseId) {
        setError("Missing response ID information.");
        setIsLoading(false);
    }
  }, [isAuthenticated, token, responseId, isAuthLoading]);

  const handleScoreChange = (value: number[]) => {
      const clampedScore = Math.min(Math.max(value[0], 0), SCORE_MAX);
      setScore(clampedScore);
  };

  const handleSubmit = async () => {
      if (!details || !token) return;
      setIsSubmitting(true);
      try {
          await submitAdminFeedback(
              'speaking',
              details.responseId,
              { score: score, feedback: feedbackText },
              token
          );
          toast.success("Feedback submitted successfully!");
          navigate(`/admin/review`);
      } catch (err: any) { /* ... error handling ... */
          console.error("Error submitting speaking feedback:", err);
          toast.error(err.message || "Failed to submit feedback.");
      } finally { setIsSubmitting(false); }
  };

  if (isAuthLoading || isLoading) { /* ... loading spinner ... */ }
  if (error) { /* ... error message ... */ }
  if (!details) { /* ... no details message ... */ }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 bg-gray-50">
        <div className="toefl-container max-w-4xl">
          <Button variant="ghost" onClick={() => navigate(`/admin/review`)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 pl-0" > <ArrowLeft className="h-4 w-4" /> Back to Review List </Button>
          <Card className="shadow-lg">
            <CardHeader className='border-b'>
              {/* ... Card Title and Student Info ... */}
              <CardTitle className="text-2xl flex items-center gap-2"> <Mic className='h-6 w-6 text-toefl-green'/> Provide Speaking Feedback </CardTitle>
               <p className="text-sm text-gray-500 pt-1"> Student: {details?.student?.name} | Task: {details?.task?.number} </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               {/* Task Prompt */}
               <div>
                 <h3 className="font-semibold mb-1 text-gray-800">Task Prompt:</h3>
                 <p className="p-3 bg-gray-100 border rounded text-gray-700 text-sm">{details?.task?.prompt ?? 'Prompt not available.'}</p>
               </div>

               {/* --- FIX: Display Student Response Audio --- */}
               <div>
                 <h3 className="font-semibold mb-2 text-gray-800 flex items-center gap-2"><PlayCircle className='h-5 w-5'/> Student's Response:</h3>
                 {details?.audioUrl ? (
                     // Use the actual audioUrl from details, resolved
                     <AudioPlayer src={resolveStaticUrl(details.audioUrl)} allowReplay={true} />
                 ) : (
                     <p className="italic text-gray-500 p-4 text-center bg-gray-100 border rounded">Audio response not available or not recorded.</p>
                 )}
               </div>
               {/* --- END FIX --- */}

               {/* Feedback Section (Score/Text - No changes needed here) */}
               <div className="pt-6 border-t space-y-6">
                 <h3 className="text-xl font-semibold text-gray-800">Your Evaluation</h3>
                 <div>
                   <div className="flex justify-between items-center mb-2"> <label className="font-medium text-gray-700 flex items-center gap-1"> <Star className='h-4 w-4 text-yellow-500'/> Score (0.0 - {SCORE_MAX.toFixed(1)}) </label> <span className="font-bold text-lg text-blue-600">{score.toFixed(1)}</span> </div>
                    <Slider value={[score]} min={0} max={SCORE_MAX} step={SCORE_STEP} onValueChange={handleScoreChange} aria-label="Score slider" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1"> <span>Low</span> <span>High</span> </div>
                 </div>
                 <div>
                     <label htmlFor="feedbackText" className="block font-medium text-gray-700 mb-1 flex items-center gap-1"> <MessageCircle className='h-4 w-4'/> Feedback Comments </label>
                     <Textarea id="feedbackText" placeholder="Provide constructive feedback..." className="min-h-[150px]" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                 </div>
               </div>

               {/* Submit Button (No changes needed) */}
               <div className="flex justify-end mt-6"> <Button onClick={handleSubmit} disabled={isSubmitting || isLoading} className="gap-2 min-w-[120px]" > {isSubmitting ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Save className="h-4 w-4" /> )} Submit Feedback </Button> </div>
             </CardContent>
           </Card>
         </div>
       </main>
       <Footer />
     </div>
   );
};

export default SpeakingFeedbackPage;