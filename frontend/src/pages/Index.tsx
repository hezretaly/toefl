
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Mic, FileEdit, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-toefl-blue to-toefl-purple py-20 text-white">
          <div className="toefl-container">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="lg:w-1/2 space-y-6">
                <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                  Master the TOEFL Test with Confidence
                </h1>
                <p className="text-lg opacity-90">
                  Practice all sections of the TOEFL exam with our interactive simulator. 
                  Get real-time feedback and improve your scores.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/register')}
                    className="bg-white text-toefl-blue hover:bg-gray-100"
                  >
                    Start Practicing Now
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => navigate('/login')}
                    className="border-white text-white hover:bg-white/10"
                  >
                    Login to Your Account
                  </Button>
                </div>
              </div>
              <div className="lg:w-1/2">
                <img 
                  src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt="Student preparing for TOEFL test" 
                  className="rounded-lg shadow-xl w-full max-w-lg mx-auto"
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 bg-gray-50">
          <div className="toefl-container">
            <h2 className="text-3xl font-bold text-center mb-12">Complete TOEFL Test Preparation</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Reading */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-toefl-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Reading</h3>
                <p className="text-gray-600">
                  Practice with academic passages and answer comprehension questions to improve your reading skills.
                </p>
              </div>
              
              {/* Listening */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Headphones className="h-6 w-6 text-toefl-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Listening</h3>
                <p className="text-gray-600">
                  Enhance your listening comprehension with academic lectures and conversations.
                </p>
              </div>
              
              {/* Speaking */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mic className="h-6 w-6 text-toefl-green" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Speaking</h3>
                <p className="text-gray-600">
                  Record and evaluate your spoken responses to various academic tasks and questions.
                </p>
              </div>
              
              {/* Writing */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <FileEdit className="h-6 w-6 text-toefl-orange" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Writing</h3>
                <p className="text-gray-600">
                  Develop your academic writing skills with integrated and independent writing tasks.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Benefits Section */}
        <section className="py-16">
          <div className="toefl-container">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our TOEFL Simulator</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-toefl-green flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Authentic Exam Experience</h3>
                  <p className="text-gray-600">
                    Our simulator mimics the real TOEFL test environment, helping you get comfortable with the format.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-toefl-green flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Comprehensive Content</h3>
                  <p className="text-gray-600">
                    Access a wide range of practice materials covering all four sections of the TOEFL test.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-toefl-green flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Instant Feedback</h3>
                  <p className="text-gray-600">
                    Receive immediate scores for Reading and Listening sections, with detailed feedback.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-toefl-green flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
                  <p className="text-gray-600">
                    Monitor your improvement over time with detailed performance analytics.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/register')}
                className="gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Get Started Today
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
