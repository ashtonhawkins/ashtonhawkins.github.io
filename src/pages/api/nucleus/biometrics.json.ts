import type { APIRoute } from 'astro';
import ouraCache from '@data/oura-cache.json';

export const GET: APIRoute = async () => {
  try {
    if (!ouraCache || !ouraCache.lastFetched) {
      return new Response(JSON.stringify(null), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const ln = ouraCache.lastNight;
    const wk = ouraCache.weeklyTrend;
    const hours = Math.floor(ln.totalSleepMinutes / 60);
    const minutes = ln.totalSleepMinutes % 60;

    const data = {
      label: 'BIOMETRICS',
      detail: `Readiness: ${ln.readinessScore} · HRV: ${ln.hrv}ms · Sleep: ${hours}h ${minutes}m`,
      link: '#biometrics',
      updatedAt: ouraCache.lastFetched,
      renderData: {
        sleepScore: ln.sleepScore,
        readinessScore: ln.readinessScore,
        totalSleepMinutes: ln.totalSleepMinutes,
        restingHeartRate: ln.restingHeartRate,
        hrv: ln.hrv,
        spo2: ln.spo2,
        respiratoryRate: ln.respiratoryRate,
        bodyTempDeviation: ln.bodyTempDeviation,
        stressLevel: ln.stressLevel,
        sleepStages: ouraCache.sleepStages,
        lastNightDate: (ouraCache as any).lastNightDate ?? null,
        trend: {
          sleepScores: wk.sleepScores,
          readinessScores: wk.readinessScores,
          hrvValues: wk.hrvValues,
          restingHR: wk.restingHR,
          bodyTemp: wk.bodyTemp,
          spo2Values: (wk as any).spo2Values ?? [],
        },
      }
    };

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    console.error('[Nucleus] Biometrics route failed.', error);
    return new Response(JSON.stringify(null), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
