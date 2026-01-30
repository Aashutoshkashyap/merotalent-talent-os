-- =============================================
-- ENHANCED SCHEMA FOR ALL FEATURES
-- =============================================

-- Add WhatsApp verification to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Quiz Management System
CREATE TABLE public.quizzes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 60,
    is_published BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    answers JSONB,
    score INTEGER,
    passed BOOLEAN,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(quiz_id, user_id)
);

-- Certificates
CREATE TABLE public.certificates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    certificate_number TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    template_data JSONB,
    pdf_url TEXT
);

-- Appointments for mentorship
CREATE TABLE public.appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    student_id UUID NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_link TEXT,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    amount NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments tracking
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    payment_type TEXT NOT NULL,
    reference_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'NPR',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tags for courses
CREATE TABLE public.tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.course_tags (
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (course_id, tag_id)
);

-- Institutes table
CREATE TABLE public.institutes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    type TEXT DEFAULT 'engineering',
    location TEXT,
    website TEXT,
    logo_url TEXT,
    description TEXT,
    total_seats INTEGER,
    available_seats INTEGER,
    admission_status TEXT DEFAULT 'closed',
    admission_deadline TIMESTAMP WITH TIME ZONE,
    contact_email TEXT,
    contact_phone TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Institute notices
CREATE TABLE public.institute_notices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    notice_type TEXT DEFAULT 'general',
    attachment_url TEXT,
    is_pinned BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add more fields to existing tables
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS thumbnail_file_url TEXT,
ADD COLUMN IF NOT EXISTS redirect_url TEXT;

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS pdf_attachment_url TEXT,
ADD COLUMN IF NOT EXISTS live_class_link TEXT,
ADD COLUMN IF NOT EXISTS live_class_scheduled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS external_link TEXT;

ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS cover_letter_file_url TEXT;

-- Competition registrations tracking
CREATE TABLE public.competition_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    team_name TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(competition_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view published quizzes" ON public.quizzes
    FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND (quizzes.is_published = true OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their quiz attempts" ON public.quiz_attempts
    FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create quiz attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their quiz attempts" ON public.quiz_attempts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their certificates" ON public.certificates
    FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage certificates" ON public.certificates
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their appointments" ON public.appointments
    FOR SELECT USING (auth.uid() = student_id OR has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.mentors WHERE mentors.id = appointments.mentor_id AND mentors.user_id = auth.uid()));

CREATE POLICY "Users can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their appointments" ON public.appointments
    FOR UPDATE USING (auth.uid() = student_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage payments" ON public.payments
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view tags" ON public.tags
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON public.tags
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view course tags" ON public.course_tags
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage course tags" ON public.course_tags
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view institutes" ON public.institutes
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage institutes" ON public.institutes
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view institute notices" ON public.institute_notices
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage institute notices" ON public.institute_notices
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their registrations" ON public.competition_registrations
    FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can register for competitions" ON public.competition_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institutes_updated_at BEFORE UPDATE ON public.institutes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();