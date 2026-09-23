-- Categorías por cortes acumulados: 1-40 Membership, 41-90 Premium, 91+ VIP.
begin;
create or replace function ab_private.membership_tier(cuts integer)
returns text language sql immutable as $$
  select case when coalesce(cuts,0) >= 91 then 'VIP'
              when coalesce(cuts,0) >= 41 then 'Premium'
              else 'Membership' end
$$;
commit;
