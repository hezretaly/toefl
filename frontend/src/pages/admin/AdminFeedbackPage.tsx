// src/pages/admin/AdminFeedbackPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, Mic, User, CheckSquare, MessageSquare, Eye, BookOpen, Headphones, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { fetchAdminSectionSummaries, fetchAdminSectionDetails } from '@/services/api'; // Import API functions
import AudioPlayer from '@/components/test/AudioPlayer'; // Assuming you have this

// Helper to resolve static file URLs (if needed)
const FILES_BASE_URL = 'http://127.0.0.1:5000'; // Adjust as needed
const resolveStaticUrl = (relativeUrl?: string | null): string => {
  if (!relativeUrl) return '';
  // Ensure no double slashes and correct base URL
  return `${FILES_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
};

// Summary of a section shown on the admin review page
export interface SectionSummaryAdmin {
    sectionId: number;
    sectionTitle: string;
    sectionType: 'speaking' | 'writing' | 'reading' | 'listening';
    studentCount: number; // Number of unique students who submitted
    // Optional: Add counts like 'needsReviewCount' if provided by backend
  }
  
  // Represents a single task response shown in the admin detail list
  export interface TaskResponseInfoAdmin {
    responseId: number; // SpeakingResponse.id, WritingResponse.id, or UserAnswer.id
    taskId: number; // SpeakingTask.id, WritingTask.id, or Question.id
    taskNumber: number; // The sequential number within the section
    taskPrompt: string; // Context for the admin
    responseType: 'speaking' | 'writing' | 'reading' | 'listening';
    // Specific response data
    audioUrl?: string | null; // Speaking
    responseText?: string | null; // Writing
    wordCount?: number | null; // Writing
    userSelection?: any | null; // R/L user answer representation
    // Context for R/L might be needed here too if feedback form loads directly
    options?: { id: number; text: string }[] | null;
    rows?: { id: number; label: string }[] | null;
    columns?: { id: number; label: string }[] | null;
    // Score/Feedback Status
    hasFeedback: boolean; // Calculated based on whether score record/fields exist
    score?: number | null; // Optional: display existing score in list
    feedback?: string | null; // Optional: display existing feedback snippet in list?
  }
  
  // Groups responses by student for a specific section in the admin detail view
  export interface StudentSectionResponsesAdmin {
    student: {
      id: number;
      name: string; // Or email, depending on what backend sends
    };
    responses: TaskResponseInfoAdmin[]; // List of responses from this student for the section
  }
  
  // Detailed view of a section's responses for the admin
  export interface SectionDetailAdminView {
      sectionId: number;
      sectionTitle: string;
      sectionType: 'speaking' | 'writing' | 'reading' | 'listening';
      submissions: StudentSectionResponsesAdmin[]; // Responses grouped by student
  }
  
  // Data needed specifically for the Admin Feedback Form page
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
  
  // --- API Service Function Payloads/Responses (Examples) ---
  
  // Payload for submitting admin feedback
  export interface AdminFeedbackPayload {
      score: number | null; // Allow null if only feedback is given? Backend decides.
      feedback: string;
  }
  
  // Generic success message response
  export interface SuccessMessageResponse {
      message: string;
  }



const AdminFeedbackPage = () => {
  const [activeTab, setActiveTab] = useState<'speaking' | 'writing' | 'reading' | 'listening'>('speaking');
  const [sections, setSections] = useState<SectionSummaryAdmin[]>([]); // Use Admin specific type
  const [selectedSectionDetails, setSelectedSectionDetails] = useState<SectionDetailAdminView | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const navigate = useNavigate();

  // --- Authentication & Authorization Check ---
  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth check

    if (!isAuthenticated) {
      toast.error("Please log in to access this page.");
      navigate('/login');
      return;
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // --- Fetch Section Summaries ---
  const loadSectionSummaries = useCallback(async (type: 'speaking' | 'writing' | 'reading' | 'listening') => {
    if (!token) return;

    setIsLoadingList(true);
    setListError(null);
    setSelectedSectionDetails(null);
    setSections([]);

    try {
      // Use the correct API function name if different
      const data = await fetchAdminSectionSummaries(type, token);
      setSections(data);
    } catch (error: any) {
      console.error(`Error fetching ${type} section summaries:`, error);
      const message = `Failed to load ${type} sections. ${error.message || 'Please try again.'}`;
      setListError(message);
      toast.error(message); // Show toast on error
    } finally {
      setIsLoadingList(false);
    }
  }, [token]); // Dependencies for the fetch function

  // Fetch summaries when tab changes or on initial admin load
  useEffect(() => {
    if (!isAuthLoading) { // Only fetch if auth check done and user is admin
        loadSectionSummaries(activeTab);
    }
  }, [activeTab, loadSectionSummaries, isAuthLoading]);

  // --- Fetch Section Details ---
  const handleSelectSection = async (sectionId: number, sectionType: 'speaking' | 'writing' | 'reading' | 'listening') => {
    if (!token) return;
    setIsLoadingDetails(true);
    setDetailError(null);
    setSelectedSectionDetails(null); // Clear previous details

    try {
       // Pass sectionType to the API call if needed, or it might infer from ID
       // Assuming fetchAdminSectionDetails can handle all types based on ID
      const data = await fetchAdminSectionDetails(sectionType, sectionId, token);
      setSelectedSectionDetails(data);
    } catch (error: any) {
      console.error(`Error fetching details for section ${sectionId}:`, error);
       const message = `Failed to load details. ${error.message || 'Please try again.'}`;
      setDetailError(message);
      toast.error(message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // --- Navigation Handler ---
  const handleProvideFeedback = (responseId: number, responseType: 'speaking' | 'writing' | 'reading' | 'listening') => {
        let navigateToPath = '';

        // Construct the path based on the response type to match your specific routes
        if (responseType === 'speaking') {
            navigateToPath = `/admin/feedback/response/speaking/${responseId}`;
        } else if (responseType === 'writing') {
            navigateToPath = `/admin/feedback/response/writing/${responseId}`;
        } else if (responseType === 'reading' || responseType === 'listening') {
            // Use the type directly in the path for the combined route
            navigateToPath = `/admin/feedback/response/${responseType}/${responseId}`;
        } else {
            console.error("Unknown response type:", responseType);
            toast.error("Cannot navigate to feedback form for unknown type.");
            return; // Don't navigate if type is invalid
        }

        console.log("Navigating to:", navigateToPath); // For debugging
        navigate(navigateToPath);
    };

  // Function to get the right icon based on type
  const getIcon = (type: string): React.ReactNode => {
       switch(type) {
           case 'speaking': return <Mic className="h-4 w-4" />;
           case 'writing': return <FileEdit className="h-4 w-4" />;
           case 'reading': return <BookOpen className="h-4 w-4" />;
           case 'listening': return <Headphones className="h-4 w-4" />;
           default: return null;
       }
  };

  // --- Render Loading/Auth States ---
  if (isAuthLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
           <Loader2 className="h-8 w-8 animate-spin mr-2" /> Checking access...
        </main>
        <Footer />
      </div>
    );
  }
  // Redirect logic is handled by the useEffect above

  // --- Main Content ---
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 bg-gray-50"> {/* Added bg color */}
        <div className="toefl-container">
           <h1 className="text-3xl font-bold mb-6">Admin Feedback Center</h1>

           <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
             <TabsList className="grid w-full grid-cols-4">
               <TabsTrigger value="speaking" className="gap-2">{getIcon('speaking')}Speaking</TabsTrigger>
               <TabsTrigger value="writing" className="gap-2">{getIcon('writing')}Writing</TabsTrigger>
               <TabsTrigger value="reading" className="gap-2">{getIcon('reading')}Reading</TabsTrigger>
               <TabsTrigger value="listening" className="gap-2">{getIcon('listening')}Listening</TabsTrigger>
             </TabsList>

             {/* Content Area (List and Details) */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Adjusted grid for better responsiveness */}
               {/* Sections List Column */}
               <div className="lg:col-span-1">
                 <Card className="shadow"> {/* Added shadow */}
                    <CardHeader>
                      <CardTitle className='text-xl'>Sections with Submissions</CardTitle> {/* Adjusted size */}
                    </CardHeader>
                    <CardContent>
                      {isLoadingList && <div className='text-center p-4'><Loader2 className="h-6 w-6 animate-spin mx-auto" /> Loading...</div>}
                      {listError && <p className="text-red-500 p-4 text-center flex items-center justify-center gap-2"><AlertCircle className='h-5 w-5'/> {listError}</p>}
                      {!isLoadingList && !listError && sections.length === 0 && (
                        <p className="text-gray-500 p-4 text-center">No {activeTab} sections found with submissions needing review.</p>
                      )}
                      {!isLoadingList && !listError && sections.length > 0 && (
                       <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2"> {/* Increased max height */}
                         {sections.map((section) => (
                            <Card
                              key={section.sectionId}
                              className={`cursor-pointer hover:shadow-md transition-shadow border ${selectedSectionDetails?.sectionId === section.sectionId ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}`}
                              onClick={() => handleSelectSection(section.sectionId, section.sectionType)} // Pass type too
                            >
                              <CardContent className="p-3"> {/* Slightly less padding */}
                                <p className="font-semibold text-base">{section.sectionTitle}</p> {/* Adjusted size */}
                                <p className="text-sm text-gray-600">
                                  {section.studentCount ?? '?'} Student Submission{section.studentCount === 1 ? '' : 's'}
                                </p>
                              </CardContent>
                            </Card>
                         ))}
                       </div>
                     )}
                    </CardContent>
                 </Card>
               </div>

               {/* Section Details Column */}
               <div className="lg:col-span-2">
                  <Card className="shadow"> {/* Added shadow */}
                    <CardHeader>
                      <CardTitle className='text-xl'>Response Details</CardTitle> {/* Adjusted size */}
                    </CardHeader>
                    <CardContent className='min-h-[300px]'> {/* Added min height */}
                     {isLoadingDetails && <div className='text-center p-10'><Loader2 className="h-8 w-8 animate-spin mx-auto" /> Loading Details...</div>}
                     {detailError && <p className="text-red-500 p-10 text-center flex flex-col items-center justify-center gap-2"><AlertCircle className='h-8 w-8'/> {detailError}</p>}
                     {!selectedSectionDetails && !isLoadingDetails && !detailError && (
                       <p className="text-gray-500 text-center py-10">Select a section from the list to view student responses.</p>
                     )}

                      {selectedSectionDetails && !isLoadingDetails && !detailError && (
                       <div>
                          <h2 className="text-xl font-semibold mb-4 border-b pb-2">{selectedSectionDetails.sectionTitle}</h2>
                          {selectedSectionDetails.submissions.length === 0 && ( <p className="text-gray-500">No submissions found for this section.</p> )}

                          <Accordion type="multiple" className="w-full">
                           {selectedSectionDetails.submissions.map((submission, index) => (
                              <AccordionItem value={`student-${submission.student.id}-${index}`} key={`student-${submission.student.id}-${index}`}>
                               <AccordionTrigger className="hover:bg-gray-50 px-2 rounded"> {/* Added hover bg */}
                                  <div className='flex items-center gap-2 text-base'> {/* Adjusted size */}
                                     <User className='h-4 w-4 text-gray-600'/>
                                     {submission.student.name}
                                     <span className='text-xs font-normal text-gray-500 ml-2'>({submission.responses.length} Task Response{submission.responses.length === 1 ? '' : 's'})</span>
                                  </div>
                               </AccordionTrigger>
                               <AccordionContent className="pt-0 pb-2 px-2"> {/* Adjusted padding */}
                                  <div className="space-y-3 pl-4 border-l-2 ml-2 mt-2"> {/* Adjusted spacing */}
                                   {submission.responses.map((response) => (
                                     <div key={response.responseId} className="p-3 border rounded-md bg-white shadow-sm"> {/* Changed bg */}
                                       <p className="font-medium mb-2 text-sm"> {/* Adjusted size */}
                                         {response.responseType === 'speaking' || response.responseType === 'writing'
                                             ? `Task ${response.taskNumber}`
                                             : `Question ${response.taskNumber}`
                                         }
                                         {` - ID: ${response.taskId}`} {/* Show task/question ID */}
                                         <span className="text-xs font-normal text-gray-500 italic ml-2">"{response.taskPrompt.substring(0, 40)}{response.taskPrompt.length > 40 ? '...' : ''}"</span>
                                        </p>

                                        {/* Render response based on type */}
                                        {response.responseType === 'speaking' && response.audioUrl && ( <div className='my-2'><AudioPlayer src={resolveStaticUrl(response.audioUrl)} allowReplay={true} /></div> )}
                                        {response.responseType === 'writing' && response.responseText && ( <div className="my-2 p-2 border bg-gray-50 rounded max-h-32 overflow-y-auto text-xs"><p style={{ whiteSpace: 'pre-wrap' }}>{response.responseText}</p></div> )}
                                        {(response.responseType === 'reading' || response.responseType === 'listening') && (
                                            <div className="text-xs my-2 space-y-1 p-2 border bg-blue-50 rounded">
                                                <p><strong>User Selection:</strong> {JSON.stringify(response.userSelection) || <span className='italic'>N/A</span>}</p>
                                                {/* Maybe display options here for context */}
                                            </div>
                                        )}

                                       {/* Feedback status and button */}
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100"> {/* Added border */}
                                         {response.hasFeedback ? ( <span className="text-xs font-medium text-green-700 px-2 py-0.5 bg-green-100 rounded-full flex items-center gap-1"> <CheckSquare className='h-3 w-3'/> Reviewed {response.score !== null ? `(${response.score})` : ''} </span> )
                                         : ( <span className="text-xs font-medium text-yellow-800 px-2 py-0.5 bg-yellow-100 rounded-full flex items-center gap-1"> <MessageSquare className='h-3 w-3'/> Needs Review </span> )}
                                         <Button size="sm" variant="outline" onClick={() => handleProvideFeedback(response.responseId, response.responseType)} > {response.hasFeedback ? 'View/Edit' : 'Grade'} <Eye className='h-3 w-3 ml-1.5'/> </Button> {/* Shortened text */}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </AccordionContent>
                             </AccordionItem>
                           ))}
                         </Accordion>
                       </div>
                     )}
                    </CardContent>
                  </Card>
               </div>
             </div>
           </Tabs>
         </div>
       </main>
       <Footer />
     </div>
   );
 };

 export default AdminFeedbackPage;