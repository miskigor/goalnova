update public.challenges
set
  reward = '50 XP points + Speedster badge + Challenge completed + Leaderboard position',
  reward_title = '50 XP points',
  reward_detail = '50 XP on valid completion · Speedster badge on profile + Challenge completed ✅ + Leaderboard position',
  reward_type = 'digital'
where slug = 'sprint-20m-challenge';
