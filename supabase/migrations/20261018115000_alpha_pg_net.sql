-- Les triggers push/purge appellent net.http_post ; sans extension ils
-- échouaient silencieusement dans leur branche de secours.
create extension if not exists pg_net with schema extensions;
