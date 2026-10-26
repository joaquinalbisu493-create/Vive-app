jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { anotarLlegadaPorLink, llegoPorLink } from '@/lib/llegadaPorLink';

const DIA = 24 * 3_600_000;

describe('llegadaPorLink', () => {
  beforeEach(async () => { await AsyncStorage.clear(); jest.restoreAllMocks(); });

  it('recuerda al profesional cuyo link se abrió, y solo a ese', async () => {
    await anotarLlegadaPorLink('coach-a');
    expect(await llegoPorLink('coach-a')).toBe(true);
    expect(await llegoPorLink('coach-b')).toBe(false);
  });

  it('vence a los 30 días', async () => {
    const ahora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(ahora);
    await anotarLlegadaPorLink('coach-a');
    jest.spyOn(Date, 'now').mockReturnValue(ahora + 29 * DIA);
    expect(await llegoPorLink('coach-a')).toBe(true);
    jest.spyOn(Date, 'now').mockReturnValue(ahora + 31 * DIA);
    expect(await llegoPorLink('coach-a')).toBe(false);
  });

  it('un dato roto en el teléfono no rompe la reserva', async () => {
    await AsyncStorage.setItem('sere_llegada_por_link', '{no es json');
    expect(await llegoPorLink('coach-a')).toBe(false);
  });
});
