-- Required for goalnova_player_complete_referral ON CONFLICT (referred_user_id)
create unique index if not exists player_referrals_referred_user_id_uidx
on public.player_referrals (referred_user_id);
