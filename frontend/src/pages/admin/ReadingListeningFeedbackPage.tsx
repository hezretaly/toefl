// src/pages/admin/ReadingListeningFeedbackPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Headphones, ArrowLeft, Save, Star, MessageCircle, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider'; // Or simple buttons for 0/1
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchFeedbackTargetDetails, submitAdminFeedback } from '@/services/api';

export interface FeedbackTargetDetails {
    responseId: number;
    responseType: 'speaking' | 'writing' | 'reading' | 'listening';
    student: { id: number; name: string };
    task: {
        id: number; // Task/Question ID
        number: number; // Task/Question number/order
        prompt: string;
        passage?: string | null; // Optional context
        taskAudioUrl?: string | null; // Optional context
      };
    // Specific response data
    audioUrl?: string | null;
    responseText?: string | null;
    wordCount?: number | null;
    userSelection?: any | null; // R/L user answer representation
    options?: { id: number; text: string }[] | null; // R/L options context
    rows?: { id: number; label: string }[] | null;    // R/L table rows context
    columns?: { id: number; label: string }[] | null; // R/L table columns context
    correctAnswer?: any | null; // Optional: For R/L Correct Answer context
    // Existing feedback/score
    score?: number | null; // Use number | null
    feedback?: string | null; // Use string | null
  }

// Helper to render different answer types nicely
const renderUserSelectionAdmin = (selection: any, options?: { id: number; text: string }[] | null, rows?: any, cols?: any): string | React.ReactNode => {
    if (selection === null || selection === undefined) return <span className='italic text-gray-500'>Not Answered</span>;

    if (typeof selection === 'number' && options) { // MC Single
        const selectedOption = options.find(opt => opt.id === selection);
        return selectedOption ? `Selected: "${selectedOption.text}"` : `Selected Option ID: ${selection}`;
    }
    if (typeof selection === 'object' && selection.rowId !== undefined && rows && cols) { // Table
         const rowLabel = rows.find((r: any) => r.id === selection.rowId)?.label ?? `RowID ${selection.rowId}`;
         const colLabel = cols.find((c: any) => c.id === selection.colId)?.label ?? `ColID ${selection.colId}`;
         return `Selected Cell: "${rowLabel}" / "${colLabel}"`;
    }
    if (Array.isArray(selection) && options) { // MC Multiple (assuming selection is array of IDs)
        const selectedTexts = selection
            .map(id => options?.find(opt => opt.id === id)?.text)
            .filter(text => !!text)
            .map(text => `"${text}"`) // Add quotes
            .join(', ');
         return `Selected: [${selectedTexts}]`;
    }
    return `Selection: ${JSON.stringify(selection)}`; // Fallback
};

