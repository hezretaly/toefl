
import { toast } from "sonner";

const API_URL = 'http://127.0.0.1:5000'; // Or use import.meta.env.VITE_API_BASE_URL

// Helper to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData;
    try {
        errorData = await response.json();
    } catch (e) {
        // If response is not JSON (e.g., plain text error)
        errorData = { error: await response.text() || 'An unexpected error occurred' };
    }
    console.error("API Error:", errorData);
    toast.error(errorData.error || errorData.message || 'An error occurred');
    throw new Error(errorData.error || errorData.message || 'An error occurred');
  }
  // Handle cases where response might be empty (e.g., 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json();
  } else {
      return {}; // Return empty object or handle as needed for non-JSON success responses
  }
};


// Fetch with authentication - MODIFIED FOR FormData HANDLING
export const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
) => {
  const headers: HeadersInit = {
     // Default headers (removed Content-Type here)
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body = options.body;

  // Set Content-Type only if body is NOT FormData
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    // Stringify body only if it's not already a string or FormData
    if (body && typeof body !== 'string') {
        body = JSON.stringify(body);
    }
  }
  // If body IS FormData, Content-Type is set automatically by fetch

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      body, // Use the potentially stringified body or original FormData
    });

    return handleResponse(response);
  } catch (error) {
    // Catch network errors (fetch itself failed)
    console.error('API request failed (network):', error);
    if (error instanceof Error) {
         toast.error(`Network error: ${error.message}. Please check your connection.`);
    } else {
         toast.error('Network error. Please check your connection.');
    }
    throw error;
  }
};

// File retrieval helper (Keep as is)
export const getFileUrl = (relativePath: string) => {
  if (!relativePath) return ''; // Handle cases where path might be undefined/null
  return `${API_URL}/files/${relativePath.startsWith('/') ? relativePath.substring(1) : relativePath}`;
};

// Test section APIs
export const fetchSections = async (sectionType: string, token: string | null) => {
  return authenticatedFetch(`/${sectionType}s`, { method: 'GET' }, token);
};

export const fetchSectionById = async (sectionType: string, sectionId: number, token: string | null) => {
  return authenticatedFetch(`/${sectionType}/${sectionId}`, { method: 'GET' }, token);
};

