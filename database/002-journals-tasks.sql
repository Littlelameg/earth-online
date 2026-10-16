BEGIN;
CREATE OR REPLACE FUNCTION public.earth_world_sync(p_action text, p_revision bigint DEFAULT NULL, p_world jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $earth$
DECLARE
  v_uid text := auth.uid();
  v_current public.earth_worlds%ROWTYPE;
  v_kind text;
  v_item jsonb;
  v_field text;
  v_ids text[];
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' OR coalesce(v_uid,'') = ''
     OR coalesce(auth.email(),'') = '' OR coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' THEN
    RETURN jsonb_build_object('ok',false,'code','UNAUTHENTICATED');
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('read','write') THEN
    RETURN jsonb_build_object('ok',false,'code','INVALID_ACTION');
  END IF;
  IF p_action = 'write' THEN
    IF p_revision IS NULL OR p_revision < 0 OR p_revision >= 9007199254740991 THEN
      RETURN jsonb_build_object('ok',false,'code','INVALID_REVISION');
    END IF;
    IF jsonb_typeof(p_world) IS DISTINCT FROM 'object'
       OR jsonb_typeof(p_world->'evening') IS DISTINCT FROM 'boolean' THEN
      RETURN jsonb_build_object('ok',false,'code','INVALID_WORLD');
    END IF;
    IF octet_length(p_world::text) > 1400000 THEN
      RETURN jsonb_build_object('ok',false,'code','WORLD_LIMIT');
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_world) k WHERE k NOT IN ('wishes','memories','evening','journals','tasks')) THEN
      RETURN jsonb_build_object('ok',false,'code','INVALID_FIELD');
    END IF;
    FOREACH v_kind IN ARRAY ARRAY['wishes','memories'] LOOP
      IF jsonb_typeof(p_world->v_kind) IS DISTINCT FROM 'array' THEN
        RETURN jsonb_build_object('ok',false,'code','INVALID_WORLD');
      END IF;
      IF jsonb_array_length(p_world->v_kind) > 2000 THEN
        RETURN jsonb_build_object('ok',false,'code','WORLD_LIMIT');
      END IF;
      v_ids := ARRAY[]::text[];
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_world->v_kind) LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
          RETURN jsonb_build_object('ok',false,'code','INVALID_WORLD');
        END IF;
        IF jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string'
           OR (v_item->>'id') !~ '^[A-Za-z0-9_-]{1,100}$' OR (v_item->>'id') = ANY(v_ids) THEN
          RETURN jsonb_build_object('ok',false,'code','INVALID_ID');
        END IF;
        v_ids := array_append(v_ids,v_item->>'id');
        IF jsonb_typeof(v_item->'title') IS DISTINCT FROM 'string'
           OR length(btrim(v_item->>'title')) = 0 OR length(v_item->>'title') > 80 THEN
          RETURN jsonb_build_object('ok',false,'code','INVALID_TITLE');
        END IF;
        FOR v_field IN SELECT jsonb_object_keys(v_item) LOOP
          IF v_field NOT IN ('id','title','date','source','note') OR (v_field='note' AND v_kind<>'memories') THEN
            RETURN jsonb_build_object('ok',false,'code','INVALID_FIELD');
          END IF;
          IF v_field IN ('date','source','note') AND
             (jsonb_typeof(v_item->v_field) IS DISTINCT FROM 'string'
              OR length(v_item->>v_field) > CASE WHEN v_field='note' THEN 1000 ELSE 100 END) THEN
            RETURN jsonb_build_object('ok',false,'code','INVALID_FIELD');
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;
  IF p_action='write' THEN
    FOREACH v_kind IN ARRAY ARRAY['journals','tasks'] LOOP
      IF NOT (p_world ? v_kind) THEN CONTINUE; END IF;
      IF jsonb_typeof(p_world->v_kind) IS DISTINCT FROM 'array' THEN
        RETURN jsonb_build_object('ok',false,'code','INVALID_WORLD');
      END IF;
      IF jsonb_array_length(p_world->v_kind)>2000 THEN
        RETURN jsonb_build_object('ok',false,'code','WORLD_LIMIT');
      END IF;
      v_ids := ARRAY[]::text[];
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_world->v_kind) LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string'
           OR (v_item->>'id') !~ '^[A-Za-z0-9_-]{1,100}$'
           OR (v_item->>'id')=ANY(v_ids) THEN
          RETURN jsonb_build_object('ok',false,'code','INVALID_ID');
        END IF;
        v_ids:=array_append(v_ids,v_item->>'id');
        IF v_kind='journals' THEN
          IF jsonb_typeof(v_item->'text') IS DISTINCT FROM 'string'
             OR length(btrim(v_item->>'text'))=0 OR length(v_item->>'text')>12000
             OR jsonb_typeof(v_item->'allowAI') IS DISTINCT FROM 'boolean'
             OR jsonb_typeof(v_item->'date') IS DISTINCT FROM 'string'
             OR (v_item->>'date') !~ '^\d{4}-\d{2}-\d{2}$'
             OR jsonb_typeof(v_item->'updatedAt') IS DISTINCT FROM 'string'
             OR length(v_item->>'updatedAt')>30 THEN
            RETURN jsonb_build_object('ok',false,'code','INVALID_JOURNAL');
          END IF;
          IF EXISTS(SELECT 1 FROM jsonb_object_keys(v_item) k WHERE k NOT IN ('id','text','date','updatedAt','allowAI')) THEN
            RETURN jsonb_build_object('ok',false,'code','INVALID_FIELD');
          END IF;
        ELSE
          FOREACH v_field IN ARRAY ARRAY['title','detail','date','status','reason'] LOOP
            IF jsonb_typeof(v_item->v_field) IS DISTINCT FROM 'string'
               OR length(v_item->>v_field)>(CASE v_field WHEN 'title' THEN 80 WHEN 'detail' THEN 3000 WHEN 'date' THEN 30 WHEN 'status' THEN 20 ELSE 300 END) THEN
              RETURN jsonb_build_object('ok',false,'code','INVALID_TASK');
            END IF;
          END LOOP;
          IF length(btrim(v_item->>'title'))=0 OR (v_item->>'status') NOT IN ('saved','trying','done','dismissed')
             OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_item) k WHERE k NOT IN ('id','title','detail','date','status','reason')) THEN
            RETURN jsonb_build_object('ok',false,'code','INVALID_TASK');
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  IF p_action = 'read' THEN
    SELECT * INTO v_current FROM public.earth_worlds WHERE owner_uid = v_uid;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok',true,'revision',0,'world','{"wishes":[],"memories":[],"evening":false}'::jsonb);
    END IF;
  ELSE
    INSERT INTO public.earth_worlds(owner_uid) VALUES (v_uid) ON CONFLICT DO NOTHING;
    SELECT * INTO v_current FROM public.earth_worlds WHERE owner_uid = v_uid FOR UPDATE;
    IF p_revision <> v_current.revision THEN
      RETURN jsonb_build_object('ok',true,'conflict',true,'revision',v_current.revision,'world',v_current.world);
    END IF;
    IF (v_current.world ? 'journals' AND NOT (p_world ? 'journals'))
       OR (v_current.world ? 'tasks' AND NOT (p_world ? 'tasks')) THEN
      RETURN jsonb_build_object('ok',false,'code','CLIENT_UPGRADE_REQUIRED');
    END IF;
    UPDATE public.earth_worlds SET world=p_world, revision=revision+1, updated_at=now()
      WHERE owner_uid=v_uid RETURNING * INTO v_current;
  END IF;
  RETURN jsonb_build_object('ok',true,'revision',v_current.revision,'world',v_current.world);
END;
$earth$;
REVOKE ALL ON FUNCTION public.earth_world_sync(text,bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.earth_world_sync(text,bigint,jsonb) TO authenticated;
COMMIT;
