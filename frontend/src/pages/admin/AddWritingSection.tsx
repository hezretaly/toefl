import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, ArrowLeft, Upload, Headphones, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext'; // Make sure useAuth provides token
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Label } from '@/components/ui/label';
import { createWritingSection } from '@/services/api'; // <--- IMPORT API FUNCTION

interface Task {
  taskNumber: number;
  prompt: string;
  passage?: string;
  audioFile: File | null; // Only used by Task 1
}

const AddWritingSection = () => {
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([
    { taskNumber: 1, prompt: '', passage: '', audioFile: null },
    { taskNumber: 2, prompt: '', passage: '', audioFile: null }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  // --- Get token from useAuth ---
  const { isAuthenticated, isLoading, token } = useAuth(); // <--- GET TOKEN
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const isFormValid = useCallback(() => {
    // ... (validation logic remains the same) ...
     if (!title.trim()) {
        return false;
    }
    const task1 = tasks[0];
    if (!task1.prompt.trim() || !task1.passage || !task1.passage.trim() || !task1.audioFile) {
        return false;
    }
    const task2 = tasks[1];
    if (!task2.prompt.trim() || !task2.passage || !task2.passage.trim()) {
        return false;
    }
    return true;
  }, [title, tasks]);

  if (isLoading) {
    // ... (loading return remains the same) ...
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center"><div>Checking authentication...</div></main>
        <Footer />
      </div>
    );
  }

  const handleTaskChange = (index: number, field: keyof Task, value: string | File | null) => {
    // ... (handler remains the same) ...
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value as any };
    setTasks(newTasks);
  };

  // --- Updated handleSubmit to use API function ---
  const handleSubmit = async () => {
    if (!isFormValid()) {
        toast.error("Please complete all required fields for each task.");
        return;
    }
     if (!token) {
        toast.error("Authentication error. Please log in again.");
        navigate('/login');
        return;
    }

    setIsSubmitting(true);

    // 1. Prepare sectionData object for the API
    const tasksDataForApi = tasks.map(task => {
      const { audioFile, ...taskRest } = task; // Exclude file object from JSON for both tasks
      return taskRest;
    });
    const sectionDataForApi = {
      title: title,
      tasks: tasksDataForApi
    };

    // 2. Get Task 1 audio file (can be null)
    const task1Audio = tasks[0].audioFile;

    console.log("Calling createWritingSection with:");
    console.log("sectionData:", sectionDataForApi);
    console.log("task1AudioFile:", task1Audio);

    try {
      // 3. Call the API function
      const response = await createWritingSection(sectionDataForApi, task1Audio, token);

      // Assuming authenticatedFetch throws on error or handles non-2xx responses
      console.log("API Response:", response); // Log success response if needed
      toast.success('Writing section created successfully!');
      navigate('/dashboard'); // Navigate on success

    } catch (error) {
      console.error('Error creating writing section:', error);
      // Toast likely handled by authenticatedFetch/API function
      // toast.error('Failed to create writing section. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // ... (JSX Rendering remains largely the same) ...
    // Ensure Button's disabled state uses isFormValid()
    // <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid()} ...>
     <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
               <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"> <ArrowLeft className="h-4 w-4" /> Back to Dashboard </Button>
              <h1 className="text-3xl font-bold mb-2">Add Writing Section</h1>
              <p className="text-gray-600">Create a new writing section with 2 tasks.</p>
            </div>
          </div>
           {/* Section Title Card */}
          <Card className="shadow-md mb-8">
            <CardHeader className="bg-toefl-orange bg-opacity-10">
              <CardTitle className="text-xl flex items-center gap-2"><FileEdit className="h-5 w-5 text-toefl-orange" />Section Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div>
                  <Label htmlFor="sectionTitle" className="block text-gray-700 font-medium mb-1">Section Title</Label>
                  <Input id="sectionTitle" placeholder="Enter section title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
            </CardContent>
          </Card>
          {/* Task Tabs */}
          <Tabs className="mb-8" value={`task${activeTaskIndex + 1}`} onValueChange={(value) => setActiveTaskIndex(parseInt(value.replace('task', '')) - 1)} >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="task1" className="gap-2">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${ tasks[0].prompt.trim() && tasks[0].passage?.trim() && tasks[0].audioFile ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500' }`}> 1 </div>
                Integrated Task
                {tasks[0].prompt.trim() && tasks[0].passage?.trim() && tasks[0].audioFile && ( <CheckCircle className="h-4 w-4 text-green-500 ml-1" /> )}
              </TabsTrigger>
              <TabsTrigger value="task2" className="gap-2">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${ tasks[1].prompt.trim() && tasks[1].passage?.trim() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500' }`}> 2 </div>
                 Writing for Academic Discussion
                 {tasks[1].prompt.trim() && tasks[1].passage?.trim() && ( <CheckCircle className="h-4 w-4 text-green-500 ml-1" /> )}
              </TabsTrigger>
            </TabsList>
             {/* Task 1 Content */}
            <TabsContent value="task1">
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b"> <CardTitle className="text-xl">Task 1: Integrated Writing</CardTitle> </CardHeader>
                <CardContent className="p-6">
                   <div className="space-y-6">
                     {/* Task 1 Passage */}
                    <div>
                      <div className="flex justify-between mb-1"> <Label htmlFor="task1-passage" className="block text-gray-700 font-medium">Reading Passage*</Label> <span className="text-sm text-gray-500">Required</span> </div>
                      <Textarea id="task1-passage" placeholder="Enter the reading passage for the integrated task" className="min-h-[200px]" value={tasks[0].passage || ''} onChange={(e) => handleTaskChange(0, 'passage', e.target.value)} />
                    </div>
                    {/* Task 1 Audio */}
                    <div>
                      <div className="flex justify-between mb-1"> <Label htmlFor="task1-audio" className="block text-gray-700 font-medium">Lecture Audio*</Label> <span className="text-sm text-gray-500">Required</span> </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center min-h-[150px]">
                        {tasks[0].audioFile ? (
                          <div className="text-center">
                            <Headphones className="h-10 w-10 text-toefl-orange mx-auto mb-2" />
                            <p className="mb-2 font-medium text-sm break-all">{tasks[0].audioFile.name}</p>
                            <p className="text-xs text-gray-500 mb-3"> {Math.round(tasks[0].audioFile.size / 1024)} KB </p>
                            <Button variant="link" size="sm" onClick={() => handleTaskChange(0, 'audioFile', null)} className="text-red-600 h-auto p-0">Remove</Button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="mb-1 text-sm text-gray-600">Upload lecture audio</p>
                            <p className="mb-3 text-xs text-gray-500">MP3, WAV or M4A recommended</p>
                            <Input id="task1-audio" type="file" accept=".mp3,.wav,.m4a,audio/*" className="text-xs max-w-[250px] h-auto" onChange={(e) => { if (e.target.files && e.target.files[0]) { handleTaskChange(0, 'audioFile', e.target.files[0]); } e.target.value = ''; }} />
                          </>
                        )}
                      </div>
                    </div>
                     {/* Task 1 Prompt */}
                    <div>
                      <div className="flex justify-between mb-1"> <Label htmlFor="task1-prompt" className="block text-gray-700 font-medium">Writing Prompt*</Label> <span className="text-sm text-gray-500">Required</span> </div>
                      <Textarea id="task1-prompt" placeholder="Enter the writing prompt (e.g., 'Summarize the points made in the lecture...')" className="min-h-[100px]" value={tasks[0].prompt} onChange={(e) => handleTaskChange(0, 'prompt', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
             {/* Task 2 Content */}
            <TabsContent value="task2">
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b"> <CardTitle className="text-xl">Task 2: Writing for an Academic Discussion</CardTitle> </CardHeader>
                <CardContent className="p-6">
                   <div className="space-y-6">
                     {/* Task 2 Passage */}
                    <div>
                      <div className="flex justify-between mb-1"> <Label htmlFor="task2-passage" className="block text-gray-700 font-medium">Discussion Context / Reading*</Label> <span className="text-sm text-gray-500">Required</span> </div>
                      <Textarea id="task2-passage" placeholder="Enter the online discussion question or context provided by the professor and other students." className="min-h-[200px]" value={tasks[1].passage || ''} onChange={(e) => handleTaskChange(1, 'passage', e.target.value)} />
                    </div>
                    {/* Task 2 Prompt */}
                    <div>
                      <div className="flex justify-between mb-1"> <Label htmlFor="task2-prompt" className="block text-gray-700 font-medium">Your Writing Task / Prompt*</Label> <span className="text-sm text-gray-500">Required</span> </div>
                      <Textarea id="task2-prompt" placeholder="Enter the specific instructions for the student's contribution to the discussion." className="min-h-[100px]" value={tasks[1].prompt} onChange={(e) => handleTaskChange(1, 'prompt', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
           {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid()} className="gap-2" >
              {isSubmitting ? ( <span className="animate-pulse">Submitting...</span> ) : ( <> <FileEdit className="h-4 w-4" /> Create Writing Section </> )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AddWritingSection;