export const submitReadingAnswers = async (sectionId: number, answers: any, token: string | null) => {
  return authenticatedFetch(
    `/reading/${sectionId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
    token
  );
};

export const submitListeningAnswers = async (sectionId: number, answers: any, token: string | null) => {
  return authenticatedFetch(
    `/listening/${sectionId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
    token
  );
};

export const submitSpeakingAnswers = async (
  sectionId: number, 
  recordings: Record<string, Blob>,
  token: string | null
) => {
  const formData = new FormData();
  
  Object.entries(recordings).forEach(([key, blob]) => {
    formData.append(key, blob);
  });
  
  return fetch(`${API_URL}/speaking/${sectionId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  }).then(handleResponse);
};

export const submitWritingAnswers = async (
  sectionId: number, 
  answers: { task1: string; task2: string },
  token: string | null
) => {
  return authenticatedFetch(
    `/writing/${sectionId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
    token
  );
};

export const fetchSpeakingReview = async (sectionId: number, studentId: number, token: string | null) => {
  return authenticatedFetch(
    `/speaking/${sectionId}/review/${studentId}`,
    { method: 'GET' },
    token
  );
};

export const fetchWritingReview = async (sectionId: number, studentId: number, token: string | null) => {
  return authenticatedFetch(
    `/writing/${sectionId}/review/${studentId}`,
    { method: 'GET' },
    token
  );
};

/**
 * Create a new Reading Section.
 * No files involved, so uses standard JSON body.
 */
export const createReadingSection = async (
  sectionData: { title: string; passages: any[] }, // Use more specific types if available
  token: string | null
) => {
  // Stringify the data *before* passing it as the body
  const bodyData = JSON.stringify(sectionData);

  return authenticatedFetch(
      `/reading`, // Assuming endpoint follows convention '/{sectionType}'
      {
          method: 'POST',
          // Ensure the correct Content-Type header is set for JSON
          headers: {
              'Content-Type': 'application/json',
          },
          // Pass the already stringified data
          body: bodyData,
      },
      token
  );
};

/**
* Create a new Listening Section.
* Handles main audio files, optional image files, and optional question snippet files.
*/
export const createListeningSection = async (
  sectionData: { title: string; audioItems: any[] }, // Use more specific types without files
  mainAudioFiles: Map<string, File>, // Map<audioItemId, File>
  imageFiles: Map<string, File>, // Map<audioItemId, File>
  snippetFiles: Map<string, File>, // Map<questionId, File>
  token: string | null
) => {
  const formData = new FormData();

  // Append non-file data as JSON string
  formData.append('sectionData', JSON.stringify(sectionData));

  // Append main audio files with keys matching item IDs expected by backend
  mainAudioFiles.forEach((file, itemId) => {
      formData.append(`audioItem_${itemId}_audioFile`, file, file.name);
  });

  // Append optional image files
  imageFiles.forEach((file, itemId) => {
       formData.append(`audioItem_${itemId}_imageFile`, file, file.name);
  });

  // Append optional snippet files with keys matching question IDs
  snippetFiles.forEach((file, questionId) => {
      formData.append(`question_${questionId}_snippetFile`, file, file.name);
  });

  // Use fetch directly or the modified authenticatedFetch for FormData
  return authenticatedFetch(
      `/listening`,
      {
          method: 'POST',
          body: formData, // Pass FormData directly
          // Content-Type is NOT set here; browser handles it for FormData
      },
      token
  );
};


/**
* Create a new Speaking Section.
* Handles audio files for tasks 2, 3, and 4.
*/
export const createSpeakingSection = async (
  sectionData: { title: string; tasks: any[] }, // Use more specific types without files
  taskAudioFiles: Map<number, File>, // Map<taskNumber, File> for tasks 2, 3, 4
  token: string | null
) => {
  const formData = new FormData();

  // Append non-file data as JSON string
  formData.append('sectionData', JSON.stringify(sectionData));

  // Append audio files with keys identifying the task number
  taskAudioFiles.forEach((file, taskNumber) => {
      if (taskNumber >= 2 && taskNumber <= 4) { // Only tasks 2, 3, 4 have audio
          formData.append(`audio_task_${taskNumber}`, file, file.name);
      }
  });

  // Use fetch directly or the modified authenticatedFetch for FormData
  return authenticatedFetch(
      `/speaking`,
      {
          method: 'POST',
          body: formData,
          // Content-Type is NOT set here
      },
      token
  );
};

/**
* Create a new Writing Section.
* Handles audio file only for task 1.
*/
export const createWritingSection = async (
  sectionData: { title: string; tasks: any[] }, // Use more specific types without files
  task1AudioFile: File | null,
  token: string | null
) => {
  const formData = new FormData();

  // Append non-file data as JSON string
  formData.append('sectionData', JSON.stringify(sectionData));

  // Append Task 1 audio file if it exists
  if (task1AudioFile) {
      formData.append(`audio_task_1`, task1AudioFile, task1AudioFile.name);
  }

  // Use fetch directly or the modified authenticatedFetch for FormData
  return authenticatedFetch(
      `/writing`,
      {
          method: 'POST',
          body: formData,
          // Content-Type is NOT set here
      },
      token
  );
};

// src/services/api.ts
//import { SectionSummaryUser, UserSectionReviewDetail, SectionSummary, SectionDetailAdminView, FeedbackTargetDetails } from '@/types'; // Adjust path
export interface SectionSummaryUser {
  sectionId: number;
  sectionTitle: string;
  sectionType: 'speaking' | 'writing' | 'reading' | 'listening';
  completedAt?: string; // Optional: ISO date string when completed
}

// Details of a user's task/question response within a section review
export interface UserTaskReview {
    taskId: number; // Can be SpeakingTask.id, WritingTask.id, or Question.id
    taskNumber: number; // The sequential number within the section
    prompt: string;
    passage?: string | null; // For reading/integrated tasks
    taskAudioUrl?: string | null; // Audio associated with the task/question itself
    // User's actual response details
    response: {
        responseId: number; // SpeakingResponse.id, WritingResponse.id, or UserAnswer.id
        // Specific response data
        audioUrl?: string | null; // Speaking
        responseText?: string | null; // Writing
        wordCount?: number | null; // Writing
        userSelection?: any | null; // Reading/Listening (could be optionId, {rowId, colId}, array of optionIds)
        isCorrect?: boolean | null; // Auto-calculated correctness for R/L
    } | null; // Null if user didn't answer
    // Score and feedback details
    score: {
        score?: number | null; // Numeric score (e.g., 0-5 or 0-1)
        feedback?: string | null; // Text feedback
        scorer?: string | null; // Name/username of the scorer
    } | null; // Null if not scored/no feedback
    // Optional: For R/L, you might want to include correct answer info
    correctAnswer?: any | null; // Representation of the correct answer (e.g., optionId, {rowId, colId}, array)
    options?: { id: number; text: string }[] | null; // R/L options context
    rows?: { id: number; label: string }[] | null;    // R/L table rows context
    columns?: { id: number; label: string }[] | null; // R/L table columns context
}

// Full structure for the user's section review detail page
export interface UserSectionReviewDetail {
    sectionId: number;
    sectionTitle: string;
    sectionType: 'speaking' | 'writing' | 'reading' | 'listening';
    tasks: UserTaskReview[];
}


// --- Admin Review & Feedback Types ---

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

// --- USER REVIEW ---
export const fetchUserReviewSummaries = async (token: string | null): Promise<SectionSummaryUser[]> => {
    return authenticatedFetch(`/review/summaries`, {}, token);
};

export const fetchUserSectionReviewDetails = async (sectionType: string, sectionId: number, token: string | null): Promise<UserSectionReviewDetail> => { // Make return type specific or generic
    return authenticatedFetch(`/review/${sectionType}/${sectionId}`, {}, token);
};


// --- ADMIN REVIEW ---
export const fetchAdminSectionSummaries = async (sectionType: string, token: string | null): Promise<SectionSummaryAdmin[]> => {
    return authenticatedFetch(`/admin/review/summaries?type=${sectionType}`, {}, token);
};

export const fetchAdminSectionDetails = async (sectionType: string, sectionId: number, token: string | null): Promise<SectionDetailAdminView> => {
    return authenticatedFetch(`/admin/review/${sectionType}/${sectionId}`, {}, token);
};

export const fetchFeedbackTargetDetails = async (responseType: string, responseId: number, token: string | null): Promise<FeedbackTargetDetails> => {
    return authenticatedFetch(`/admin/feedback/${responseType}/${responseId}`, {}, token);
};

export const submitAdminFeedback = async (responseType: string, responseId: number, data: { score: number | null, feedback: string }, token: string | null): Promise<{ message: string }> => {
    return authenticatedFetch(
        `/admin/feedback/${responseType}/${responseId}`,
        {
            method: 'POST',
            body: JSON.stringify(data), // Send score and feedback as JSON
        },
        token
    );
};