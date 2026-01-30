-- =============================================
-- LMS PLATFORM TABLES
-- =============================================

-- Courses table (main LMS entity)
CREATE TABLE public.courses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    syllabus TEXT,
    learning_outcomes TEXT[],
    thumbnail_url TEXT,
    category TEXT,
    difficulty_level TEXT DEFAULT 'beginner',
    duration_hours INTEGER,
    price NUMERIC DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course modules (chapters)
CREATE TABLE public.course_modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lessons (videos, PDFs, quizzes, assignments)
CREATE TABLE public.lessons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'video', -- video, pdf, quiz, assignment
    content_url TEXT,
    content_text TEXT,
    duration_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course enrollments
CREATE TABLE public.course_enrollments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(course_id, user_id)
);

-- Lesson progress tracking
CREATE TABLE public.lesson_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(lesson_id, user_id)
);

-- =============================================
-- JOB APPLICATION SYSTEM
-- =============================================

-- Jobs table
CREATE TABLE public.jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[],
    skills_required TEXT[],
    location TEXT,
    job_type TEXT DEFAULT 'full-time', -- full-time, part-time, contract, internship
    experience_level TEXT DEFAULT 'entry', -- entry, mid, senior, lead
    salary_min NUMERIC,
    salary_max NUMERIC,
    is_remote BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    application_deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job applications with multi-step data
CREATE TABLE public.job_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    resume_url TEXT,
    cover_letter TEXT,
    portfolio_url TEXT,
    skills_match_score INTEGER,
    status TEXT DEFAULT 'submitted', -- submitted, screening, interview, offered, rejected, withdrawn
    notes TEXT,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(job_id, user_id)
);

-- =============================================
-- NOTIFICATION SYSTEM
-- =============================================

CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, success, alert
    category TEXT DEFAULT 'general', -- general, admin, job, course, competition
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- CONTACT FORM QUERIES
-- =============================================

CREATE TABLE public.contact_queries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, resolved
    assigned_to UUID REFERENCES auth.users(id),
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_queries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - COURSES
-- =============================================

CREATE POLICY "Anyone can view published courses" ON public.courses
    FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - MODULES & LESSONS
-- =============================================

CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND (courses.is_published = true OR has_role(auth.uid(), 'admin')))
    );

CREATE POLICY "Admins can manage all modules" ON public.course_modules
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view lessons of published courses" ON public.lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_modules m
            JOIN public.courses c ON c.id = m.course_id
            WHERE m.id = lessons.module_id AND (c.is_published = true OR has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Admins can manage all lessons" ON public.lessons
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - ENROLLMENTS & PROGRESS
-- =============================================

CREATE POLICY "Users can view their enrollments" ON public.course_enrollments
    FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can enroll in courses" ON public.course_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their enrollment" ON public.course_enrollments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their progress" ON public.lesson_progress
    FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can track their progress" ON public.lesson_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their progress" ON public.lesson_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - JOBS
-- =============================================

CREATE POLICY "Anyone can view active jobs" ON public.jobs
    FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'company'));

CREATE POLICY "Companies can manage their jobs" ON public.jobs
    FOR ALL USING (
        has_role(auth.uid(), 'admin') OR 
        EXISTS (SELECT 1 FROM public.companies WHERE companies.id = jobs.company_id AND companies.user_id = auth.uid())
    );

-- =============================================
-- RLS POLICIES - JOB APPLICATIONS
-- =============================================

CREATE POLICY "Users can view their applications" ON public.job_applications
    FOR SELECT USING (
        auth.uid() = user_id OR 
        has_role(auth.uid(), 'admin') OR
        EXISTS (
            SELECT 1 FROM public.jobs j
            JOIN public.companies c ON c.id = j.company_id
            WHERE j.id = job_applications.job_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can apply for jobs" ON public.job_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their applications" ON public.job_applications
    FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - NOTIFICATIONS
-- =============================================

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can send notifications" ON public.notifications
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can mark their notifications as read" ON public.notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- =============================================
-- RLS POLICIES - CONTACT QUERIES
-- =============================================

CREATE POLICY "Anyone can submit contact queries" ON public.contact_queries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view and manage queries" ON public.contact_queries
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON public.course_modules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();