export const calculateLevel = (totalSessions: number, avgAccuracy: number) => {
    // Simple logic: Base level on sessions, bonus for accuracy
    const baseXp = totalSessions * 100;
    const accuracyBonus = avgAccuracy * 5;
    const totalXp = baseXp + accuracyBonus;

    const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
    const nextLevelXp = Math.pow(level, 2) * 100;
    const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;

    // Progress to next level (0-100%)
    const progress = Math.min(100, Math.max(0, ((totalXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100));

    return {
        level,
        progress: progress.toFixed(1),
        rank: getRank(level)
    };
};

const getRank = (level: number) => {
    if (level < 5) return 'Novice Calculator';
    if (level < 10) return 'Apprentice Number Crusher';
    if (level < 20) return 'Adept Arithmetician';
    if (level < 30) return 'Expert Evaluator';
    return 'Grandmaster of Sums';
};
