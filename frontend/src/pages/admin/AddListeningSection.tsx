import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, PlusCircle, Trash2, ArrowLeft, Upload, CheckCircle, CheckSquare, GripVertical, Rows, Columns, FileAudio } from 'lucide-react'; // Added more icons
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator'; // Useful for visual separation
import { createListeningSection } from '@/services/api';

// --- Updated Question Interface ---
interface Question {
  id: string;
  type: string; // 'multiple_to_single', 'multiple_to_multiple', 'audio', 'table'
  prompt: string;
  options?: string[];                 // MC, MS, Audio
  correctOptionIndex?: number | null; // MC, Audio
  correctAnswerIndices?: number[];    // MS
  snippetFile?: File | null;          // Audio type question snippet
  rows?: string[];                    // Table
  columns?: string[];                 // Table
  correctTableSelections?: { rowIndex: number; colIndex: number }[]; // Table (index-based)
}

// --- Updated AudioItem Interface ---
interface AudioItem {
  id: string; // Use unique ID
  title: string;
  audioFile: File | null; // Main audio for the item
  imageFile: File | null; // Optional image for the item
  questions: Question[];
}

// --- Define Listening Question Types ---
const LISTENING_QUESTION_TYPES = [
  { value: 'multiple_to_single', label: 'Multiple Choice (Select One)', defaultOptions: 4 },
  { value: 'multiple_to_multiple', label: 'Multiple Select (Select Many)', defaultOptions: 4 },
  { value: 'audio', label: 'Audio Snippet (Select One)', defaultOptions: 4 },
  { value: 'table', label: 'Table Checkbox', defaultOptions: 0 }, // Uses rows/columns instead
];

// --- Helper to get default state for a listening question type ---
const getDefaultListeningQuestionState = (type: string): Partial<Question> => {
    const typeInfo = LISTENING_QUESTION_TYPES.find(t => t.value === type);
    const numOptions = typeInfo?.defaultOptions ?? 0;

    switch(type) {
        case 'multiple_to_single':
            return {
                options: Array(numOptions).fill(''),
                correctOptionIndex: null,
                correctAnswerIndices: undefined, snippetFile: undefined, rows: undefined, columns: undefined, correctTableSelections: undefined,
            };
        case 'multiple_to_multiple':
            return {
                options: Array(numOptions).fill(''),
                correctAnswerIndices: [],
                correctOptionIndex: undefined, snippetFile: undefined, rows: undefined, columns: undefined, correctTableSelections: undefined,
            };
        case 'audio':
            return {
                options: Array(numOptions).fill(''),
                correctOptionIndex: null, // Using index like MC for consistency
                snippetFile: null,
                correctAnswerIndices: undefined, rows: undefined, columns: undefined, correctTableSelections: undefined,
            };
        case 'table':
            return {
                rows: [''], // Start with one empty row
                columns: [''], // Start with one empty column
                correctTableSelections: [],
                options: undefined, correctOptionIndex: undefined, correctAnswerIndices: undefined, snippetFile: undefined,
            };
        default:
            return {};
    }
}

// Helper Component for Image Preview
const ImagePreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null); // Clear preview if file is removed
    }

    // Cleanup function: Revoke the object URL when the file changes or component unmounts
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        // console.log("Revoked Blob URL:", objectUrl); // For debugging
      }
    };
  }, [file]); // Dependency array: only run effect when 'file' changes

  if (!previewUrl || !file) {
    return null; // Or render a placeholder
  }

  return (
    <div className="text-center">
      <div className="mb-2">
        <img src={previewUrl} alt="Preview" className="max-h-20 mx-auto rounded-md" />
      </div>
      <p className="mb-1 font-medium text-sm break-all">{file.name}</p>
      <Button variant="link" size="sm" onClick={onRemove} className="mt-1 text-red-600 h-auto p-0">Remove</Button>
    </div>
  );
};

