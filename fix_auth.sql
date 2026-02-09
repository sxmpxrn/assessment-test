-- ============================================================
-- FIX: DATABASE AUTHENTICATION via x-session-id HEADER
-- ============================================================
-- 1. สร้าง Index ให้ตาราง Sessions เพื่อให้ค้นหา Token เร็วๆ
CREATE OR REPLACE FUNCTION public.current_session_id()
RETURNS text LANGUAGE sql STABLE AS $$
    SELECT current_setting('request.headers', true)::json->>'x-session-id';
$$;

-- 3. ฟังก์ชันดึง User String (เช่น "55:student") จาก Session Token
CREATE OR REPLACE FUNCTION public.current_user_id_from_session()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_token text;
    v_user_id text;
BEGIN
    v_token := public.current_session_id();
    IF v_token IS NULL THEN RETURN NULL; END IF;
    
    SELECT user_id INTO v_user_id
    FROM public.sessions
    WHERE session_id = v_token
    AND expires_at > now();
    
    RETURN v_user_id;
END;
$$;

-- 4. ฟังก์ชันดึง Role Text (เช่น "student", "teacher") จาก Session
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
    -- "55:student" -> split_part 2 -> "student"
    SELECT split_part(public.current_user_id_from_session(), ':', 2);
$$;

-- 5. แก้ไข get_my_db_id ให้ใช้ Logic ใหม่
CREATE OR REPLACE FUNCTION public.get_my_db_id()
RETURNS bigint LANGUAGE sql STABLE AS $$
    -- "55:student" -> split_part 1 -> "55"
    SELECT split_part(public.current_user_id_from_session(), ':', 1)::bigint;
$$;

-- 6. แก้ไข get_current_role_id ให้ใช้ Logic ใหม่ (คืนค่าเป็น Integer ตาม Code เดิม)
CREATE OR REPLACE FUNCTION public.get_current_role_id()
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_role_text text;
BEGIN
    v_role_text := public.current_user_role();

    RETURN CASE v_role_text
        WHEN 'admin' THEN 1
        WHEN 'teacher' THEN 2
        WHEN 'student' THEN 3
        WHEN 'executive' THEN 4
        ELSE 0
    END;
END;
$$;


-- 7. แก้ไข Policies ทั้งหมดให้ใช้ฟังก์ชันใหม่
-- ============================================================
-- >> TABLE: STUDENTS
DROP POLICY IF EXISTS "Admin All Students" ON public.students;
DROP POLICY IF EXISTS "Student View Self" ON public.students;
DROP POLICY IF EXISTS "Teacher View My Students" ON public.students;

CREATE POLICY "Admin All Students" ON public.students FOR ALL
USING (public.current_user_role() = 'admin');

CREATE POLICY "Student View Self" ON public.students FOR SELECT
USING (
    public.current_user_role() = 'student' 
    AND id::text = split_part(public.current_user_id_from_session(), ':', 1)
);

CREATE POLICY "Teacher View My Students" ON public.students FOR SELECT
USING (
    public.current_user_role() = 'teacher'
    AND room_id IN (
        SELECT room_id FROM public.teacher_relationship 
        WHERE teacher_id::text = split_part(public.current_user_id_from_session(), ':', 1)
    )
);

-- >> TABLE: TEACHERS
DROP POLICY IF EXISTS "Admin All Teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teacher View Self" ON public.teachers;
DROP POLICY IF EXISTS "Student View My Teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teacher View My Rooms" ON public.teacher_relationship;

CREATE POLICY "Admin All Teachers" ON public.teachers FOR ALL
USING (public.current_user_role() = 'admin');

CREATE POLICY "Teacher View Self" ON public.teachers FOR SELECT
USING (
    public.current_user_role() = 'teacher' 
    AND id::text = split_part(public.current_user_id_from_session(), ':', 1)
);


-- Helper function to break recursion: Get Room ID without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_room_id()
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_user_id bigint;
    v_room_id bigint;
BEGIN
    v_user_id := public.get_my_db_id();
    IF v_user_id IS NULL THEN RETURN NULL; END IF;
    
    -- This query bypasses RLS because function is SECURITY DEFINER
    SELECT room_id INTO v_room_id FROM public.students WHERE id = v_user_id;
    
    RETURN v_room_id;
END;
$$;

-- >> TABLE: TEACHERS
DROP POLICY IF EXISTS "Admin All Teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teacher View Self" ON public.teachers;
DROP POLICY IF EXISTS "Student View My Teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teacher View My Rooms" ON public.teacher_relationship;
DROP POLICY IF EXISTS "Student View Relationship" ON public.teacher_relationship;

