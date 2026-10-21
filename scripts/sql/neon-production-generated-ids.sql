-- Forward-only repair of copied bigint defaults. No existing row is changed.
DO $repair$
DECLARE item record; current_default text; max_id bigint;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('audit_logs','neon_audit_logs_id_seq'),
    ('guest_college_verification_sends','guest_college_verification_sends_id_seq')
  ) AS required(table_name,sequence_name)
  LOOP
    SELECT pg_get_expr(d.adbin,d.adrelid) INTO current_default
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=format('public.%I',item.table_name)::regclass AND a.attname='id';
    IF current_default IS NULL THEN
      IF to_regclass(format('public.%I',item.sequence_name)) IS NOT NULL THEN
        RAISE EXCEPTION 'Existing sequence without expected column default requires review';
      END IF;
      EXECUTE format('CREATE SEQUENCE public.%I AS bigint',item.sequence_name);
      EXECUTE format('SELECT COALESCE(max(id),0) FROM public.%I',item.table_name) INTO max_id;
      PERFORM setval(format('public.%I',item.sequence_name)::regclass,GREATEST(max_id+1,1),false);
      EXECUTE format('ALTER SEQUENCE public.%I OWNED BY public.%I.id',item.sequence_name,item.table_name);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)',
        item.table_name,format('public.%I',item.sequence_name));
    END IF;
  END LOOP;
END;
$repair$;
