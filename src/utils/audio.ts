// Web Audio API sintetizado para feedback tátil suave sem necessidade de arquivos externos

class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Som suave de "conquista / check"
  playCheck() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Harmônico duplo suave (523Hz C5 -> 659Hz E5)
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  // Som sutil de desmarcar
  playUncheck() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  // Som suave de início de foco (Pomodoro)
  playPomodoroStart() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25]; // A4 -> C#5 -> E5 arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.25);
    });
  }

  // Chime Zen calmo e relaxante para o fim do Pomodoro (harmônicos de sino tibetano)
  playPomodoroChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Frequências harmônicas que ressoam juntas como um sino suave (528Hz amor/cura + harmônicos)
    const freqs = [528, 792, 1056, 1320];
    const baseTime = ctx.currentTime;

    freqs.forEach((f, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, baseTime);

      const amp = 0.09 / (index + 1);
      gain.gain.setValueAtTime(amp, baseTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + 2.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(baseTime);
      osc.stop(baseTime + 2.8);
    });
  }

  // Clique de botão / haptic tátil
  playTick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  // Notificação suave de lembrete de atividade (dois tons harmônicos)
  playNotificationChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const baseTime = ctx.currentTime;
    const tone1 = 587.33; // D5
    const tone2 = 880.00; // A5

    // Primeiro tom
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(tone1, baseTime);
    gain1.gain.setValueAtTime(0.08, baseTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, baseTime + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(baseTime);
    osc1.stop(baseTime + 0.5);

    // Segundo tom suave após 100ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(tone2, baseTime + 0.12);
    gain2.gain.setValueAtTime(0.09, baseTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, baseTime + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(baseTime + 0.12);
    osc2.stop(baseTime + 0.75);
  }
}

export const sounds = new SoundManager();
