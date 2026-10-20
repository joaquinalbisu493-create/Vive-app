import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// El único sonido de interfaz de Sere: la reserva confirmada (decidido el
// 20/10/2026). Es el momento en que alguien se compromete a encontrarse con
// otra persona; al ser el único, se vuelve el sonido de Sere. Las prácticas
// terminan solo con vibración, a propósito: ahí vale más el silencio.
//
// Es una kalimba sintetizada para Sere (tres notas abiertas que suben), no
// sacada de un banco de sonidos.

const RESERVA = require('../assets/sounds/reserva-confirmada.m4a');

/** Suena una vez. Respeta el modo silencio del iPhone y no corta la música
 *  que la persona tenga puesta. Nunca falla hacia afuera. */
export async function sonarReservaConfirmada() {
  try {
    // Ruido blanco y los audios de recursos dejan la sesión de audio en
    // "suena aunque esté en silencio"; un sonido de interfaz no tiene que
    // saltarse el silencio, así que se fija acá cada vez.
    await setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
    const player = createAudioPlayer(RESERVA);
    player.volume = 0.7;
    player.play();
    // El sonido dura ~2s; se libera después para no dejar el reproductor vivo.
    setTimeout(() => { try { player.release(); } catch {} }, 3000);
  } catch {}
}
