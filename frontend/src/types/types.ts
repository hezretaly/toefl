// src/types.ts

export function returnUrlOfAudio(src: string): string{
  const pretext = 'http://127.0.0.1:5000/files'
  return pretext + src
}

// Base Question Interface
export interface BaseQuestion {
  id?: string; // Optional, added by backend
  type: string;
}

// Question Type Interfaces
export interface MultipleToSingleQuestion extends BaseQuestion {
  type: 'multiple_to_single';
  prompt: string;
  options: string[];
  correct_answer: string;
}

export interface MultipleToMultipleQuestion extends BaseQuestion {
  type: 'multiple_to_multiple';
  prompt: string;
  options: string[];
  correct_answers: string[];
}

export interface InsertTextQuestion extends BaseQuestion {
  type: 'insert_text';
  prompt: string;
  correct_answer: string; // e.g., 'a', 'b', 'c', 'd'
}

export interface ProseSummaryQuestion extends BaseQuestion {
  type: 'prose_summary';
  prompt: string;
  options: string[];
  correct_answers: string[];
}

export interface TableQuestion extends BaseQuestion {
  type: 'table';
  prompt: string;
  rows: string[];
  columns: string[];
  correct_selections: { row: string; column: string }[];
}

export interface AudioQuestion extends BaseQuestion {
  type: 'audio';
  prompt: string;
  snippetFile: File | null;
  options: string[];
  correct_answer: string;
}

// Union Type for Questions
export type Question =
  | MultipleToSingleQuestion
  | MultipleToMultipleQuestion
  | InsertTextQuestion
  | ProseSummaryQuestion
  | TableQuestion
  | AudioQuestion;

// Listening Section Interfaces
export interface Audio {
  id?: string; // Optional, added by backend
  title: string;
  audioFile: File | null;
  photoFile: File | null;
  questions: Question[];
}

export interface ListeningSection {
  id?: string; // Optional, added by backend
  title: string;
  audios: Audio[];
}

// API Request and Response Interfaces
export interface ListeningSectionRequest {
  title: string;
  audios: {
    title: string;
    questions: Question[];
  }[];
}

// Question Type Interfaces
export interface MultipleToSingleQuestionResponse extends BaseQuestion {
  type: 'multiple_to_single';
  prompt: string;
  options: string[];
  correct_answer: string;
}

export interface MultipleToMultipleQuestionResponse extends BaseQuestion {
  type: 'multiple_to_multiple';
  prompt: string;
  options: string[];
  correct_answers: string[];
}

export interface InsertTextQuestionResponse extends BaseQuestion {
  type: 'insert_text';
  prompt: string;
  correct_answer: string; // e.g., 'a', 'b', 'c', 'd'
}

export interface ProseSummaryQuestionResponse extends BaseQuestion {
  type: 'prose_summary';
  prompt: string;
  options: string[];
  correct_answers: string[];
}

export interface TableQuestionResponse extends BaseQuestion {
  type: 'table';
  prompt: string;
  rows: string[];
  columns: string[];
  correct_selections: { row: string; column: string }[];
}

export interface AudioQuestionResponse extends BaseQuestion {
  type: 'audio';
  prompt: string;
  audio_url: string;
  options: string[];
  correct_answer: string;
}

// Union Type for Questions
export type QuestionResponse =
  | MultipleToSingleQuestionResponse
  | MultipleToMultipleQuestionResponse
  | InsertTextQuestionResponse
  | ProseSummaryQuestionResponse
  | TableQuestionResponse
  | AudioQuestionResponse;

export interface AudioResponse {
  id: string;
  title: string;
  audio_url: string;
  photo_url: string | null;
  questions: QuestionResponse[];
}

export interface ListeningSectionResponse {
  id: string;
  title: string;
  audios: AudioResponse[];
}

// Speaking Section Interfaces
export interface Task1 {
  prompt: string;
}

export interface Task2 {
  passage: string;
  audioFile: File | null;
  prompt: string;
}

export interface Task3 extends Task2 {}

export interface Task4 {
  audioFile: File | null;
  prompt: string;
}

export interface SpeakingSection {
  id?: string;
  title: string;
  task1: Task1;
  task2: Task2;
  task3: Task3;
  task4: Task4;
}

export interface SpeakingSectionRequest {
  title: string;
  task1: Task1;
  task2: { passage: string; prompt: string };
  task3: { passage: string; prompt: string };
  task4: { prompt: string };
}

export interface SpeakingSectionResponse {
  id: string;
  title: string;
  task1: Task1;
  task2: { passage: string; audio_url: string; prompt: string };
  task3: { passage: string; audio_url: string; prompt: string };
  task4: { audio_url: string; prompt: string };
}

interface SpeakingTask {
  response_id: number;
  task_id: number;
  task_number: number;
  audio_url: string;
  score: number | null;
  feedback: string | null;
}

export interface SpeakingFeedback {
  response_id: number;
  task_id: number;
  score: number | null;
  feedback: string;
}

export interface SpeakingSectionReview {
  section_id: string;
  tasks: SpeakingTask[];
}

// Writing Section Interfaces
export interface WritingTask1 extends Task2 {}

export interface WritingTask2 {
  passage: string;
  prompt: string;
}

export interface WritingSection {
  id?: string;
  title: string;
  task1: WritingTask1;
  task2: WritingTask2;
}

export interface WritingSectionRequest {
  title: string;
  task1: { passage: string; prompt: string };
  task2: { passage: string; prompt: string };
}

export interface WritingSectionResponse {
  id: string;
  title: string;
  task1: { passage: string; audio_url: string; prompt: string };
  task2: { passage: string; prompt: string };
}

export interface WritingTask {
  response_id: number;
  task_id: number;
  task_number: number;
  prompt: string;
  response_text: string;
  score: number | null;
  feedback: string | null;
}

export type WritingSectionReview = WritingTask[];

// Reading Section Interfaces
export interface Passage {
  id?: string;
  title: string;
  text: string;
  questions: Question[];
}

export interface ReadingSection {
  id?: string;
  title: string;
  passages: Passage[];
}

export interface ReadingSectionRequest {
  title: string;
  passages: {
    title: string;
    text: string;
    questions: Question[];
  }[];
}

export interface ReadingSectionResponse {
  id: number;
  title: string;
  passages: Passage[];
}

export interface GetSections {
  total: number;
  sections: {
    id: number;
    title: string;
  }[];
}