const ReadingListeningFeedbackPage = () => {
  const { responseId } = useParams<{ responseId: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // Ensure type is correctly inferred or asserted
  const responseType = queryParams.get('type') as 'reading' | 'listening' | null;

  const [details, setDetails] = useState<FeedbackTargetDetails | null>(null);
  const [score, setScore] = useState<number>(0); // Simple 0 or 1 score
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const navigate = useNavigate();

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
    // Validate responseType early
    if (!isAuthLoading && (!responseType || !['reading', 'listening'].includes(responseType))) {
        setError("Invalid or missing response type ('reading' or 'listening').");
        setIsLoading(false);
        return;
    }

    if (isAuthenticated && token && responseId && responseType) {
      const loadDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchFeedbackTargetDetails(responseType, Number(responseId), token);
           if(data.responseType !== responseType){ // Double check type
              throw new Error("Incorrect response type received from API.");
          }
          setDetails(data);
          // Pre-fill form - score is 0 or 1
          setScore(data.score === 1 ? 1 : 0); // Default incorrect if null
          setFeedbackText(data.feedback ?? "");
        } catch (err: any) {
          console.error(`Error fetching ${responseType} feedback details:`, err);
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
  }, [isAuthenticated, token, responseId, responseType, isAuthLoading]); // Add dependencies


  const handleSubmit = async () => {
      if (!details || !token || !responseType) return;

      setIsSubmitting(true);
      try {
          await submitAdminFeedback(
              responseType, // Pass the correct type
              details.responseId,
              { score: score, feedback: feedbackText }, // Send 0 or 1 score
              token
          );
          toast.success("Feedback submitted successfully!");
          navigate(`/admin/review`); // Go back to main admin review page

      } catch (err: any) {
          console.error(`Error submitting ${responseType} feedback:`, err);
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

  // Determine icon based on type
  const SectionIcon = responseType === 'reading' ? BookOpen : Headphones;
  const iconColor = responseType === 'reading' ? 'text-toefl-blue' : 'text-toefl-purple';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 bg-gray-50">
        <div className="toefl-container max-w-4xl">
           {/* Back Button */}
           <Button variant="ghost" onClick={() => navigate(`/admin/review`)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 pl-0" > <ArrowLeft className="h-4 w-4" /> Back to Review List </Button>

          <Card className="shadow-lg">
            <CardHeader className='border-b'>
              <CardTitle className="text-2xl flex items-center gap-2">
                 <SectionIcon className={`h-6 w-6 ${iconColor}`}/> Provide {details.responseType.charAt(0).toUpperCase() + details.responseType.slice(1)} Feedback
              </CardTitle>
               <p className="text-sm text-gray-500 pt-1">
                  Student: {details.student.name} | Question ID: {details.task.id}
              </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
               {/* Question Prompt */}
               <div>
                 <h3 className="font-semibold mb-1 text-gray-800">Question Prompt:</h3>
                 <p className="p-3 bg-gray-100 border rounded text-gray-700 text-sm">{details.task.prompt}</p>
               </div>

               {/* Display Options/Table Context */}
               {(details.options || details.rows) && (
                    <div className="text-xs bg-gray-100 p-3 border rounded space-y-1">
                        <h4 className="font-medium mb-1">Question Context:</h4>
                        {details.options && <ul>{details.options.map(o => <li key={o.id}>ID {o.id}: {o.text}</li>)}</ul>}
                        {details.rows && details.columns && <div>Rows: {details.rows.map(r => `ID ${r.id}: ${r.label}`).join('; ')} | Cols: {details.columns.map(c => `ID ${c.id}: ${c.label}`).join('; ')}</div>}
                    </div>
               )}

               {/* User Answer and Correct Answer */}
               <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                   <div>
                       <h3 className="font-semibold mb-1 text-gray-800">Student's Answer:</h3>
                       <div className={`p-3 border rounded text-sm min-h-[40px] ${score === 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            {renderUserSelectionAdmin(details.userSelection, details.options, details.rows, details.columns)}
                       </div>
                   </div>
                    <div>
                       <h3 className="font-semibold mb-1 text-gray-800">Correct Answer:</h3>
                       <div className="p-3 border rounded text-sm min-h-[40px] bg-green-50 border-green-200">
                            {renderUserSelectionAdmin(details.correctAnswer, details.options, details.rows, details.columns)}
                       </div>
                   </div>
               </div>

               {/* Feedback Section */}
               <div className="pt-6 border-t space-y-6">
                 <h3 className="text-xl font-semibold text-gray-800">Your Evaluation</h3>
                 {/* Score Input (Correct/Incorrect Buttons) */}
                 <div>
                   <label className="font-medium text-gray-700 mb-2 block">Mark as Correct/Incorrect:</label>
                   <div className='flex gap-4'>
                       <Button
                           variant={score === 1 ? "default" : "outline"}
                           onClick={() => setScore(1)}
                           className={`flex-1 gap-2 ${score === 1 ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                       >
                           <Check className='h-5 w-5'/> Correct
                       </Button>
                        <Button
                           variant={score === 0 ? "destructive" : "outline"}
                           onClick={() => setScore(0)}
                           className={`flex-1 gap-2 ${score === 0 ? '' : ''}`}
                       >
                           <X className='h-5 w-5'/> Incorrect
                       </Button>
                   </div>
                 </div>

                 {/* Feedback Text Input */}
                 <div>
                     <label htmlFor="feedbackText" className="block font-medium text-gray-700 mb-1 flex items-center gap-1"> <MessageCircle className='h-4 w-4'/> Feedback Comments (Optional) </label>
                     <Textarea id="feedbackText" placeholder="Provide explanation or clarification..." className="min-h-[100px]" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                 </div>
               </div>

               {/* Submit Button */}
               <div className="flex justify-end mt-6">
                 <Button onClick={handleSubmit} disabled={isSubmitting || isLoading} className="gap-2 min-w-[120px]" > {isSubmitting ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Save className="h-4 w-4" /> )} Submit Feedback </Button>
               </div>
             </CardContent>
           </Card>
         </div>
       </main>
       <Footer />
     </div>
   );
};

export default ReadingListeningFeedbackPage;