const AddListeningSection = () => {
  // --- State Hooks ---
  const [title, setTitle] = useState('');
  const [audioItems, setAudioItems] = useState<AudioItem[]>([{
    id: `audioItem-${Date.now()}`, // Use unique ID
    title: '',
    audioFile: null,
    imageFile: null,
    questions: [{
      id: `question-${Date.now()}`, // Use unique ID
      prompt: '',
      type: LISTENING_QUESTION_TYPES[0].value, // Default type
      ...getDefaultListeningQuestionState(LISTENING_QUESTION_TYPES[0].value), // Default structure
    } as Question] // Assert type
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Other Hooks (Context, Navigation, Effects) ---
  const { isAuthenticated, isLoading, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Effect runs after render, but the hook call itself must be unconditional.
    if (!isLoading && !isAuthenticated) {
       navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);


  // --- Handlers (Define functions - these are NOT hooks) ---

  // --- Audio Item Handlers (Using IDs) ---
  const handleAddAudioItem = () => {
    setAudioItems(prevItems => [...prevItems, {
      id: `audioItem-${Date.now()}`,
      title: '',
      audioFile: null,
      imageFile: null,
      questions: [{
        id: `question-${Date.now()}`,
        prompt: '',
        type: LISTENING_QUESTION_TYPES[0].value,
        ...getDefaultListeningQuestionState(LISTENING_QUESTION_TYPES[0].value),
      } as Question]
    }]);
  };

  const handleRemoveAudioItem = (audioItemId: string) => {
    setAudioItems(prevItems => prevItems.filter(item => item.id !== audioItemId));
  };

  const handleAudioItemChange = (audioItemId: string, field: 'title', value: string) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? { ...item, [field]: value } : item
    ));
  };

  const handleFileChange = (audioItemId: string, field: 'audioFile' | 'imageFile', file: File | null) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? { ...item, [field]: file } : item
    ));
  };

  // --- Question Handlers (Using IDs and Types) ---
  const handleAddQuestion = (audioItemId: string) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: [
          ...item.questions,
          {
            id: `question-${Date.now()}`,
            prompt: '',
            type: LISTENING_QUESTION_TYPES[0].value,
            ...getDefaultListeningQuestionState(LISTENING_QUESTION_TYPES[0].value),
          } as Question
        ]
      } : item
    ));
  };

  const handleRemoveQuestion = (audioItemId: string, questionId: string) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.filter(q => q.id !== questionId)
      } : item
    ));
  };

  const handleQuestionPromptChange = (audioItemId: string, questionId: string, value: string) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? { ...q, prompt: value } : q
        )
      } : item
    ));
  };

  const handleQuestionTypeChange = (audioItemId: string, questionId: string, type: string) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q => {
          if (q.id === questionId && q.type !== type) { // Only rebuild if type actually changes
            // Create a new question object from scratch for the new type
            // Keep only the essential persistent properties (id, prompt)
            return {
              id: q.id,         // Keep the unique ID
              prompt: q.prompt, // Keep the existing prompt text
              type: type,       // Set the new type
              // Apply the default state (options, correct answers, etc.) for the NEW type
              ...getDefaultListeningQuestionState(type)
            };
          }
          // If ID doesn't match or type is the same, return the question unchanged
          return q;
        })
      } : item
    ));
  };

  const handleOptionChange = (audioItemId: string, questionId: string, optionIndex: number, value: string) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? {
            ...q,
            options: (q.options ?? []).map((opt, idx) => idx === optionIndex ? value : opt)
          } : q
        )
      } : item
    ));
  };

  const handleCorrectOptionChange = (audioItemId: string, questionId: string, optionIndex: number) => {
     setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? { ...q, correctOptionIndex: optionIndex } : q
        )
      } : item
    ));
  };

  const handleToggleCorrectAnswerIndex = (audioItemId: string, questionId: string, optionIndex: number) => {
     setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q => {
          if (q.id === questionId) {
            const currentIndices = q.correctAnswerIndices ?? [];
            const indexExists = currentIndices.includes(optionIndex);
            const newIndices = indexExists
              ? currentIndices.filter(idx => idx !== optionIndex) // Remove
              : [...currentIndices, optionIndex]; // Add
            return { ...q, correctAnswerIndices: newIndices };
          }
          return q;
        })
      } : item
    ));
  };

  const handleSnippetFileChange = (audioItemId: string, questionId: string, file: File | null) => {
    setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? { ...q, snippetFile: file } : q
        )
      } : item
    ));
  };

  // --- Table Question Handlers ---
  const updateQuestionTable = (audioItemId: string, questionId: string, updates: Partial<Question>) => {
     setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        )
      } : item
    ));
  };

  const handleAddTableRow = (audioItemId: string, questionId: string) => {
     setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? { ...q, rows: [...(q.rows ?? []), ''] } : q // Add empty row
        )
      } : item
    ));
  };

  const handleAddTableColumn = (audioItemId: string, questionId: string) => {
     setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q =>
          q.id === questionId ? { ...q, columns: [...(q.columns ?? []), ''] } : q // Add empty column
        )
      } : item
    ));
  };

  const handleTableRowChange = (audioItemId: string, questionId: string, rowIndex: number, value: string) => {
     // Find the current state to map correctly
     const currentItem = audioItems.find(i => i.id === audioItemId);
     const currentQuestion = currentItem?.questions.find(q => q.id === questionId);
     if (!currentQuestion) return; // Should not happen

     updateQuestionTable(audioItemId, questionId, {
        rows: currentQuestion.rows?.map((r, i) => i === rowIndex ? value : r)
    });
  };

  const handleTableColumnChange = (audioItemId: string, questionId: string, colIndex: number, value: string) => {
     // Find the current state to map correctly
     const currentItem = audioItems.find(i => i.id === audioItemId);
     const currentQuestion = currentItem?.questions.find(q => q.id === questionId);
     if (!currentQuestion) return; // Should not happen

     updateQuestionTable(audioItemId, questionId, {
        columns: currentQuestion.columns?.map((c, i) => i === colIndex ? value : c)
    });
  };

   const handleToggleTableSelection = (audioItemId: string, questionId: string, rowIndex: number, colIndex: number) => {
     setAudioItems(prevItems => prevItems.map(item =>
      item.id === audioItemId ? {
        ...item,
        questions: item.questions.map(q => {
          if (q.id === questionId) {
              const currentSelections = q.correctTableSelections ?? [];
              const selectionExists = currentSelections.some(sel => sel.rowIndex === rowIndex && sel.colIndex === colIndex);
              let newSelections: { rowIndex: number; colIndex: number }[];
              if (selectionExists) {
                  newSelections = currentSelections.filter(sel => !(sel.rowIndex === rowIndex && sel.colIndex === colIndex));
              } else {
                  newSelections = [...currentSelections, { rowIndex, colIndex }];
              }
              return { ...q, correctTableSelections: newSelections };
          }
          return q;
        })
      } : item
    ));
   };

  // --- Submit Handler ---
  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields correctly, including files.");
      return;
    }
     if (!token) {
        toast.error("Authentication error. Please log in again.");
        return;
    }

    setIsSubmitting(true);

    // Prepare data: separate JSON data from files
    const mainAudioFiles = new Map<string, File>();
    const imageFiles = new Map<string, File>();
    const snippetFiles = new Map<string, File>();

    const itemsData = audioItems.map(item => {
      const questionsData = item.questions.map(q => {
        // Map snippet file if it exists
        if (q.type === 'audio' && q.snippetFile) {
          snippetFiles.set(q.id, q.snippetFile); // Map snippet file by question ID
        }

        // KEEP the 'id', but REMOVE the 'snippetFile' object for the JSON payload
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { snippetFile, ...questionRest } = q; // <<< CORRECTED: Keep 'id' by not destructuring it out
        return questionRest; // 'questionRest' now INCLUDES the 'id' property
      });

      // Map main audio file if it exists
      if (item.audioFile) {
        mainAudioFiles.set(item.id, item.audioFile); // Map main audio by item ID
      }
      // Map image file if it exists
      if (item.imageFile) {
        imageFiles.set(item.id, item.imageFile); // Map image file by item ID
      }

      // KEEP the 'id', but REMOVE 'audioFile' and 'imageFile' objects for the JSON payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { audioFile, imageFile, ...itemRest } = item; // <<< CORRECTED: Keep 'id' by not destructuring it out
      // 'itemRest' now INCLUDES the 'id' property
      return { ...itemRest, questions: questionsData }; // Return the item data including its ID and its questions (which also include their IDs)
    });

    // 'itemsData' now contains objects like: { id: "audioItem-...", title: "...", questions: [{ id: "question-...", prompt: "...", ... }] }
    const sectionData = {
      title: title,
      audioItems: itemsData, // Assuming backend expects 'audioItems' now
    };

    // Add a console log to verify before sending
    console.log("Submitting sectionData JSON:", JSON.stringify(sectionData, null, 2));
    console.log("Main Audio Files:", mainAudioFiles);
    console.log("Image Files:", imageFiles);
    console.log("Snippet Files:", snippetFiles);

    try {
      const response = await createListeningSection(
          sectionData,
          mainAudioFiles,
          imageFiles,
          snippetFiles,
          token
      );
      console.log("API Response:", response);
      toast.success('Listening section created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating listening section:', error);
      // Toast likely handled by API function
    } finally {
      setIsSubmitting(false);
    }
  };



  // --- Memoized Validation Function Hook (useCallback) ---
  // ***** MOVED HERE - BEFORE CONDITIONAL RETURN *****
  const isFormValid = useCallback(() => {
    if (!title.trim()) return false;
    if (audioItems.length === 0) return false;

    for (const item of audioItems) {
      if (!item.title.trim() || !item.audioFile) {
        // console.log(`Validation failed: Item ${item.id} missing title or audio file.`);
        return false; // Main audio file is required
      }
      if (item.questions.length === 0) {
        // console.log(`Validation failed: Item ${item.id} has no questions.`);
        return false;
      }

      for (const question of item.questions) {
        if (!question.prompt.trim() || !question.type) {
            // console.log(`Validation failed: Question ${question.id} in Item ${item.id} missing prompt or type.`);
            return false;
        }

        switch(question.type) {
            case 'multiple_to_single':
            case 'audio': // Both use options and single correct index
                if (!question.options || question.options.length === 0 || question.options.some(opt => !opt.trim())) {
                    // console.log(`Validation failed: Question ${question.id} (type ${question.type}) missing or empty options.`);
                    return false;
                }
                if (question.correctOptionIndex === null || question.correctOptionIndex < 0 || question.correctOptionIndex >= question.options.length) {
                    // console.log(`Validation failed: Question ${question.id} (type ${question.type}) invalid correctOptionIndex.`);
                    return false;
                }
                if (question.type === 'audio' && !question.snippetFile) {
                    // console.log(`Validation failed: Question ${question.id} (type audio) missing snippetFile.`);
                    return false; // Snippet required for audio type
                }
                break;
            case 'multiple_to_multiple':
                if (!question.options || question.options.length === 0 || question.options.some(opt => !opt.trim())) {
                    // console.log(`Validation failed: Question ${question.id} (type multiple_to_multiple) missing or empty options.`);
                    return false;
                }
                if (!question.correctAnswerIndices || question.correctAnswerIndices.length === 0) {
                    // console.log(`Validation failed: Question ${question.id} (type multiple_to_multiple) no correctAnswerIndices selected.`);
                    return false; // Must select at least one
                }
                 if (question.correctAnswerIndices.some(idx => idx < 0 || idx >= question.options.length)) {
                    // console.log(`Validation failed: Question ${question.id} (type multiple_to_multiple) invalid index in correctAnswerIndices.`);
                    return false; // Indices must be valid
                 }
                break;
            case 'table':
                if (!question.rows || question.rows.length === 0 || question.rows.some(r => !r.trim())) {
                    // console.log(`Validation failed: Question ${question.id} (type table) missing or empty rows.`);
                    return false; // Must have rows with text
                }
                if (!question.columns || question.columns.length === 0 || question.columns.some(c => !c.trim())) {
                    // console.log(`Validation failed: Question ${question.id} (type table) missing or empty columns.`);
                    return false; // Must have columns with text
                }
                if (!question.correctTableSelections || question.correctTableSelections.length === 0) {
                    // console.log(`Validation failed: Question ${question.id} (type table) no correctTableSelections made.`);
                    return false; // Must select at least one mapping
                 }
                 // Check if selections correspond to valid row/column indices
                 if (question.correctTableSelections.some(sel => sel.rowIndex < 0 || sel.rowIndex >= (question.rows?.length ?? 0) || sel.colIndex < 0 || sel.colIndex >= (question.columns?.length ?? 0) )) {
                    // console.log(`Validation failed: Question ${question.id} (type table) invalid index in correctTableSelections.`);
                    return false;
                 }
                 break;
            default:
                 // console.log(`Validation failed: Question ${question.id} has unknown type: ${question.type}.`);
                return false; // Unknown type
        }
      }
    }
    // console.log("Validation passed.");
    return true;
  }, [title, audioItems]); // Dependencies for useCallback


  // --- Conditional Return for Loading State ---
  // Now this is safe because all hook calls happened before it.
  if (isLoading) {
     return (
       <div className="flex flex-col min-h-screen">
         <Header />
         <main className="flex-1 flex items-center justify-center"><div>Checking authentication...</div></main>
         <Footer />
       </div>
     );
  }

  // --- Main Component Render ---
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl">
          {/* Header and Back Button */}
          <div className="flex items-center justify-between mb-8">
             <div>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800">
                   <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold mb-2">Add Listening Section</h1>
                <p className="text-gray-600">Create a new listening section with audio and questions.</p>
             </div>
          </div>

          {/* Section Title Card */}
          <Card className="shadow-md mb-8">
            <CardHeader className="bg-toefl-purple bg-opacity-10">
              <CardTitle className="text-xl flex items-center gap-2"><Headphones className="h-5 w-5 text-toefl-purple" />Section Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div>
                 <Label htmlFor="sectionTitle" className="block text-gray-700 font-medium mb-1">Section Title</Label>
                 <Input id="sectionTitle" placeholder="Enter section title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Audio Items Mapping */}
          {audioItems.map((item, itemIndex) => (
            <Card key={item.id} className="shadow-md mb-8">
              {/* Audio Item Header */}
              <CardHeader className="bg-gray-50 flex flex-row items-center justify-between p-4 border-b">
                 <CardTitle className="text-xl">Audio Item {itemIndex + 1}</CardTitle>
                 {audioItems.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAudioItem(item.id)} className="text-red-500 hover:text-red-700"> {/* Use ID */}
                       <Trash2 className="h-5 w-5" />
                    </Button>
                 )}
              </CardHeader>

              <CardContent className="p-6">
                 <div className="space-y-6">
                    {/* Audio Item Title */}
                    <div>
                       <Label htmlFor={`audioTitle-${item.id}`} className="block text-gray-700 font-medium mb-1">Audio Title</Label>
                       <Input id={`audioTitle-${item.id}`} placeholder="Enter audio title (e.g., Lecture 1, Conversation)" value={item.title} onChange={(e) => handleAudioItemChange(item.id, 'title', e.target.value)} /> {/* Use ID */}
                    </div>

                    {/* Audio/Image File Uploads */}
                    <div className="grid md:grid-cols-2 gap-6">
                       {/* Main Audio File Upload */}
                        <div>
                          <Label htmlFor={`audioFile-${item.id}`} className="block text-gray-700 font-medium mb-3">Audio File*</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center min-h-[150px]">
                            {item.audioFile ? (
                              <div className="text-center">
                                <FileAudio className="h-8 w-8 text-toefl-purple mx-auto mb-2" />
                                <p className="mb-2 font-medium text-sm break-all">{item.audioFile.name}</p>
                                <p className="text-xs text-gray-500">{Math.round(item.audioFile.size / 1024)} KB</p>
                                <Button variant="link" size="sm" onClick={() => handleFileChange(item.id, 'audioFile', null)} className="mt-2 text-red-600 h-auto p-0">Remove</Button> {/* Use ID */}
                              </div>
                            ) : (
                              <>
                                <Headphones className="h-10 w-10 text-gray-400 mb-2" />
                                <p className="mb-1 text-sm text-gray-600">Upload audio file</p>
                                <p className="mb-3 text-xs text-gray-500">MP3, WAV or M4A recommended</p>
                                <Input id={`audioFile-${item.id}`} type="file" accept=".mp3,.wav,.m4a,audio/*" className="text-xs h-auto" onChange={(e) => {if (e.target.files?.[0]) {handleFileChange(item.id, 'audioFile', e.target.files[0]); e.target.value = ''; /* Clear input */}}} /> {/* Use ID */}
                              </>
                            )}
                          </div>
                        </div>
                        {/* Optional Image Upload */}
                        <div>
                          <Label htmlFor={`imageFile-${item.id}`} className="block text-gray-700 font-medium mb-3">Optional Image</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center min-h-[150px]">
                            {item.imageFile ? (
                              <ImagePreview
                              file={item.imageFile}
                              onRemove={() => handleFileChange(item.id, 'imageFile', null)}
                            />
                          ) : (
                            <>
                              <Upload className="h-10 w-10 text-gray-400 mb-2" />
                              <p className="mb-1 text-sm text-gray-600">Upload image file</p>
                              <p className="mb-3 text-xs text-gray-500">JPG, PNG or GIF</p>
                              <Input id={`imageFile-${item.id}`} type="file" accept="image/*" className="text-xs h-auto" onChange={(e) => {if (e.target.files?.[0]) {handleFileChange(item.id, 'imageFile', e.target.files[0]); e.target.value = ''; /* Clear input */} }} />
                            </>
                            )}
                          </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Questions Section */}
                    <div className="space-y-4">
                       <h3 className="text-lg font-medium pt-4">Questions for Audio Item {itemIndex + 1}</h3>
                       {item.questions.map((question, questionIndex) => (
                          <div key={question.id} className="border rounded-md p-4 bg-white shadow-sm"> {/* Use ID */}
                             {/* Question Header: Number, Type Selector, Remove Button */}
                             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                                <h4 className="font-medium text-base whitespace-nowrap">Question {questionIndex + 1}</h4>
                                <div className="w-full sm:w-56 flex-shrink-0">
                                   <Select value={question.type} onValueChange={(value) => handleQuestionTypeChange(item.id, question.id, value)}> {/* Use IDs */}
                                      <SelectTrigger> <SelectValue placeholder="Select question type" /> </SelectTrigger>
                                      <SelectContent>
                                         {LISTENING_QUESTION_TYPES.map(type => ( <SelectItem key={type.value} value={type.value}> {type.label} </SelectItem> ))}
                                      </SelectContent>
                                   </Select>
                                </div>
                                {item.questions.length > 1 && (
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(item.id, question.id)} className="text-red-500 hover:text-red-700 h-8 w-8 self-start sm:self-center"> {/* Use IDs */}
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                             </div>

                             {/* Question Body - Conditional Rendering */}
                             <div className="space-y-4">
                                {/* Prompt Input */}
                                <div>
                                   <Label htmlFor={`questionPrompt-${question.id}`} className="block text-gray-700 font-medium mb-1">Question Prompt</Label>
                                   <Textarea id={`questionPrompt-${question.id}`} placeholder="Enter question prompt..." value={question.prompt} onChange={(e) => handleQuestionPromptChange(item.id, question.id, e.target.value)} /> {/* Use IDs */}
                                </div>

                                {/* --- Type-Specific Inputs --- */}

                                {/* Multiple Choice (MC) */}
                                {question.type === 'multiple_to_single' && (
                                  <div className="space-y-3">
                                     <Label className="block text-gray-700 font-medium">Answer Options (Select the correct one)</Label>
                                     <RadioGroup
                                        value={question.correctOptionIndex !== null ? `option-${question.id}-${question.correctOptionIndex}` : undefined}
                                        onValueChange={(value) => {
                                          const index = parseInt(value.split('-').pop() || '-1', 10);
                                          if (index !== -1) handleCorrectOptionChange(item.id, question.id, index); // Use IDs
                                        }}
                                     >
                                        {(question.options ?? []).map((option, optionIndex) => (
                                           <div key={optionIndex} className="flex items-center gap-3">
                                              <RadioGroupItem value={`option-${question.id}-${optionIndex}`} id={`option-${question.id}-${optionIndex}`} />
                                              <Label htmlFor={`option-${question.id}-${optionIndex}`} className="w-6 text-center font-medium cursor-pointer">{String.fromCharCode(65 + optionIndex)}</Label>
                                              <Input placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} value={option} onChange={(e) => handleOptionChange(item.id, question.id, optionIndex, e.target.value)} /> {/* Use IDs */}
                                              {question.correctOptionIndex === optionIndex && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                                           </div>
                                        ))}
                                     </RadioGroup>
                                  </div>
                                )}

                                 {/* Multiple Select (MS) */}
                                {question.type === 'multiple_to_multiple' && (
                                    <div className="space-y-3">
                                        <Label className="block text-gray-700 font-medium">Answer Options (Select all correct ones)</Label>
                                        {(question.options ?? []).map((option, optionIndex) => (
                                            <div key={optionIndex} className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`option-${question.id}-${optionIndex}`}
                                                    checked={(question.correctAnswerIndices ?? []).includes(optionIndex)}
                                                    onCheckedChange={() => handleToggleCorrectAnswerIndex(item.id, question.id, optionIndex)} // Use IDs
                                                />
                                                <Label htmlFor={`option-${question.id}-${optionIndex}`} className="w-6 text-center font-medium cursor-pointer">{String.fromCharCode(65 + optionIndex)}</Label>
                                                <Input placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} value={option} onChange={(e) => handleOptionChange(item.id, question.id, optionIndex, e.target.value)} /> {/* Use IDs */}
                                                 {(question.correctAnswerIndices ?? []).includes(optionIndex) && <CheckSquare className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                 {/* Audio Snippet Question */}
                                {question.type === 'audio' && (
                                  <div className='space-y-4'>
                                      {/* Snippet Upload */}
                                      <div>
                                         <Label htmlFor={`snippetFile-${question.id}`} className="block text-gray-700 font-medium mb-1">Audio Snippet File*</Label>
                                         <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                                            {question.snippetFile ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-xs text-green-600 font-medium truncate pr-2">
                                                        <FileAudio className="h-4 w-4 inline mr-1" /> {question.snippetFile.name}
                                                    </span>
                                                    <Button variant="link" size="sm" onClick={() => handleSnippetFileChange(item.id, question.id, null)} className="text-red-600 h-auto p-0 text-xs flex-shrink-0">Remove</Button> {/* Use IDs */}
                                                </div>
                                            ) : (
                                                <Input id={`snippetFile-${question.id}`} type="file" accept=".mp3,.wav,.m4a,audio/*" className='text-xs h-auto border-none shadow-none flex-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100' onChange={(e) => {handleSnippetFileChange(item.id, question.id, e.target.files?.[0] ?? null); e.target.value = ''; /* Clear input */}} /> /* Use IDs */
                                            )}
                                         </div>
                                      </div>
                                      {/* Options and Correct Answer (Radio) */}
                                      <div className="space-y-3">
                                          <Label className="block text-gray-700 font-medium">Answer Options (Select the correct one)</Label>
                                          <RadioGroup
                                              value={question.correctOptionIndex !== null ? `option-${question.id}-${question.correctOptionIndex}` : undefined}
                                              onValueChange={(value) => {
                                                const index = parseInt(value.split('-').pop() || '-1', 10);
                                                if (index !== -1) handleCorrectOptionChange(item.id, question.id, index); // Use IDs
                                              }}
                                          >
                                              {(question.options ?? []).map((option, optionIndex) => (
                                                  <div key={optionIndex} className="flex items-center gap-3">
                                                      <RadioGroupItem value={`option-${question.id}-${optionIndex}`} id={`option-${question.id}-${optionIndex}`} />
                                                      <Label htmlFor={`option-${question.id}-${optionIndex}`} className="w-6 text-center font-medium cursor-pointer">{String.fromCharCode(65 + optionIndex)}</Label>
                                                      <Input placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} value={option} onChange={(e) => handleOptionChange(item.id, question.id, optionIndex, e.target.value)} /> {/* Use IDs */}
                                                      {question.correctOptionIndex === optionIndex && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                                                  </div>
                                              ))}
                                          </RadioGroup>
                                      </div>
                                  </div>
                                )}

                                {/* Table Question */}
                                {question.type === 'table' && (
                                    <div className="space-y-4">
                                        {/* Row/Column Definitions */}
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                            <div>
                                                <Label className='block text-gray-700 font-medium mb-2'>Table Rows</Label>
                                                {(question.rows ?? []).map((row, rowIndex) => (
                                                    <div key={rowIndex} className="flex items-center gap-2 mb-2">
                                                        <GripVertical className='h-4 w-4 text-gray-400 flex-shrink-0 cursor-grab'/>
                                                        <Input placeholder={`Row ${rowIndex + 1} Label`} value={row} onChange={(e) => handleTableRowChange(item.id, question.id, rowIndex, e.target.value)} /> {/* Use IDs */}
                                                        {/* Optional: Add remove row button if needed
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700"> <Trash2 className="h-4 w-4" /> </Button> */}
                                                    </div>
                                                ))}
                                                <Button variant="outline" size="sm" onClick={() => handleAddTableRow(item.id, question.id)} className='gap-1 text-xs'> <Rows className='h-3 w-3'/> Add Row </Button> {/* Use IDs */}
                                            </div>
                                             <div>
                                                <Label className='block text-gray-700 font-medium mb-2'>Table Columns</Label>
                                                {(question.columns ?? []).map((col, colIndex) => (
                                                    <div key={colIndex} className="flex items-center gap-2 mb-2">
                                                        <GripVertical className='h-4 w-4 text-gray-400 rotate-90 flex-shrink-0 cursor-grab'/>
                                                        <Input placeholder={`Column ${colIndex + 1} Label`} value={col} onChange={(e) => handleTableColumnChange(item.id, question.id, colIndex, e.target.value)} /> {/* Use IDs */}
                                                         {/* Optional: Add remove column button if needed
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700"> <Trash2 className="h-4 w-4" /> </Button> */}
                                                    </div>
                                                ))}
                                                <Button variant="outline" size="sm" onClick={() => handleAddTableColumn(item.id, question.id)} className='gap-1 text-xs'> <Columns className='h-3 w-3'/> Add Column </Button> {/* Use IDs */}
                                            </div>
                                        </div>
                                        {/* Selection Grid */}
                                        <div>
                                            <Label className="block text-gray-700 font-medium mb-2">Select Correct Mappings</Label>
                                            { (question.rows?.length ?? 0) > 0 && (question.columns?.length ?? 0) > 0 ? (
                                                <div className='overflow-x-auto rounded border'>
                                                    <table className="w-full border-collapse text-sm bg-white">
                                                    <thead>
                                                      <tr className='bg-gray-50'>
                                                        <th className="border-b border-r border-gray-300 p-2 font-medium"></th>{/* Corner - No newline/space before this */}
                                                        {(question.columns ?? []).map((col, colIndex) => (
                                                          <th key={colIndex} className={`border-b border-gray-300 p-2 font-medium text-center ${colIndex !== (question.columns?.length ?? 0) - 1 ? 'border-r' : ''}`}>{col || `Col ${colIndex + 1}`}</th>
                                                        ))}{/* No newline/space after the map */}
                                                      </tr>
                                                    </thead>
                                                        <tbody>
                                                            {(question.rows ?? []).map((row, rowIndex) => (
                                                            <tr key={rowIndex} className={`${rowIndex !== (question.rows?.length ?? 0) - 1 ? 'border-b border-gray-300' : ''}`}>
                                                                <td className="border-r border-gray-300 p-2 font-medium bg-gray-50">{row || `Row ${rowIndex + 1}`}</td>
                                                                {(question.columns ?? []).map((col, colIndex) => (
                                                                <td key={colIndex} className={`p-2 text-center ${colIndex !== (question.columns?.length ?? 0) - 1 ? 'border-r border-gray-300' : ''}`}>
                                                                    <Checkbox
                                                                        id={`table-sel-${question.id}-${rowIndex}-${colIndex}`}
                                                                        checked={(question.correctTableSelections ?? []).some(sel => sel.rowIndex === rowIndex && sel.colIndex === colIndex)}
                                                                        onCheckedChange={() => handleToggleTableSelection(item.id, question.id, rowIndex, colIndex)} // Use IDs
                                                                    />
                                                                </td>
                                                                ))}
                                                            </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className='text-xs text-gray-500'>Add at least one row and one column with text to define selections.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* --- End Type-Specific Inputs --- */}
                             </div> {/* End Question Body */}
                          </div>
                       ))}

                       {/* Add Question Button */}
                       <div className="flex justify-end pt-4 border-t mt-4">
                          <Button variant="outline" size="sm" onClick={() => handleAddQuestion(item.id)} className="gap-1"> {/* Use ID */}
                             <PlusCircle className="h-4 w-4" /> Add Question to Item {itemIndex + 1}
                          </Button>
                       </div>
                    </div> {/* End Questions Section */}
                 </div>
              </CardContent>
            </Card>
          ))} {/* End Audio Items Mapping */}

          {/* Bottom Buttons */}
          <div className="flex justify-between mb-8 mt-8">
            <Button variant="outline" onClick={handleAddAudioItem} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Another Audio Item
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid()} className="gap-2">
              {isSubmitting ? (<span className="animate-pulse">Submitting...</span>) : (<><Headphones className="h-4 w-4" /> Create Listening Section</>)}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AddListeningSection;