-- Nouveaux dossiers cash ET versement externe : pas de 25, sans arrondi.
-- Les dossiers existants et leurs validations restent inchangés.
do $$
declare original text; updated text;
begin
  original:=pg_get_functiondef('public.prepare_manual_receipt(uuid,text,numeric,text,text,text,uuid)'::regprocedure);
  updated:=replace(original,
    '  if not exists(select 1 from storage.objects where bucket_id=''finance-proofs''',
    '  if p_amount is null or p_amount<=0 or mod(p_amount,25)<>0 then
    raise exception ''Le montant doit être positif et multiple de 25 FCFA'' using errcode=''22023'';
  end if;
  if not exists(select 1 from storage.objects where bucket_id=''finance-proofs''');
  if updated=original then raise exception 'Garde de préparation attendue absente'; end if;
  -- Contrôle sur le numeric d’entrée avant coercition de la colonne à 2 décimales.
  -- revise_manual_receipt et prepare_payout_receipt passent par cette opération.
  execute updated;
end;
$$;
notify pgrst,'reload schema';
