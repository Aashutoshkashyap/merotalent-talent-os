-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'talent', 'institution', 'company', 'mentor');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    bio TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'talent',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create skills table
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_skills junction table
CREATE TABLE public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, skill_id)
);

-- Create institutions table
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('university', 'college', 'school', 'training_center')),
    description TEXT,
    logo_url TEXT,
    website TEXT,
    location TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    industry TEXT,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
    location TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentors table
CREATE TABLE public.mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    expertise TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10, 2),
    is_available BOOLEAN DEFAULT true,
    years_experience INTEGER,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitions table
CREATE TABLE public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organizer_type TEXT CHECK (organizer_type IN ('institution', 'company', 'admin')),
    type TEXT CHECK (type IN ('hackathon', 'quiz', 'coding', 'case_study', 'design', 'project')),
    format TEXT CHECK (format IN ('online', 'offline', 'hybrid')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    prize_pool TEXT,
    status TEXT CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')) DEFAULT 'draft',
    is_team_based BOOLEAN DEFAULT false,
    team_size_min INTEGER DEFAULT 1,
    team_size_max INTEGER DEFAULT 1,
    cover_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competition_participants table
CREATE TABLE public.competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT,
    status TEXT CHECK (status IN ('registered', 'submitted', 'evaluated', 'winner', 'disqualified')) DEFAULT 'registered',
    submission_url TEXT,
    score DECIMAL(10, 2),
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (competition_id, user_id)
);

-- Create badges table
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges junction table
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
    UNIQUE (user_id, badge_id, competition_id)
);

-- Create mentorship_sessions table
CREATE TABLE public.mentorship_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    mentee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own initial role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Skills policies (public read, admin write)
CREATE POLICY "Anyone can view skills"
ON public.skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage skills"
ON public.skills FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User skills policies
CREATE POLICY "Users can view all user skills"
ON public.user_skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own skills"
ON public.user_skills FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Institutions policies
CREATE POLICY "Anyone can view verified institutions"
ON public.institutions FOR SELECT
TO authenticated
USING (is_verified = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Institution owners can manage their institution"
ON public.institutions FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Companies policies
CREATE POLICY "Anyone can view verified companies"
ON public.companies FOR SELECT
TO authenticated
USING (is_verified = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company owners can manage their company"
ON public.companies FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Mentors policies
CREATE POLICY "Anyone can view available mentors"
ON public.mentors FOR SELECT
TO authenticated
USING (is_available = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors can manage their profile"
ON public.mentors FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Competitions policies
CREATE POLICY "Anyone can view published competitions"
ON public.competitions FOR SELECT
TO authenticated
USING (status != 'draft' OR auth.uid() = organizer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can manage their competitions"
ON public.competitions FOR ALL
TO authenticated
USING (auth.uid() = organizer_id OR public.has_role(auth.uid(), 'admin'));

-- Competition participants policies
CREATE POLICY "Participants can view their own participation"
ON public.competition_participants FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can register for competitions"
ON public.competition_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
ON public.competition_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Badges policies
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User badges policies
CREATE POLICY "Anyone can view user badges"
ON public.user_badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can award badges"
ON public.user_badges FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Mentorship sessions policies
CREATE POLICY "Users can view their sessions"
ON public.mentorship_sessions FOR SELECT
TO authenticated
USING (auth.uid() = mentee_id OR EXISTS (SELECT 1 FROM public.mentors WHERE id = mentor_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create sessions"
ON public.mentorship_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY "Session participants can update"
ON public.mentorship_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = mentee_id OR EXISTS (SELECT 1 FROM public.mentors WHERE id = mentor_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'talent');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentors_updated_at BEFORE UPDATE ON public.mentors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_competition_participants_updated_at BEFORE UPDATE ON public.competition_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentorship_sessions_updated_at BEFORE UPDATE ON public.mentorship_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default skills
INSERT INTO public.skills (name, category) VALUES
('JavaScript', 'Programming'),
('Python', 'Programming'),
('React', 'Frontend'),
('Node.js', 'Backend'),
('Machine Learning', 'AI/ML'),
('Data Analysis', 'Data Science'),
('UI/UX Design', 'Design'),
('Project Management', 'Management'),
('Communication', 'Soft Skills'),
('Problem Solving', 'Soft Skills');

-- Insert default badges
INSERT INTO public.badges (name, description, category) VALUES
('First Competition', 'Participated in your first competition', 'Achievement'),
('Winner', 'Won a competition', 'Achievement'),
('Top 10', 'Finished in top 10', 'Achievement'),
('Mentor Star', 'Completed 10 mentorship sessions', 'Mentorship'),
('Quick Learner', 'Completed 5 courses', 'Learning');