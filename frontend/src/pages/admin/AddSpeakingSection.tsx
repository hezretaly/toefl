import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowLeft, Upload, Headphones, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext'; // Make sure useAuth provides token
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Label } from '@/components/ui/label';
import { createSpeakingSection } from '@/services/api'; 

interface Task {
  taskNumber: number;
  prompt: string;
  passage?: string;
  audioFile: File | null;
}

const AddSpeakingSection = () => {
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([
    { taskNumber: 1, prompt: '', passage: undefined, audioFile: null },
    { taskNumber: 2, prompt: '', passage: '', audioFile: null },
    { taskNumber: 3, prompt: '', passage: '', audioFile: null },
    { taskNumber: 4, prompt: '', passage: undefined, audioFile: null }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  // --- Get token from useAuth ---
  const { isAuthenticated, isLoading, token } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const isFormValid = useCallback(() => {
    // ... (validation logic remains the same) ...
    if (!title.trim()) return false;

    for (const task of tasks) {
      if (!task.prompt.trim()) {
        return false;
      }
      switch (task.taskNumber) {
        case 1: break;
        case 2:
        case 3:
          if (!task.passage || !task.passage.trim() || !task.audioFile) {
            return false;
          }
          break;
        case 4:
          if (!task.audioFile) {
            return false;
          }
          break;
        default: return false;
      }
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
    // Validate form first (already done via button disabled state, but good practice)
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
      const { audioFile, ...taskRest } = task; // Exclude file object from JSON
      return taskRest;
    });
    const sectionDataForApi = {
      title: title,
      tasks: tasksDataForApi
    };

    // 2. Prepare the taskAudioFiles Map for the API
    const taskAudioFilesMap = new Map<number, File>();
    tasks.forEach(task => {
      // API function expects audio only for tasks 2, 3, 4
      if (task.audioFile && task.taskNumber >= 2 && task.taskNumber <= 4) {
        taskAudioFilesMap.set(task.taskNumber, task.audioFile);
      }
    });

    console.log("Calling createSpeakingSection with:");
    console.log("sectionData:", sectionDataForApi);
    console.log("taskAudioFiles:", taskAudioFilesMap);


    try {
      // 3. Call the API function
      const response = await createSpeakingSection(sectionDataForApi, taskAudioFilesMap, token);

      // Assuming authenticatedFetch throws on error or handles non-2xx responses
      console.log("API Response:", response); // Log success response if needed
      toast.success('Speaking section created successfully!');
      navigate('/dashboard'); // Navigate on success

    } catch (error) {
      console.error('Error creating speaking section:', error);
      // Toast likely handled by authenticatedFetch/API function, but you can add a fallback
      // toast.error('Failed to create speaking section. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTask = tasks[activeTaskIndex];

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
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold mb-2">Add Speaking Section</h1>
              <p className="text-gray-600">Create a new speaking section with 4 tasks.</p>
            </div>
          </div>

          {/* Section Title Card */}
          <Card className="shadow-md mb-8">
            <CardHeader className="bg-toefl-green bg-opacity-10">
              <CardTitle className="text-xl flex items-center gap-2"><Mic className="h-5 w-5 text-toefl-green" />Section Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div>
                  <Label htmlFor="sectionTitle" className="block text-gray-700 font-medium mb-1">Section Title</Label>
                  <Input id="sectionTitle" placeholder="Enter section title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
            </CardContent>
          </Card>

          {/* Task Navigation and Details */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {/* Task Navigator */}
            <div className="md:col-span-1">
              <div className="space-y-4 sticky top-4">
                <Label className='text-sm font-medium text-gray-600 px-1'>Tasks</Label>
                {tasks.map((task, index) => {
                    let isTaskSetup = false;
                    if (task.taskNumber === 1 && task.prompt.trim()) isTaskSetup = true;
                    if (task.taskNumber === 2 && task.prompt.trim() && task.passage?.trim() && task.audioFile) isTaskSetup = true;
                    if (task.taskNumber === 3 && task.prompt.trim() && task.passage?.trim() && task.audioFile) isTaskSetup = true;
                    if (task.taskNumber === 4 && task.prompt.trim() && task.audioFile) isTaskSetup = true;
                    return (
                      <Card
                        key={task.taskNumber}
                        className={`cursor-pointer transition-all ${ activeTaskIndex === index ? 'border-toefl-green shadow-md ring-1 ring-toefl-green' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm' }`}
                        onClick={() => setActiveTaskIndex(index)} >
                        <CardContent className="p-4 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ isTaskSetup ? 'bg-green-100' : 'bg-gray-100' }`}>
                              <Mic className={`h-5 w-5 ${ isTaskSetup ? 'text-toefl-green' : 'text-gray-400' }`} />
                            </div>
                            <div className="font-medium">Task {task.taskNumber}</div>
                          </div>
                          {isTaskSetup && (<CheckCircle className="h-4 w-4 text-green-500" />)}
                          {activeTaskIndex === index && !isTaskSetup && (<div className="w-2 h-2 rounded-full bg-toefl-green animate-pulse" />)}
                        </CardContent>
                      </Card>
                    );
                 })}
              </div>
            </div>
            {/* Task Details Editor */}
            <div className="md:col-span-3">
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-xl"> Speaking Task {currentTask.taskNumber} Configuration </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                   <div className="space-y-6">
                     {/* Prompt */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label htmlFor={`prompt-${currentTask.taskNumber}`} className="block text-gray-700 font-medium">Speaking Prompt*</Label>
                      </div>
                      <Textarea id={`prompt-${currentTask.taskNumber}`} placeholder="Enter the speaking prompt or question" className="min-h-[100px]" value={currentTask.prompt} onChange={(e) => handleTaskChange(activeTaskIndex, 'prompt', e.target.value)} />
                    </div>
                     {/* Reading Passage (Tasks 2 & 3) */}
                    {(currentTask.taskNumber === 2 || currentTask.taskNumber === 3) && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <Label htmlFor={`passage-${currentTask.taskNumber}`} className="block text-gray-700 font-medium">Reading Passage*</Label>
                          <span className="text-sm text-gray-500">Required for Task {currentTask.taskNumber}</span>
                        </div>
                        <Textarea id={`passage-${currentTask.taskNumber}`} placeholder="Enter the reading passage that accompanies this speaking task" className="min-h-[150px]" value={currentTask.passage || ''} onChange={(e) => handleTaskChange(activeTaskIndex, 'passage', e.target.value)} />
                      </div>
                    )}
                     {/* Audio File (Tasks 2, 3, & 4) */}
                    {(currentTask.taskNumber === 2 || currentTask.taskNumber === 3 || currentTask.taskNumber === 4) && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <Label htmlFor={`audioFile-${currentTask.taskNumber}`} className="block text-gray-700 font-medium">Listening Audio File*</Label>
                          <span className="text-sm text-gray-500">Required for Task {currentTask.taskNumber}</span>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center min-h-[150px]">
                          {currentTask.audioFile ? (
                            <div className="text-center">
                              <Headphones className="h-10 w-10 text-toefl-green mx-auto mb-2" />
                              <p className="mb-2 font-medium text-sm break-all">{currentTask.audioFile.name}</p>
                              <p className="text-xs text-gray-500 mb-3"> {Math.round(currentTask.audioFile.size / 1024)} KB </p>
                              <Button variant="link" size="sm" onClick={() => handleTaskChange(activeTaskIndex, 'audioFile', null)} className="text-red-600 h-auto p-0"> Remove </Button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-10 w-10 text-gray-400 mb-2" />
                              <p className="mb-1 text-sm text-gray-600">Upload audio file</p>
                              <p className="mb-3 text-xs text-gray-500">MP3, WAV or M4A recommended</p>
                              <Input id={`audioFile-${currentTask.taskNumber}`} type="file" accept=".mp3,.wav,.m4a,audio/*" className="text-xs max-w-[250px] h-auto" onChange={(e) => { if (e.target.files && e.target.files[0]) { handleTaskChange(activeTaskIndex, 'audioFile', e.target.files[0]); } e.target.value = ''; }} />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid()} className="gap-2" >
              {isSubmitting ? ( <span className="animate-pulse">Submitting...</span> ) : ( <> <Mic className="h-4 w-4" /> Create Speaking Section </> )}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AddSpeakingSection;