CREATE POLICY "Admin All Teachers" ON public.teachers FOR ALL
USING (public.current_user_role() = 'admin');

CREATE POLICY "Teacher View Self" ON public.teachers FOR SELECT
USING (
    public.current_user_role() = 'teacher' 
    AND id::text = split_part(public.current_user_id_from_session(), ':', 1)
);

CREATE POLICY "Student View My Teachers" ON public.teachers FOR SELECT
USING (
    public.current_user_role() = 'student'
    AND id IN (
        SELECT tr.teacher_id FROM public.teacher_relationship tr
        WHERE tr.room_id = public.get_my_room_id()
    )
);

CREATE POLICY "Teacher View My Rooms" ON public.teacher_relationship FOR SELECT
USING (
    public.current_user_role() = 'teacher'
    AND teacher_id::text = split_part(public.current_user_id_from_session(), ':', 1)
);

CREATE POLICY "Student View Relationship" ON public.teacher_relationship FOR SELECT
USING (
    public.current_user_role() = 'student'
    AND room_id = public.get_my_room_id()
);


-- >> TABLE: ASSESSMENT_ANSWER
DROP POLICY IF EXISTS "Admin All Answers" ON public.assessment_answer;
DROP POLICY IF EXISTS "Teacher View Own Answers" ON public.assessment_answer;
DROP POLICY IF EXISTS "Student Insert Answer" ON public.assessment_answer;

CREATE POLICY "Admin All Answers" ON public.assessment_answer FOR ALL
USING (public.current_user_role() = 'admin');

CREATE POLICY "Teacher View Own Answers" ON public.assessment_answer FOR SELECT
USING (
    public.current_user_role() = 'teacher'
    AND teacher_id::text = split_part(public.current_user_id_from_session(), ':', 1)
);

CREATE POLICY "Student View Own Answers" ON public.assessment_answer FOR SELECT
USING (
    public.current_user_role() = 'student'
    AND student_id::text = split_part(public.current_user_id_from_session(), ':', 1)
);

CREATE POLICY "Student Insert Answer" ON public.assessment_answer FOR INSERT
WITH CHECK (
    public.current_user_role() = 'student'
    AND student_id::text = split_part(public.current_user_id_from_session(), ':', 1)
    AND teacher_id IN (
        SELECT tr.teacher_id FROM public.teacher_relationship tr
        JOIN public.students s ON s.room_id = tr.room_id
        WHERE s.id::text = split_part(public.current_user_id_from_session(), ':', 1)
    )
);
-- >> TABLE: AVG_TEACHER
drop policy IF exists "Admin All Avg" on public.avg_teacher;

drop policy IF exists "Teacher View Own Avg" on public.avg_teacher;

create policy "Admin All Avg" on public.avg_teacher for all using (public.current_user_role () = 'admin');

create policy "Teacher View Own Avg" on public.avg_teacher for
select
  using (
    public.current_user_role () = 'teacher'
    and teacher_id::text = split_part(public.current_user_id_from_session (), ':', 1)
  );

-- >> TABLE: ASSESSMENT_HEAD / DETAIL (Update Admin Write)
DROP POLICY IF EXISTS "Admin Write Head" ON public.assessment_head;
DROP POLICY IF EXISTS "Admin Write Detail" ON public.assessment_detail;

CREATE POLICY "Admin Write Head" ON public.assessment_head FOR ALL
USING (public.current_user_role() = 'admin');

CREATE POLICY "Admin Write Detail" ON public.assessment_detail FOR ALL
USING (public.current_user_role() = 'admin');

-- >> TABLE: REFERENCE TABLES (Rooms, Majors, Faculties)
-- Allow authenticated users (students, teachers, admins) to read these tables
-- to support joins in other queries.

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read Access Rooms" ON public.rooms;
DROP POLICY IF EXISTS "Read Access Majors" ON public.majors;
DROP POLICY IF EXISTS "Read Access Faculties" ON public.faculties;

CREATE POLICY "Read Access Rooms" ON public.rooms FOR SELECT
USING (auth.role() = 'authenticated' OR public.current_user_role() IS NOT NULL);

CREATE POLICY "Read Access Majors" ON public.majors FOR SELECT
USING (auth.role() = 'authenticated' OR public.current_user_role() IS NOT NULL);

CREATE POLICY "Read Access Faculties" ON public.faculties FOR SELECT
USING (auth.role() = 'authenticated' OR public.current_user_role() IS NOT NULL);
